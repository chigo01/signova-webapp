"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  chainLabel,
  createCryptoDeposit,
  getCryptoDeposit,
  getDepositSources,
  previewCryptoDeposit,
  submitCryptoDepositHash,
  validateDepositRefundAddress,
  type CryptoDeposit,
  type DepositPreviewResponse,
  type DepositSource,
  type DepositSourceChain,
  PRO_PLAN_PRICE_LABEL,
  type PlanBalanceResponse,
} from "@/lib/payments";

const POLL_INTERVAL_MS = 4_000;

const POPULAR: Array<{
  symbol: string;
  chainId?: number;
  chainNames?: string[];
}> = [
  { symbol: "USDT", chainId: 728126428, chainNames: ["tron"] },
  { symbol: "USDC", chainId: 8453, chainNames: ["base"] },
  { symbol: "USDT", chainId: 1, chainNames: ["ethereum", "eth"] },
  { symbol: "USDC", chainId: 792703809, chainNames: ["solana"] },
  { symbol: "BTC", chainNames: ["bitcoin", "btc"] },
  { symbol: "ETH", chainId: 1, chainNames: ["ethereum", "eth"] },
];

type Step = "asset" | "quote" | "refund" | "pay";
type PayStatus = "waiting" | "confirming" | "success" | "failed" | "expired";

export interface CryptoPaymentModalProps {
  onClose: () => void;
  onSuccess: (balance: PlanBalanceResponse) => void;
}

function formatCountdown(remainingMs: number): string {
  if (remainingMs <= 0) return "00:00";
  const totalSeconds = Math.floor(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatExpiryDate(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function matchesPopular(
  source: DepositSource,
  preset: (typeof POPULAR)[number],
): boolean {
  if (source.symbol.toUpperCase() !== preset.symbol) return false;
  if (preset.chainId !== undefined && source.chainId === preset.chainId) {
    return true;
  }
  const name = source.blockchain.toLowerCase();
  return (preset.chainNames || []).some(
    (hint) => name === hint || name.includes(hint),
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
        opacity="0.2"
      />
      <path
        d="M22 12a10 10 0 0 1-10 10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md p-1 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
      aria-label="Close"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <line x1="18" x2="6" y1="6" y2="18" />
        <line x1="6" x2="18" y1="6" y2="18" />
      </svg>
    </button>
  );
}

function DepositQr({ value }: { value: string }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void import("qrcode").then((QR) =>
      QR.toDataURL(value, {
        width: 200,
        margin: 1,
        color: { dark: "#09090b", light: "#ffffff" },
      }).then((url) => {
        if (!cancelled) setSrc(url);
      }),
    );
    return () => {
      cancelled = true;
    };
  }, [value]);

  if (!src) {
    return (
      <div className="h-[200px] w-[200px] animate-pulse rounded-md bg-zinc-900" />
    );
  }

  return (
    // Data-URL QR from `qrcode`; next/image does not help here.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt="Deposit address QR code"
      className="h-[200px] w-[200px] rounded-md bg-white p-1"
    />
  );
}

export function CryptoPaymentModal({
  onClose,
  onSuccess,
}: CryptoPaymentModalProps) {
  const [step, setStep] = useState<Step>("asset");
  const [sources, setSources] = useState<DepositSource[]>([]);
  const [chains, setChains] = useState<DepositSourceChain[]>([]);
  const [loadingSources, setLoadingSources] = useState(true);
  const [sourcesError, setSourcesError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selectedChainId, setSelectedChainId] = useState<number | "all">("all");
  const [selected, setSelected] = useState<DepositSource | null>(null);

  const [preview, setPreview] = useState<DepositPreviewResponse | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const [refundTo, setRefundTo] = useState("");
  const [refundError, setRefundError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [deposit, setDeposit] = useState<CryptoDeposit | null>(null);
  const [payStatus, setPayStatus] = useState<PayStatus>("waiting");
  const [remainingMs, setRemainingMs] = useState(0);
  const [pollError, setPollError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState("");
  const [submittingHash, setSubmittingHash] = useState(false);
  const [copied, setCopied] = useState<"address" | "amount" | null>(null);
  const [latestBalance, setLatestBalance] = useState<PlanBalanceResponse | null>(
    null,
  );

  const successCallbackRef = useRef(onSuccess);
  useEffect(() => {
    successCallbackRef.current = onSuccess;
  }, [onSuccess]);

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const catalog = await getDepositSources({ signal: controller.signal });
        setSources(catalog.sources);
        setChains(catalog.sourceChains);
        setSourcesError(null);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setSourcesError(
          (err as Error).message || "Could not load supported tokens",
        );
      } finally {
        setLoadingSources(false);
      }
    })();
    return () => controller.abort();
  }, []);

  const popularSources = useMemo(() => {
    const picks: DepositSource[] = [];
    for (const preset of POPULAR) {
      const match = sources.find((source) => matchesPopular(source, preset));
      if (match) picks.push(match);
    }
    return picks;
  }, [sources]);

  const filteredSources = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return sources.filter((source) => {
      if (selectedChainId !== "all" && source.chainId !== selectedChainId) {
        return false;
      }
      if (!needle) return true;
      return (
        source.symbol.toLowerCase().includes(needle) ||
        source.blockchain.toLowerCase().includes(needle) ||
        source.originAsset.toLowerCase().includes(needle)
      );
    });
  }, [query, selectedChainId, sources]);

  const loadPreview = useCallback(async (source: DepositSource) => {
    setLoadingPreview(true);
    setPreviewError(null);
    try {
      const next = await previewCryptoDeposit({
        originChainId: source.chainId,
        originAsset: source.originAsset,
      });
      setPreview(next);
    } catch (err) {
      setPreview(null);
      setPreviewError((err as Error).message || "Could not quote this token");
    } finally {
      setLoadingPreview(false);
    }
  }, []);

  const handleSelectSource = useCallback(
    (source: DepositSource) => {
      setSelected(source);
      setPreview(null);
      setStep("quote");
      void loadPreview(source);
    },
    [loadPreview],
  );

  const handleCreate = useCallback(async () => {
    if (!selected || !preview) return;
    setCreating(true);
    setRefundError(null);
    try {
      await validateDepositRefundAddress({
        originChainId: selected.chainId,
        originAsset: selected.originAsset,
        refundTo,
      });
      const created = await createCryptoDeposit({
        originChainId: selected.chainId,
        originAsset: selected.originAsset,
        refundTo,
        amount: preview.amountIn,
      });
      setDeposit(created.deposit);
      setPayStatus("waiting");
      if (created.deposit.expiresAt) {
        setRemainingMs(
          Math.max(0, new Date(created.deposit.expiresAt).getTime() - Date.now()),
        );
      }
      setStep("pay");
    } catch (err) {
      setRefundError((err as Error).message || "Could not create deposit");
    } finally {
      setCreating(false);
    }
  }, [preview, refundTo, selected]);

  useEffect(() => {
    if (step !== "pay" || !deposit?.expiresAt) return;
    if (payStatus !== "waiting" && payStatus !== "confirming") return;
    const expiry = new Date(deposit.expiresAt).getTime();
    const intervalId = window.setInterval(() => {
      const ms = Math.max(0, expiry - Date.now());
      setRemainingMs(ms);
      if (ms === 0) {
        setPayStatus((current) =>
          current === "waiting" || current === "confirming"
            ? "expired"
            : current,
        );
      }
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, [deposit?.expiresAt, payStatus, step]);

  useEffect(() => {
    if (step !== "pay" || !deposit?.id) return;
    if (
      payStatus === "success" ||
      payStatus === "failed" ||
      payStatus === "expired"
    ) {
      return;
    }

    const controller = new AbortController();
    let cancelled = false;

    const poll = async () => {
      try {
        const result = await getCryptoDeposit(deposit.id, {
          signal: controller.signal,
        });
        if (cancelled) return;
        setDeposit(result.deposit);
        setLatestBalance(result.balance);
        setPollError(null);
        if (result.deposit.status === "success") {
          setPayStatus("success");
          successCallbackRef.current(result.balance);
        } else if (result.deposit.status === "failed") {
          setPayStatus("failed");
        } else if (result.deposit.status === "expired") {
          setPayStatus("expired");
        } else if (result.deposit.status === "processing") {
          setPayStatus("confirming");
        }
      } catch (err) {
        if (cancelled) return;
        if ((err as Error).name === "AbortError") return;
        setPollError((err as Error).message || "Unable to check status");
      }
    };

    void poll();
    const intervalId = window.setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      controller.abort();
      window.clearInterval(intervalId);
    };
  }, [deposit?.id, payStatus, step]);

  const handleCopy = useCallback(async (value: string, kind: "address" | "amount") => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 1500);
    } catch {
      setCopied(null);
    }
  }, []);

  const handleSubmitHash = useCallback(async () => {
    if (!deposit || !txHash.trim()) return;
    setSubmittingHash(true);
    setPollError(null);
    try {
      await submitCryptoDepositHash(deposit.id, txHash.trim());
      setPayStatus("confirming");
    } catch (err) {
      setPollError((err as Error).message || "Could not submit transaction hash");
    } finally {
      setSubmittingHash(false);
    }
  }, [deposit, txHash]);

  const title =
    payStatus === "success"
      ? "Welcome to Pro"
      : payStatus === "expired"
        ? "Payment session expired"
        : payStatus === "failed"
          ? "Payment failed"
          : step === "asset"
            ? "Pay with crypto"
            : step === "quote"
              ? "Confirm amount"
              : step === "refund"
                ? "Refund address"
                : "Send payment";

  const successExpiry = formatExpiryDate(latestBalance?.proPlanExpiry);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="crypto-payment-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
    >
      <div className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-xl border border-zinc-800 bg-[#0a0a0a] shadow-xl">
        <header className="flex items-start justify-between border-b border-zinc-800 px-5 py-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-zinc-500">
              Pro · {PRO_PLAN_PRICE_LABEL} / 1 month
            </p>
            <h2
              id="crypto-payment-title"
              className="mt-1 text-lg font-semibold text-white"
            >
              {title}
            </h2>
          </div>
          <CloseButton onClick={onClose} />
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          {payStatus === "success" ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
                <CheckIcon className="h-7 w-7" />
              </div>
              <p className="text-base text-white">
                You&apos;re upgraded to <span className="font-semibold">Pro</span>{" "}
                for 1 month.
              </p>
              {successExpiry ? (
                <p className="text-sm text-zinc-400">
                  Renews on{" "}
                  <span className="text-zinc-200">{successExpiry}</span>
                </p>
              ) : null}
              <button
                type="button"
                onClick={onClose}
                className="mt-3 w-full rounded-md bg-white px-4 py-2.5 text-sm font-medium text-black transition-colors hover:bg-zinc-200"
              >
                Done
              </button>
            </div>
          ) : payStatus === "expired" || payStatus === "failed" ? (
            <div className="flex flex-col items-center gap-3 py-3 text-center">
              <p className="text-sm text-zinc-400">
                {payStatus === "expired"
                  ? "This deposit address has expired. Start a new crypto payment to retry."
                  : "Your payment could not be confirmed. Please try again."}
              </p>
              <button
                type="button"
                onClick={() => {
                  setPayStatus("waiting");
                  setDeposit(null);
                  setStep("asset");
                }}
                className="w-full rounded-md bg-white px-4 py-2.5 text-sm font-medium text-black transition-colors hover:bg-zinc-200"
              >
                Try again
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-200 transition-colors hover:bg-zinc-800"
              >
                Close
              </button>
            </div>
          ) : step === "asset" ? (
            <div className="space-y-4">
              <p className="text-sm text-zinc-400">
                Pick the token you will send. We convert it and credit 1 month of
                Pro once {PRO_PLAN_PRICE_LABEL} arrives.
              </p>
              {loadingSources ? (
                <p className="text-sm text-zinc-500">Loading networks…</p>
              ) : sourcesError ? (
                <p className="text-sm text-red-400">{sourcesError}</p>
              ) : (
                <>
                  {popularSources.length > 0 && !query ? (
                    <div>
                      <p className="mb-2 text-xs uppercase tracking-wider text-zinc-500">
                        Popular
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {popularSources.map((source) => (
                          <button
                            key={`${source.chainId}-${source.originAsset}`}
                            type="button"
                            onClick={() => handleSelectSource(source)}
                            className="rounded-md border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-200 transition-colors hover:border-zinc-600 hover:bg-zinc-800"
                          >
                            {source.symbol} · {chainLabel(source.blockchain)}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <input
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search token or network"
                    className="w-full rounded-md border border-zinc-800 bg-black px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-zinc-600"
                  />

                  <select
                    value={selectedChainId === "all" ? "all" : String(selectedChainId)}
                    onChange={(event) =>
                      setSelectedChainId(
                        event.target.value === "all"
                          ? "all"
                          : Number(event.target.value),
                      )
                    }
                    className="w-full rounded-md border border-zinc-800 bg-black px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-600"
                  >
                    <option value="all">All networks</option>
                    {chains.map((chain) => (
                      <option key={chain.chainId} value={chain.chainId}>
                        {chainLabel(chain.blockchain)} ({chain.count})
                      </option>
                    ))}
                  </select>

                  <ul className="max-h-64 divide-y divide-zinc-900 overflow-y-auto rounded-lg border border-zinc-800">
                    {filteredSources.slice(0, 80).map((source) => (
                      <li key={`${source.chainId}-${source.originAsset}`}>
                        <button
                          type="button"
                          onClick={() => handleSelectSource(source)}
                          className="flex w-full items-center justify-between px-3 py-2.5 text-left hover:bg-zinc-900"
                        >
                          <span className="text-sm font-medium text-white">
                            {source.symbol}
                          </span>
                          <span className="text-xs text-zinc-500">
                            {chainLabel(source.blockchain)}
                          </span>
                        </button>
                      </li>
                    ))}
                    {filteredSources.length === 0 ? (
                      <li className="px-3 py-4 text-sm text-zinc-500">
                        No tokens match that search.
                      </li>
                    ) : null}
                  </ul>
                </>
              )}
            </div>
          ) : step === "quote" && selected ? (
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => setStep("asset")}
                className="text-xs text-zinc-500 hover:text-zinc-300"
              >
                ← Change token
              </button>
              <div className="rounded-lg border border-zinc-800 bg-black/40 p-4">
                <p className="text-xs uppercase tracking-wider text-zinc-500">
                  You send
                </p>
                <p className="mt-1 text-xl font-semibold text-white">
                  {loadingPreview
                    ? "Quoting…"
                    : preview
                      ? `${preview.amountInDisplay} ${selected.symbol}`
                      : "—"}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  on {chainLabel(selected.blockchain)}
                </p>
              </div>
              <div className="grid gap-2 rounded-lg border border-zinc-800 bg-black/40 p-4 text-sm">
                <div className="flex justify-between gap-3">
                  <span className="text-zinc-500">Pro plan</span>
                  <span className="text-zinc-100">
                    {PRO_PLAN_PRICE_LABEL} / 1 month
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-zinc-500">Expected arrival</span>
                  <span className="text-zinc-100">
                    {preview?.amountOutDisplay
                      ? `~$${preview.amountOutDisplay}`
                      : "—"}
                  </span>
                </div>
              </div>
              <p className="text-xs text-zinc-500">
                Includes routing and a 0.25% protocol fee so at least{" "}
                {PRO_PLAN_PRICE_LABEL} settles. Send the exact quoted amount from
                your own wallet.
              </p>
              {previewError ? (
                <p className="text-sm text-red-400">{previewError}</p>
              ) : null}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void loadPreview(selected)}
                  disabled={loadingPreview}
                  className="flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-200 hover:bg-zinc-800 disabled:opacity-60"
                >
                  Refresh quote
                </button>
                <button
                  type="button"
                  onClick={() => setStep("refund")}
                  disabled={!preview?.coversPro || loadingPreview}
                  className="flex-1 rounded-md bg-white px-4 py-2.5 text-sm font-medium text-black hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Continue
                </button>
              </div>
            </div>
          ) : step === "refund" && selected && preview ? (
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => setStep("quote")}
                className="text-xs text-zinc-500 hover:text-zinc-300"
              >
                ← Back to quote
              </button>
              <p className="text-sm text-zinc-400">
                If the deposit fails or expires, funds return here. Use an
                address you control on this network.
              </p>
              <label className="block">
                <span className="mb-1.5 block text-xs uppercase tracking-wider text-zinc-500">
                  Refund address
                </span>
                <input
                  value={refundTo}
                  onChange={(event) => setRefundTo(event.target.value)}
                  placeholder={preview.refundHint}
                  autoComplete="off"
                  spellCheck={false}
                  className="w-full rounded-md border border-zinc-800 bg-black px-3 py-2 font-mono text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-zinc-600"
                />
              </label>
              {refundError ? (
                <p className="text-sm text-red-400">{refundError}</p>
              ) : null}
              <button
                type="button"
                onClick={() => void handleCreate()}
                disabled={creating || !refundTo.trim()}
                className="w-full rounded-md bg-white px-4 py-2.5 text-sm font-medium text-black hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {creating ? "Creating address…" : "Get deposit address"}
              </button>
            </div>
          ) : step === "pay" && deposit ? (
            <div className="space-y-4">
              <p className="text-sm text-zinc-400">
                Send exactly{" "}
                <span className="font-medium text-zinc-100">
                  {deposit.amountInDisplay || deposit.amountIn}{" "}
                  {deposit.symbol || selected?.symbol}
                </span>{" "}
                on {chainLabel(deposit.blockchain || selected?.blockchain || "")}{" "}
                to the address below.
              </p>

              <div className="flex justify-center">
                <DepositQr value={deposit.depositAddress} />
              </div>

              <div className="space-y-2 rounded-lg border border-zinc-800 bg-black/40 p-3">
                <p className="break-all font-mono text-xs text-zinc-200">
                  {deposit.depositAddress}
                </p>
                <button
                  type="button"
                  onClick={() => handleCopy(deposit.depositAddress, "address")}
                  className="text-xs text-zinc-400 underline-offset-2 hover:text-zinc-200 hover:underline"
                >
                  {copied === "address" ? "Copied address" : "Copy address"}
                </button>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-black/40 px-3 py-2">
                <span className="text-sm text-zinc-200">
                  {deposit.amountInDisplay || deposit.amountIn}{" "}
                  {deposit.symbol || selected?.symbol}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    handleCopy(
                      deposit.amountInDisplay || deposit.amountIn,
                      "amount",
                    )
                  }
                  className="text-xs text-zinc-400 underline-offset-2 hover:text-zinc-200 hover:underline"
                >
                  {copied === "amount" ? "Copied" : "Copy amount"}
                </button>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-black/40 px-4 py-3">
                <div className="flex items-center gap-2">
                  {payStatus === "confirming" ? (
                    <SpinnerIcon className="h-4 w-4 animate-spin text-zinc-300" />
                  ) : (
                    <span
                      className="inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-400"
                      aria-hidden
                    />
                  )}
                  <p className="text-sm text-zinc-200">
                    {payStatus === "confirming"
                      ? "Payment detected, confirming…"
                      : "Waiting for your transfer"}
                  </p>
                </div>
                <span className="font-mono text-xs text-zinc-400">
                  {formatCountdown(remainingMs)}
                </span>
              </div>

              <label className="block">
                <span className="mb-1.5 block text-xs text-zinc-500">
                  Transaction hash (optional, speeds up some networks)
                </span>
                <div className="flex gap-2">
                  <input
                    value={txHash}
                    onChange={(event) => setTxHash(event.target.value)}
                    placeholder="0x… or network tx id"
                    className="min-w-0 flex-1 rounded-md border border-zinc-800 bg-black px-3 py-2 font-mono text-xs text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-zinc-600"
                  />
                  <button
                    type="button"
                    onClick={() => void handleSubmitHash()}
                    disabled={submittingHash || !txHash.trim()}
                    className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-800 disabled:opacity-60"
                  >
                    {submittingHash ? "Sending" : "Submit"}
                  </button>
                </div>
              </label>

              {pollError ? (
                <p className="text-xs text-red-400">{pollError}</p>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
