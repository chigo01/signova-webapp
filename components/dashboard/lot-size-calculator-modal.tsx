"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ChevronDown, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Signal } from "@/types/signal";
import {
  CALCULATOR_INSTRUMENTS,
  calculateLotSize,
  resolveInstrument,
} from "@/lib/lot-size";
import { fetchUsdPerUnit } from "@/lib/quote-rate";
import {
  readLotSizeSettings,
  writeLotSizeSettings,
} from "@/lib/lot-size-settings";

const RISK_PRESETS = [0.5, 1, 2];

function formatUsd(value: number): string {
  const formatted = Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${value < 0 ? "-" : ""}$${formatted}`;
}

function formatUnits(value: number): string {
  return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function priceToInput(value: number | undefined): string {
  return value === undefined || !Number.isFinite(value) ? "" : String(value);
}

function ResultRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-[11px] text-zinc-500">{label}</span>
      <span className="font-mono text-xs tabular-nums text-white">{value}</span>
    </div>
  );
}

function NumberField({
  id,
  label,
  value,
  onChange,
  suffix,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  suffix?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-[11px] font-medium text-zinc-400">
        {label}
      </Label>
      <div className="relative">
        <Input
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          inputMode="decimal"
          autoComplete="off"
          placeholder={placeholder}
          className={cn("h-9 font-mono text-sm tabular-nums", suffix && "pr-9")}
        />
        {suffix && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

export interface LotSizeCalculatorModalProps {
  onClose: () => void;
  signal: Signal;
}

/**
 * Position sizing for a single signal. Entry, stop loss and targets are
 * prefilled from the signal (and stay editable); balance and risk % persist
 * across cards so they're only typed once. See lib/lot-size.ts for the math.
 *
 * Mounted only while open, so every field seeds itself once at mount — that
 * also means balance/risk pick up edits made from another card's calculator.
 */
export function LotSizeCalculatorModal({
  onClose,
  signal,
}: LotSizeCalculatorModalProps) {
  const [symbol, setSymbol] = useState(
    () =>
      resolveInstrument(signal.pair)?.symbol ?? CALCULATOR_INSTRUMENTS[0].symbol,
  );
  const [balance, setBalance] = useState(() =>
    String(readLotSizeSettings().accountBalance),
  );
  const [risk, setRisk] = useState(() => String(readLotSizeSettings().riskPercent));
  const [entry, setEntry] = useState(() => priceToInput(signal.entryPrice));
  const [stopLoss, setStopLoss] = useState(() =>
    priceToInput(signal.exitTargets?.stopLoss),
  );
  // Both rate slots carry the currency they belong to, so a result that arrives
  // after the instrument changed — or an override typed against the old pair —
  // is ignored rather than silently applied to the wrong currency.
  const [fetchedRate, setFetchedRate] = useState<{
    currency: string;
    rate: number | null;
  } | null>(null);
  const [manualRate, setManualRate] = useState<{
    currency: string;
    value: string;
  } | null>(null);

  const balanceValue = Number(balance);
  const riskValue = Number(risk);

  // Persist only plausible values, so mid-typing states ("", "1.") don't stick.
  useEffect(() => {
    if (!Number.isFinite(balanceValue) || balanceValue <= 0) return;
    if (!Number.isFinite(riskValue) || riskValue <= 0) return;
    writeLotSizeSettings({
      accountBalance: balanceValue,
      riskPercent: riskValue,
    });
  }, [balanceValue, riskValue]);

  // Lock body scroll while the modal is open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Close on Escape.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const instrument =
    CALCULATOR_INSTRUMENTS.find((item) => item.symbol === symbol) ??
    CALCULATOR_INSTRUMENTS[0];
  // A cross has USD on neither leg, so nothing on the signal converts its risk.
  const isCross = instrument.base !== "USD" && instrument.quote !== "USD";
  // Pull the quote currency's USD rate whenever the instrument changes, so
  // switching EUR/AUD -> GBP/JPY re-resolves the conversion instead of carrying
  // the previous currency's rate over. Non-crosses need no lookup at all.
  useEffect(() => {
    if (!isCross) return;

    let cancelled = false;
    fetchUsdPerUnit(instrument.quote).then((rate) => {
      if (!cancelled) setFetchedRate({ currency: instrument.quote, rate });
    });

    return () => {
      cancelled = true;
    };
  }, [isCross, instrument.quote]);

  // Anything belonging to another currency reads as absent, which is what makes
  // the switch to a new pair show "loading" rather than the old pair's number.
  const manualForQuote =
    manualRate?.currency === instrument.quote ? manualRate.value : null;
  const fetchedForQuote =
    fetchedRate?.currency === instrument.quote ? fetchedRate : null;

  const rateStatus: "idle" | "loading" | "live" | "error" | "manual" = !isCross
    ? "idle"
    : manualForQuote !== null
      ? "manual"
      : fetchedForQuote === null
        ? "loading"
        : fetchedForQuote.rate === null
          ? "error"
          : "live";

  const quoteRate =
    manualForQuote ??
    (fetchedForQuote?.rate != null
      ? // Six significant figures keeps JPY-sized rates (0.00636943) precise
        // without printing float noise on EUR-sized ones.
        String(Number(fetchedForQuote.rate.toPrecision(6)))
      : "");

  const result = useMemo(
    () =>
      calculateLotSize({
        instrument,
        accountBalance: balanceValue,
        riskPercent: riskValue,
        entryPrice: Number(entry),
        stopLoss: Number(stopLoss),
        direction: signal.direction,
        takeProfit1: signal.exitTargets?.takeProfit1,
        takeProfit2: signal.exitTargets?.takeProfit2,
        quoteRateOverride:
          isCross && quoteRate ? Number(quoteRate) : undefined,
        quoteRateOrigin: rateStatus === "manual" ? "manual" : "live",
      }),
    [
      instrument,
      balanceValue,
      riskValue,
      entry,
      stopLoss,
      signal.direction,
      signal.exitTargets?.takeProfit1,
      signal.exitTargets?.takeProfit2,
      isCross,
      quoteRate,
      rateStatus,
    ],
  );

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        // Click outside the panel closes the modal.
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="max-h-[90dvh] w-full max-w-sm overflow-y-auto rounded-2xl border border-[#1D1D1D] bg-[#121212] p-5 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lot-size-calculator-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2
              id="lot-size-calculator-title"
              className="text-base font-semibold text-white"
            >
              Lot size calculator
            </h2>
            <p className="mt-0.5 text-[11px] text-zinc-500">
              {signal.pair} · {signal.direction}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label
              htmlFor="lot-size-instrument"
              className="text-[11px] font-medium text-zinc-400"
            >
              Instrument
            </Label>
            <div className="relative">
              <select
                id="lot-size-instrument"
                value={instrument.symbol}
                onChange={(event) => setSymbol(event.target.value)}
                className="flex h-9 w-full appearance-none rounded-md border border-zinc-800 bg-zinc-950 px-3 pr-9 text-sm text-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300"
              >
                {CALCULATOR_INSTRUMENTS.map((item) => (
                  <option key={item.symbol} value={item.symbol}>
                    {item.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <NumberField
              id="lot-size-balance"
              label="Account balance"
              value={balance}
              onChange={setBalance}
              suffix="$"
            />
            <NumberField
              id="lot-size-risk"
              label="Risk"
              value={risk}
              onChange={setRisk}
              suffix="%"
            />
          </div>

          <div className="flex gap-1.5">
            {RISK_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setRisk(String(preset))}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                  riskValue === preset
                    ? "border-[#10C29C]/40 bg-[#10C29C]/15 text-emerald-300"
                    : "border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200",
                )}
              >
                {preset}%
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <NumberField
              id="lot-size-entry"
              label="Entry price"
              value={entry}
              onChange={setEntry}
              placeholder="0.00"
            />
            <NumberField
              id="lot-size-stop"
              label="Stop loss"
              value={stopLoss}
              onChange={setStopLoss}
              placeholder="0.00"
            />
          </div>

          {isCross && (
            <div className="space-y-1">
              <NumberField
                id="lot-size-quote-rate"
                label={`USD per 1 ${instrument.quote}`}
                value={quoteRate}
                onChange={(value) =>
                  setManualRate({ currency: instrument.quote, value })
                }
                placeholder={
                  rateStatus === "loading" ? "Loading rate…" : undefined
                }
              />
              <p
                className={cn(
                  "text-[10px]",
                  rateStatus === "error" ? "text-amber-400/90" : "text-zinc-500",
                )}
              >
                {rateStatus === "manual" ? (
                  <>
                    Using your rate.{" "}
                    <button
                      type="button"
                      onClick={() => setManualRate(null)}
                      className="underline underline-offset-2 transition-colors hover:text-zinc-300"
                    >
                      Use live rate
                    </button>
                  </>
                ) : rateStatus === "loading" ? (
                  `Fetching the live ${instrument.quote} rate…`
                ) : rateStatus === "live" ? (
                  "Live rate — edit to override."
                ) : (
                  `Couldn't load the ${instrument.quote} rate. Enter it manually.`
                )}
              </p>
            </div>
          )}
        </div>

        {result.error ? (
          <p className="mt-4 rounded-lg border border-[#F63B6B]/30 bg-[#F63B6B]/10 px-3 py-2.5 text-xs text-red-300">
            {result.error}
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            <div className="rounded-lg border border-[#10C29C]/30 bg-[#10C29C]/10 px-3 py-3 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-400/80">
                Lot size
              </p>
              <p className="font-mono text-3xl font-bold tabular-nums text-white">
                {result.roundedLots.toFixed(2)}
              </p>
              <p className="mt-0.5 text-[11px] text-zinc-400">
                {formatUnits(result.units)} units · {result.lots.toFixed(4)}{" "}
                unrounded
              </p>
            </div>

            <div className="space-y-2 rounded-lg border border-zinc-800/80 bg-zinc-900/50 px-3 py-2.5">
              <ResultRow
                label="Risk at this size"
                value={`${formatUsd(result.actualRisk)} of ${formatUsd(result.riskAmount)}`}
              />
              <ResultRow
                label="Stop distance"
                value={`${result.stopPips.toFixed(1)} pips`}
              />
              <ResultRow
                label="Value per pip"
                value={formatUsd(result.valuePerPip)}
              />
              {result.targets.map((target) => (
                <ResultRow
                  key={target.label}
                  label={`${target.label} at ${target.price}`}
                  value={`${formatUsd(target.profit)} · ${target.rMultiple.toFixed(2)}R`}
                />
              ))}
            </div>
          </div>
        )}

        {result.warnings.length > 0 && (
          <ul className="mt-3 space-y-1.5">
            {result.warnings.map((warning) => (
              <li
                key={warning}
                className="flex gap-2 text-[11px] leading-relaxed text-amber-400"
              >
                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                <span>{warning}</span>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-4 border-t border-zinc-800/80 pt-3 text-[10px] leading-relaxed text-zinc-600">
          Assumes a USD account and standard contract sizes (
          {formatUnits(instrument.contractSize)} {instrument.base} per lot).
          Contract specs and minimum lot steps vary by broker — verify before
          trading.
        </p>
      </div>
    </div>
  );
}
