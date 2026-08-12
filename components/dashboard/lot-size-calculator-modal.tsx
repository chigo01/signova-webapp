"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import {
  fetchAccountPerQuoteUnit,
  fetchUsdPerUnit,
  peekUsdPerUnit,
  type MissingRateLeg,
} from "@/lib/quote-rate";
import {
  ACCOUNT_CURRENCIES,
  balanceDecimals,
  currencySymbol,
  formatMoney,
} from "@/lib/account-currency";
import {
  readLotSizeSettings,
  writeLotSizeSettings,
} from "@/lib/lot-size-settings";

const RISK_PRESETS = [0.5, 1, 2];

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
          className={cn(
            "h-9 font-mono text-sm tabular-nums",
            // Code-style symbols ("AED", "CA$") need more room than a glyph.
            suffix && (suffix.length > 1 ? "pr-12" : "pr-9"),
          )}
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

/** Native select so the value stays keyboard- and test-addressable by label. */
function SelectField({
  id,
  label,
  value,
  onChange,
  children,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-[11px] font-medium text-zinc-400">
        {label}
      </Label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="flex h-9 w-full appearance-none rounded-md border border-zinc-800 bg-zinc-950 px-3 pr-9 text-sm text-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300"
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
      </div>
    </div>
  );
}

/** A number the user has finished typing. "1." and "" are mid-edit, not values. */
const SETTLED_NUMBER = /^\d+(\.\d+)?$/;

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
  // One parse at mount, shared by every seeded field.
  const [seed] = useState(readLotSizeSettings);
  const [symbol, setSymbol] = useState(
    () =>
      resolveInstrument(signal.pair)?.symbol ?? CALCULATOR_INSTRUMENTS[0].symbol,
  );
  const [balance, setBalance] = useState(() => String(seed.accountBalance));
  const [risk, setRisk] = useState(() => String(seed.riskPercent));
  const [accountCurrency, setAccountCurrency] = useState(seed.accountCurrency);
  const [entry, setEntry] = useState(() => priceToInput(signal.entryPrice));
  const [stopLoss, setStopLoss] = useState(() =>
    priceToInput(signal.exitTargets?.stopLoss),
  );
  const initialInstrument =
    resolveInstrument(signal.pair) ?? CALCULATOR_INSTRUMENTS[0];
  const [contractSize, setContractSize] = useState(() =>
    String(initialInstrument.contractSize),
  );
  const [pipSize, setPipSize] = useState(() =>
    String(initialInstrument.pipSize),
  );
  const [lotStep, setLotStep] = useState(() => String(seed.lotStep));
  const [costBuffer, setCostBuffer] = useState(() =>
    String(seed.costBufferPercent),
  );
  // Both rate slots carry the conversion they belong to, so a result that
  // arrives after the instrument or account currency changed is ignored rather
  // than silently applied to the wrong pair of currencies.
  const [fetchedRate, setFetchedRate] = useState<{
    key: string;
    rate: number | null;
    missing: MissingRateLeg;
  } | null>(null);
  const [manualRate, setManualRate] = useState<{
    key: string;
    value: string;
  } | null>(null);

  // The currency the number in the balance box is actually denominated in. It
  // diverges from accountCurrency only while a conversion is in flight, and
  // that gap is what makes rapid currency switching compose correctly.
  const balanceCurrencyRef = useRef(seed.accountCurrency);
  // Bumped by every switch and every manual balance edit; a conversion that no
  // longer owns this token drops its result.
  const switchSeqRef = useRef(0);
  const [isConverting, setIsConverting] = useState(false);
  const [conversionFailedFor, setConversionFailedFor] = useState<string | null>(
    null,
  );

  const balanceValue = Number(balance);
  const riskValue = Number(risk);
  const lotStepValue = Number(lotStep);
  const costBufferValue = Number(costBuffer);

  // Persist each field independently: a mid-typed balance ("", "1.") must not
  // block a currency change from sticking, nor clobber the stored balance.
  // Skipped mid-conversion so a half-converted pair — new currency, old amount —
  // is never what a reopened calculator reads back.
  useEffect(() => {
    if (isConverting) return;
    const stored = readLotSizeSettings();
    writeLotSizeSettings({
      accountBalance:
        Number.isFinite(balanceValue) && balanceValue > 0
          ? balanceValue
          : stored.accountBalance,
      riskPercent:
        Number.isFinite(riskValue) && riskValue > 0
          ? riskValue
          : stored.riskPercent,
      accountCurrency,
      costBufferPercent:
        Number.isFinite(costBufferValue) && costBufferValue >= 0
          ? costBufferValue
          : stored.costBufferPercent,
      lotStep:
        Number.isFinite(lotStepValue) && lotStepValue > 0
          ? lotStepValue
          : stored.lotStep,
    });
  }, [
    balanceValue,
    riskValue,
    accountCurrency,
    costBufferValue,
    lotStepValue,
    isConverting,
  ]);

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
  // A rate is only needed when neither leg of the pair is the account currency;
  // otherwise lib/lot-size.ts derives it from the entry price for free.
  const needsRate =
    instrument.quote !== accountCurrency && instrument.base !== accountCurrency;
  const rateKey = `${instrument.quote}->${accountCurrency}`;

  const switchInstrument = useCallback((nextSymbol: string) => {
    const next = CALCULATOR_INSTRUMENTS.find(
      (item) => item.symbol === nextSymbol,
    );
    if (!next) return;
    setSymbol(nextSymbol);
    // Broker overrides belong to one instrument; never carry a gold contract
    // size into a forex calculation when the dropdown changes.
    setContractSize(String(next.contractSize));
    setPipSize(String(next.pipSize));
  }, []);

  // Re-resolve whenever either side of the conversion changes, so switching
  // EUR/AUD -> GBP/JPY or USD -> JPY never carries the old rate over.
  useEffect(() => {
    if (!needsRate) return;

    let cancelled = false;
    fetchAccountPerQuoteUnit(instrument.quote, accountCurrency).then(
      ({ rate, missing }) => {
        if (!cancelled) setFetchedRate({ key: rateKey, rate, missing });
      },
    );

    return () => {
      cancelled = true;
    };
  }, [needsRate, instrument.quote, accountCurrency, rateKey]);

  // Anything belonging to another conversion reads as absent, which is what
  // makes a switch show "loading" rather than the previous pair's number.
  const manualForKey = manualRate?.key === rateKey ? manualRate.value : null;
  const fetchedForKey = fetchedRate?.key === rateKey ? fetchedRate : null;

  const rateStatus: "idle" | "loading" | "live" | "error" | "manual" = !needsRate
    ? "idle"
    : manualForKey !== null
      ? "manual"
      : fetchedForKey === null
        ? "loading"
        : fetchedForKey.rate === null
          ? "error"
          : "live";

  const quoteRate =
    manualForKey ??
    (fetchedForKey?.rate != null
      ? // Six significant figures keeps JPY-sized rates (0.00636943) precise
        // without printing float noise on EUR-sized ones.
        String(Number(fetchedForKey.rate.toPrecision(6)))
      : "");

  /** Rewrite the balance into `next`, leaving mid-edit text alone. */
  const applyConversion = useCallback((factor: number, next: string) => {
    setBalance((current) => {
      const trimmed = current.trim();
      if (!SETTLED_NUMBER.test(trimmed)) return current;
      const amount = Number(trimmed);
      if (!Number.isFinite(amount) || amount <= 0) return current;
      // String(Number(...)) drops trailing zeros, so 10000 stays "10000" and a
      // round trip through another currency comes back textually identical.
      return String(Number((amount * factor).toFixed(balanceDecimals(next))));
    });
    balanceCurrencyRef.current = next;
  }, []);

  const switchCurrency = useCallback(
    async (next: string) => {
      // What the box HOLDS, which is not always what the select shows.
      const from = balanceCurrencyRef.current;
      setAccountCurrency(next);
      setConversionFailedFor(null);
      const seq = (switchSeqRef.current += 1);
      // This switch supersedes any in flight, so clear the flag here rather
      // than in each early return. A superseded handler bails out without
      // touching it, which would otherwise strand it on forever whenever the
      // superseding switch resolved synchronously off warm rates.
      setIsConverting(false);

      // Switched back to whatever the box already holds — nothing to convert,
      // and notably no rounding, so A -> B -> A is exactly lossless.
      if (from === next) return;

      // Warm rates convert synchronously, which leaves no window for a race.
      const warmFrom = peekUsdPerUnit(from);
      const warmNext = peekUsdPerUnit(next);
      if (warmFrom !== null && warmNext !== null) {
        applyConversion(warmFrom / warmNext, next);
        return;
      }

      setIsConverting(true);
      const [usdPerFrom, usdPerNext] = await Promise.all([
        fetchUsdPerUnit(from),
        fetchUsdPerUnit(next),
      ]);
      // A newer switch or a manual edit owns the box now; drop this result.
      if (switchSeqRef.current !== seq) return;
      setIsConverting(false);

      if (usdPerFrom === null || usdPerNext === null) {
        // Keep the number and keep the new currency — reverting the select
        // would fight the user, and converting at a guess would be worse. The
        // notice below the field is what stops it being a silent relabel.
        setConversionFailedFor(next);
        balanceCurrencyRef.current = next;
        return;
      }
      applyConversion(usdPerFrom / usdPerNext, next);
    },
    [applyConversion],
  );

  /** A number the user types is denominated in whatever the select shows. */
  const handleBalanceChange = useCallback(
    (value: string) => {
      switchSeqRef.current += 1;
      balanceCurrencyRef.current = accountCurrency;
      setIsConverting(false);
      setConversionFailedFor(null);
      setBalance(value);
    },
    [accountCurrency],
  );

  const result = useMemo(
    () =>
      calculateLotSize({
        instrument,
        accountCurrency,
        accountBalance: balanceValue,
        riskPercent: riskValue,
        entryPrice: Number(entry),
        stopLoss: Number(stopLoss),
        direction: signal.direction,
        takeProfit1: signal.exitTargets?.takeProfit1,
        takeProfit2: signal.exitTargets?.takeProfit2,
        quoteRateOverride:
          needsRate && quoteRate ? Number(quoteRate) : undefined,
        quoteRateOrigin: rateStatus === "manual" ? "manual" : "live",
        contractSizeOverride: Number(contractSize),
        pipSizeOverride: Number(pipSize),
        lotStep: lotStepValue,
        costBufferPercent: costBufferValue,
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
      accountCurrency,
      needsRate,
      quoteRate,
      rateStatus,
      contractSize,
      pipSize,
      lotStepValue,
      costBufferValue,
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
          <div className="grid grid-cols-2 gap-3">
            <SelectField
              id="lot-size-instrument"
              label="Instrument"
              value={instrument.symbol}
              onChange={switchInstrument}
            >
              {CALCULATOR_INSTRUMENTS.map((item) => (
                <option key={item.symbol} value={item.symbol}>
                  {item.label}
                </option>
              ))}
            </SelectField>
            <SelectField
              id="lot-size-account-currency"
              label="Account currency"
              value={accountCurrency}
              onChange={switchCurrency}
            >
              {ACCOUNT_CURRENCIES.map((item) => (
                <option key={item.code} value={item.code} title={item.name}>
                  {item.code}
                </option>
              ))}
            </SelectField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <NumberField
              id="lot-size-balance"
              label="Account balance"
              value={balance}
              onChange={handleBalanceChange}
              suffix={currencySymbol(accountCurrency)}
            />
            <NumberField
              id="lot-size-risk"
              label="Risk"
              value={risk}
              onChange={setRisk}
              suffix="%"
            />
          </div>

          {conversionFailedFor && (
            <p className="text-[10px] leading-relaxed text-amber-400/90">
              Couldn&apos;t convert your balance to {conversionFailedFor} — the
              rate wasn&apos;t available. Check the amount.
            </p>
          )}

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

          {needsRate && (
            <div className="space-y-1">
              <NumberField
                id="lot-size-quote-rate"
                label={`${accountCurrency} per 1 ${instrument.quote}`}
                value={quoteRate}
                onChange={(value) => setManualRate({ key: rateKey, value })}
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
                  `Fetching the live ${instrument.quote}/${accountCurrency} rate…`
                ) : rateStatus === "live" ? (
                  "Live rate — edit to override."
                ) : // Name the leg that failed: for a crypto or exotic account
                // it's the account currency, not the pair, that can't be priced.
                fetchedForKey?.missing === "account" ? (
                  `Couldn't price ${accountCurrency}. Enter how much ${accountCurrency} 1 ${instrument.quote} is worth.`
                ) : (
                  `Couldn't load the ${instrument.quote} rate. Enter it manually.`
                )}
              </p>
            </div>
          )}

          <details className="rounded-lg border border-zinc-800/80 bg-zinc-900/30 px-3 py-2">
            <summary className="cursor-pointer text-[11px] font-medium text-zinc-300">
              Broker settings &amp; trading costs
            </summary>
            <p className="mt-1 text-[10px] text-zinc-500">
              Match your broker contract and reserve part of the risk budget for costs.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <NumberField
                id="lot-size-contract-size"
                label="Contract size"
                value={contractSize}
                onChange={setContractSize}
              />
              <NumberField
                id="lot-size-pip-size"
                label="Pip size"
                value={pipSize}
                onChange={setPipSize}
              />
              <NumberField
                id="lot-size-lot-step"
                label="Minimum lot step"
                value={lotStep}
                onChange={setLotStep}
              />
              <NumberField
                id="lot-size-cost-buffer"
                label="Cost buffer"
                value={costBuffer}
                onChange={setCostBuffer}
                suffix="%"
              />
            </div>
          </details>
        </div>

        {/* A rate still in flight is not a failure. Without this the panel would
            flash a full error on every open for any pair needing a lookup. */}
        {isConverting || (needsRate && rateStatus === "loading") ? (
          <p className="mt-4 rounded-lg border border-zinc-800/80 bg-zinc-900/50 px-3 py-3 text-center text-xs text-zinc-500">
            {isConverting
              ? `Converting your balance to ${accountCurrency}…`
              : `Loading the ${instrument.quote}/${accountCurrency} rate…`}
          </p>
        ) : result.error ? (
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
                value={`${formatMoney(result.actualRisk, accountCurrency)} of ${formatMoney(result.riskAmount, accountCurrency)}`}
              />
              {result.costAllowance > 0 && (
                <ResultRow
                  label="Reserved for costs"
                  value={formatMoney(result.costAllowance, accountCurrency)}
                />
              )}
              <ResultRow
                label="Stop distance"
                value={`${result.stopPips.toFixed(1)} pips`}
              />
              <ResultRow
                label="Value per pip"
                value={formatMoney(result.valuePerPip, accountCurrency)}
              />
              {result.targets.map((target) => (
                <ResultRow
                  key={target.label}
                  label={`${target.label} at ${target.price}`}
                  value={`${formatMoney(target.profit, accountCurrency)} · ${target.rMultiple.toFixed(2)}R`}
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
          Uses {formatUnits(result.contractSize)} {instrument.base} per lot, pip
          size {result.pipSize}, and lot step {result.lotStep}. The buffer
          reserves risk capacity; it does not estimate actual spread,
          commission, slippage, or gaps.
        </p>
      </div>
    </div>
  );
}
