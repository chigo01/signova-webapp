"use client";

import type { PaymentMethodsResponse, PlanId } from "@/lib/payments";
import { PLAN_META } from "@/lib/payments";

export interface PaymentMethodModalProps {
  planId: PlanId;
  onClose: () => void;
  onPaystack: () => void;
  onCrypto: () => void;
  onBachs: () => void;
  startingPaystack?: boolean;
  startingBachs?: boolean;
  methods?: PaymentMethodsResponse | null;
}

function CloseIcon({ className }: { className?: string }) {
  return (
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
      className={className}
      aria-hidden
    >
      <line x1="18" x2="6" y1="6" y2="18" />
      <line x1="6" x2="18" y1="6" y2="18" />
    </svg>
  );
}

export function PaymentMethodModal({
  planId,
  onClose,
  onPaystack,
  onCrypto,
  onBachs,
  startingPaystack = false,
  startingBachs = false,
  methods = null,
}: PaymentMethodModalProps) {
  const planMeta = PLAN_META[planId] ?? PLAN_META.pro;
  const paystackEnabled = methods?.paystack.enabled ?? true;
  const dextopusEnabled = (methods?.dextopus.enabled ?? true) && planId === "pro";
  const bachsEnabled = (methods?.bachs.enabled ?? false) && planId === "pro";
  const anyCrypto = dextopusEnabled || bachsEnabled;
  const starting = startingPaystack || startingBachs;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-method-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
    >
      <div className="w-full max-w-md overflow-hidden rounded-xl border border-zinc-800 bg-[#0a0a0a] shadow-xl">
        <header className="flex items-start justify-between border-b border-zinc-800 px-5 py-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-zinc-500">
              {planMeta.badge}
            </p>
            <h2
              id="payment-method-title"
              className="mt-1 text-lg font-semibold text-white"
            >
              Choose how to pay
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
            aria-label="Close"
          >
            <CloseIcon />
          </button>
        </header>

        <div className="space-y-3 px-5 py-5">
          <p className="text-sm text-zinc-400">
            {paystackEnabled && anyCrypto
              ? "Pay with card or bank through Paystack, send crypto from your wallet, or use the hosted crypto checkout."
              : anyCrypto
                ? "Pay by sending crypto from your wallet, or use the hosted crypto checkout."
                : paystackEnabled
                  ? planId === "pro"
                    ? "Pay with card or bank through Paystack."
                    : "Business is billed through Paystack. Crypto checkout is available on the Pro plan."
                  : "No payment methods are available for this plan right now."}
          </p>

          {paystackEnabled ? (
            <button
              type="button"
              onClick={onPaystack}
              disabled={starting}
              className="flex w-full flex-col items-start gap-1 rounded-lg border border-zinc-800 bg-black/40 px-4 py-3 text-left transition-colors hover:border-zinc-600 hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="text-sm font-medium text-white">
                {startingPaystack
                  ? "Starting Paystack…"
                  : "Card / bank (Paystack)"}
              </span>
              <span className="text-xs text-zinc-500">
                Card, bank transfer, USSD or QR
              </span>
            </button>
          ) : null}

          {dextopusEnabled ? (
            <button
              type="button"
              onClick={onCrypto}
              disabled={starting}
              className="flex w-full flex-col items-start gap-1 rounded-lg border border-zinc-800 bg-black/40 px-4 py-3 text-left transition-colors hover:border-zinc-600 hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="text-sm font-medium text-white">
                Crypto wallet
              </span>
              <span className="text-xs text-zinc-500">
                Send any supported token from your wallet. Converts to $100 for 1
                month of Pro.
              </span>
            </button>
          ) : null}

          {bachsEnabled ? (
            <button
              type="button"
              onClick={onBachs}
              disabled={starting}
              className="flex w-full flex-col items-start gap-1 rounded-lg border border-zinc-800 bg-black/40 px-4 py-3 text-left transition-colors hover:border-zinc-600 hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="text-sm font-medium text-white">
                {startingBachs
                  ? "Starting crypto checkout…"
                  : "Crypto checkout"}
              </span>
              <span className="text-xs text-zinc-500">
                USDT, USDC, ETH, SOL, or BNB via hosted checkout
              </span>
            </button>
          ) : null}

          {!paystackEnabled && !anyCrypto ? (
            <p className="text-sm text-amber-400">
              No payment methods are available right now. Try again later.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
