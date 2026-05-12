"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  PLAN_META,
  formatNgn,
  getTransactionStatus,
  type PlanId,
  type TransactionStatusResponse,
  type UpgradePaymentResponse,
} from "@/lib/payments";

const POLL_INTERVAL_MS = 4_000;

export interface PaymentModalProps {
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

function CopyIcon({ className }: { className?: string }) {
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
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
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

export function PaymentModal({
  payment,
  planId,
  onClose,
  onSuccess,
  onRetry,
}: PaymentModalProps) {
  const resolvedPlanId: PlanId = (payment.planId ?? planId) as PlanId;
  const planMeta = PLAN_META[resolvedPlanId] ?? PLAN_META[planId] ?? PLAN_META.pro;
  const monthsCount =
    typeof payment.monthsCount === "number" && payment.monthsCount > 0
      ? payment.monthsCount
      : resolvedPlanId === "business"
        ? 2
        : 1;

  const [status, setStatus] = useState<ModalStatus>("waiting");
  const [latest, setLatest] = useState<TransactionStatusResponse | null>(null);
  const [remainingMs, setRemainingMs] = useState<number>(() => {
    const expiry = new Date(payment.expiresAt).getTime();
    return Math.max(0, expiry - Date.now());
  });
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
    if (!transactionId) {
      return;
    }

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

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(payment.accountNumber);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setErrorMessage("Could not copy account number");
    }
  }, [payment.accountNumber]);

  const handleMarkPaid = useCallback(() => {
    setStatus("confirming");
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
      aria-labelledby="payment-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
    >
      <div className="w-full max-w-md overflow-hidden rounded-xl border border-zinc-800 bg-[#0a0a0a] shadow-xl">
        <header className="flex items-start justify-between border-b border-zinc-800 px-5 py-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-zinc-500">
              {planMeta.badge}
            </p>
            <h2
              id="payment-modal-title"
              className="mt-1 text-lg font-semibold text-white"
            >
              {status === "success"
                ? "Welcome to Pro"
                : status === "expired"
                  ? "Payment session expired"
                  : status === "failed"
                    ? "Payment failed"
                    : "Complete your payment"}
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
              You&apos;re upgraded to{" "}
              <span className="font-semibold">
                {resolvedPlanId === "business" ? "Pro (Business)" : "Pro"}
              </span>{" "}
              for {monthsCount} month
              {monthsCount > 1 ? "s" : ""}.
            </p>
            {successExpiry && (
              <p className="text-sm text-zinc-400">
                Renews on <span className="text-zinc-200">{successExpiry}</span>
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
                ? "This payment session has expired. Generate a new account to retry."
                : "Your payment could not be confirmed. Please try again."}
            </p>
            <div className="mt-1 flex w-full flex-col gap-2">
              <button
                type="button"
                onClick={onRetry}
                className="w-full rounded-md bg-white px-4 py-2.5 text-sm font-medium text-black transition-colors hover:bg-zinc-200"
              >
                Generate new account
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
              Transfer the exact amount below to the bank account we just
              generated. Your plan upgrades automatically as soon as we confirm
              the payment.
            </p>

            <div className="grid gap-3 rounded-lg border border-zinc-800 bg-black/40 p-4">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-xs uppercase tracking-wider text-zinc-500">
                  Amount
                </span>
                <span className="text-right text-base font-semibold text-white">
                  {formatNgn(payment.amount)}
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-xs uppercase tracking-wider text-zinc-500">
                  Bank
                </span>
                <span className="text-right text-sm font-medium text-zinc-100">
                  {payment.bankName}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs uppercase tracking-wider text-zinc-500">
                  Account number
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-medium tracking-wider text-white">
                    {payment.accountNumber}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="flex items-center gap-1 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-200 transition-colors hover:bg-zinc-800"
                    aria-label="Copy account number"
                  >
                    {copied ? (
                      <>
                        <CheckIcon className="h-3.5 w-3.5" />
                        Copied
                      </>
                    ) : (
                      <>
                        <CopyIcon className="h-3.5 w-3.5" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
              </div>
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
                    ? "Confirming your payment..."
                    : "Waiting for payment..."}
                </p>
              </div>
              <span className="font-mono text-xs text-zinc-400">
                {formatCountdown(remainingMs)}
              </span>
            </div>

            {!payment.transactionId && (
              <p className="text-xs text-amber-400">
                We won&apos;t be able to auto-confirm this payment from the
                browser until the server has been redeployed. Your plan will
                still upgrade automatically once Aella notifies the server.
              </p>
            )}
            {errorMessage && (
              <p className="text-xs text-red-400">{errorMessage}</p>
            )}

            <button
              type="button"
              onClick={handleMarkPaid}
              disabled={status === "confirming"}
              className="w-full rounded-md bg-white px-4 py-2.5 text-sm font-medium text-black transition-colors hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              I&apos;ve sent the payment
            </button>
          </div>
        )}

        {!isTerminal && (
          <footer className="border-t border-zinc-800 px-5 py-3 text-center">
            <p className="text-[11px] text-zinc-500">
              Account expires automatically in {formatCountdown(remainingMs)}.
            </p>
          </footer>
        )}
      </div>
    </div>
  );
}
