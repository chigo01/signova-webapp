"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  PLAN_META,
  formatExpiryDate,
  formatNgn,
  formatUsd,
  getTransactionStatus,
  type PlanId,
  type TransactionStatusResponse,
  type UpgradePaymentResponse,
} from "@/lib/payments";

const POLL_INTERVAL_MS = 4_000;

export interface AellaPaymentModalProps {
  payment: UpgradePaymentResponse;
  planId: PlanId;
  onClose: () => void;
  onSuccess: (status: TransactionStatusResponse) => void;
  onRetry: () => void;
}

type ModalStatus = "waiting" | "confirming" | "success" | "failed" | "expired";

function formatCountdown(remainingMs: number): string {
  if (remainingMs <= 0) return "00:00";
  const totalSeconds = Math.floor(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
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

export function AellaPaymentModal({
  payment,
  planId,
  onClose,
  onSuccess,
  onRetry,
}: AellaPaymentModalProps) {
  const resolvedPlanId: PlanId = (payment.planId ?? planId) as PlanId;
  const planMeta = PLAN_META[resolvedPlanId] ?? PLAN_META[planId] ?? PLAN_META.pro;
  const monthsCount =
    typeof payment.monthsCount === "number" && payment.monthsCount > 0
      ? payment.monthsCount
      : 1;
  const amountNgn = payment.amountNgn ?? 0;
  const accountNumber = payment.accountNumber ?? "";
  const accountName = payment.accountName ?? "";
  const bankName = payment.bankName ?? "Aella Microfinance Bank";

  const [status, setStatus] = useState<ModalStatus>("waiting");
  const [latest, setLatest] = useState<TransactionStatusResponse | null>(null);
  const [remainingMs, setRemainingMs] = useState<number>(() => {
    const expiry = new Date(payment.expiresAt).getTime();
    return Math.max(0, expiry - Date.now());
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState<"account" | "amount" | null>(null);

  const successCallbackRef = useRef(onSuccess);

  useEffect(() => {
    successCallbackRef.current = onSuccess;
  }, [onSuccess]);

  useEffect(() => {
    if (status !== "waiting" && status !== "confirming") return;
    const expiry = new Date(payment.expiresAt).getTime();
    const intervalId = window.setInterval(() => {
      const ms = Math.max(0, expiry - Date.now());
      setRemainingMs(ms);
      if (ms === 0) {
        setStatus((current) =>
          current === "waiting" || current === "confirming"
            ? "expired"
            : current,
        );
      }
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, [payment.expiresAt, status]);

  useEffect(() => {
    if (status === "success" || status === "failed" || status === "expired") {
      return;
    }

    const transactionId = payment.transactionId;
    if (!transactionId) return;

    const controller = new AbortController();
    let cancelled = false;

    const poll = async () => {
      try {
        const result = await getTransactionStatus(transactionId, {
          signal: controller.signal,
        });
        if (cancelled) return;
        setLatest(result);
        setErrorMessage(null);
        if (result.status === "success") {
          setStatus("success");
          successCallbackRef.current(result);
        } else if (result.status === "failed") {
          setStatus("failed");
        } else {
          setStatus("confirming");
        }
      } catch (err) {
        if (cancelled) return;
        if ((err as Error).name === "AbortError") return;
        setErrorMessage((err as Error).message || "Unable to check status");
      }
    };

    void poll();
    const intervalId = window.setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      controller.abort();
      window.clearInterval(intervalId);
    };
  }, [payment.transactionId, status]);

  const handleCopy = useCallback(async (value: string, kind: "account" | "amount") => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 1500);
    } catch {
      setErrorMessage("Could not copy to clipboard");
    }
  }, []);

  const successExpiry = useMemo(
    () => formatExpiryDate(latest?.user.proPlanExpiry),
    [latest?.user.proPlanExpiry],
  );

  const isTerminal =
    status === "success" || status === "failed" || status === "expired";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="aella-payment-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
    >
      <div className="w-full max-w-md overflow-hidden rounded-xl border border-zinc-800 bg-[#0a0a0a] shadow-xl">
        <header className="flex items-start justify-between border-b border-zinc-800 px-5 py-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-zinc-500">
              {planMeta.badge}
            </p>
            <h2
              id="aella-payment-title"
              className="mt-1 text-lg font-semibold text-white"
            >
              {status === "success"
                ? "Welcome to Pro"
                : status === "expired"
                  ? "Payment session expired"
                  : status === "failed"
                    ? "Payment failed"
                    : "Transfer to this account"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
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
        </header>

        {status === "success" ? (
          <div className="flex flex-col items-center gap-3 px-5 py-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
              <CheckIcon className="h-7 w-7" />
            </div>
            <p className="text-base text-white">
              You&apos;re upgraded to <span className="font-semibold">Pro</span>{" "}
              for {monthsCount} month
              {monthsCount > 1 ? "s" : ""}.
            </p>
            {successExpiry && (
              <p className="text-sm text-zinc-400">
                Expires on{" "}
                <span className="text-zinc-200">{successExpiry}</span>
              </p>
            )}
            <button
              type="button"
              onClick={onClose}
              className="mt-3 w-full rounded-md bg-white px-4 py-2.5 text-sm font-medium text-black transition-colors hover:bg-zinc-200"
            >
              Done
            </button>
          </div>
        ) : status === "expired" || status === "failed" ? (
          <div className="flex flex-col items-center gap-3 px-5 py-7 text-center">
            <p className="text-sm text-zinc-400">
              {status === "expired"
                ? "This payment session has expired. Start a new payment to retry."
                : "Your payment could not be confirmed. Please try again."}
            </p>
            <div className="mt-1 flex w-full flex-col gap-2">
              <button
                type="button"
                onClick={onRetry}
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
          </div>
        ) : (
          <div className="space-y-4 px-5 py-5">
            <p className="text-sm text-zinc-400">
              Send exactly {formatNgn(amountNgn)} from your Nigerian bank app.
              The account number only accepts that amount.
            </p>

            <div className="grid gap-3 rounded-lg border border-zinc-800 bg-black/40 p-4">
              <DetailRow label="Bank" value={bankName} />
              <DetailRow label="Account name" value={accountName} />
              <DetailRow
                label="Account number"
                value={accountNumber}
                actionLabel={copied === "account" ? "Copied" : "Copy"}
                onAction={() => void handleCopy(accountNumber, "account")}
              />
              <DetailRow
                label="Amount"
                value={formatNgn(amountNgn)}
                hint={formatUsd(payment.displayUsd ?? payment.amount)}
                actionLabel={copied === "amount" ? "Copied" : "Copy"}
                onAction={() => void handleCopy(String(amountNgn), "amount")}
              />
            </div>

            <div className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-black/40 px-4 py-3">
              <div className="flex items-center gap-2">
                {status === "confirming" ? (
                  <SpinnerIcon className="h-4 w-4 animate-spin text-zinc-300" />
                ) : (
                  <span
                    className="inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-400"
                    aria-hidden
                  />
                )}
                <p className="text-sm text-zinc-200">
                  {status === "confirming"
                    ? "Waiting for the transfer…"
                    : "Waiting for payment"}
                </p>
              </div>
              <span className="font-mono text-xs text-zinc-400">
                {formatCountdown(remainingMs)}
              </span>
            </div>

            {errorMessage && (
              <p className="text-xs text-red-400">{errorMessage}</p>
            )}
          </div>
        )}

        {!isTerminal && (
          <footer className="border-t border-zinc-800 px-5 py-3 text-center">
            <p className="text-[11px] text-zinc-500">
              Session expires in {formatCountdown(remainingMs)}.
            </p>
          </footer>
        )}
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
  hint,
  actionLabel,
  onAction,
}: {
  label: string;
  value: string;
  hint?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-xs uppercase tracking-wider text-zinc-500">
        {label}
      </span>
      <div className="flex min-w-0 flex-col items-end gap-1">
        <span className="text-right text-sm font-medium text-white">{value}</span>
        {hint ? <span className="text-xs text-zinc-500">{hint}</span> : null}
        {onAction && actionLabel ? (
          <button
            type="button"
            onClick={onAction}
            className="text-xs text-zinc-400 transition-colors hover:text-zinc-200"
          >
            {actionLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}
