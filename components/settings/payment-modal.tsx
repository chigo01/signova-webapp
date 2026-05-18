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

function ExternalLinkIcon({ className }: { className?: string }) {
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
      <path d="M15 3h6v6" />
      <path d="M10 14 21 3" />
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
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

  const handlePayWithPaystack = useCallback(() => {
    window.open(payment.authorizationUrl, "_blank", "noopener,noreferrer");
    setStatus((current) => (current === "waiting" ? "confirming" : current));
  }, [payment.authorizationUrl]);

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
              You&apos;ll be taken to Paystack to complete payment securely with
              card, bank transfer, USSD or QR. Your plan upgrades automatically
              as soon as we confirm the payment.
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
                  Plan
                </span>
                <span className="text-right text-sm font-medium text-zinc-100">
                  {planMeta.badge} · {monthsCount} month
                  {monthsCount > 1 ? "s" : ""}
                </span>
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
                    ? "Waiting for Paystack to confirm..."
                    : "Ready to pay"}
                </p>
              </div>
              <span className="font-mono text-xs text-zinc-400">
                {formatCountdown(remainingMs)}
              </span>
            </div>

            {errorMessage && (
              <p className="text-xs text-red-400">{errorMessage}</p>
            )}

            <button
              type="button"
              onClick={handlePayWithPaystack}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-white px-4 py-2.5 text-sm font-medium text-black transition-colors hover:bg-zinc-200"
            >
              Pay with Paystack
              <ExternalLinkIcon className="h-4 w-4" />
            </button>
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
