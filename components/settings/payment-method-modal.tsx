"use client";

import { useState } from "react";
import type {
  BachsCheckoutMethod,
  PaymentMethodsResponse,
  PlanId,
} from "@/lib/payments";
import { PLAN_META } from "@/lib/payments";

export interface PaymentMethodModalProps {
  planId: PlanId;
  onClose: () => void;
  onAella: () => void;
  onBachs: (method: BachsCheckoutMethod) => void;
  startingAella?: boolean;
  startingMethod?: BachsCheckoutMethod | null;
  methods?: PaymentMethodsResponse | null;
}

const HOSTED_CHECKOUT_OPTIONS: Array<{
  id: Exclude<BachsCheckoutMethod, "bank_transfer">;
  title: string;
  startingTitle: string;
  description: string;
}> = [
  {
    id: "card",
    title: "Card",
    startingTitle: "Starting card checkout…",
    description: "Visa or Mastercard in USD or NGN.",
  },
  {
    id: "crypto",
    title: "Crypto checkout",
    startingTitle: "Starting crypto checkout…",
    description: "USDT, USDC, ETH, SOL, or BNB via hosted checkout.",
  },
];

const OPTION_BUTTON_CLASS =
  "flex w-full flex-col items-start gap-1 rounded-lg border border-zinc-800 bg-black/40 px-4 py-3 text-left transition-colors hover:border-zinc-600 hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-60";

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

function BackIcon({ className }: { className?: string }) {
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
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

export function PaymentMethodModal({
  planId,
  onClose,
  onAella,
  onBachs,
  startingAella = false,
  startingMethod = null,
  methods = null,
}: PaymentMethodModalProps) {
  const [step, setStep] = useState<"method" | "ngn-provider">("method");
  const planMeta = PLAN_META[planId] ?? PLAN_META.pro;
  const aellaEnabled = (methods?.aella?.enabled ?? true) && planId === "pro";
  const bachsEnabled = (methods?.bachs.enabled ?? true) && planId === "pro";
  const ngnEnabled = aellaEnabled || bachsEnabled;
  const bothNgnProviders = aellaEnabled && bachsEnabled;
  const anyMethod = ngnEnabled;
  const starting = startingAella || startingMethod !== null;
  const ngnStarting = startingAella || startingMethod === "bank_transfer";
  const onProviderStep = step === "ngn-provider" && bothNgnProviders;

  function handleNgnClick() {
    if (starting) return;
    if (bothNgnProviders) {
      setStep("ngn-provider");
      return;
    }
    if (bachsEnabled) {
      onBachs("bank_transfer");
      return;
    }
    if (aellaEnabled) {
      onAella();
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-method-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
    >
      <div className="w-full max-w-md overflow-hidden rounded-xl border border-zinc-800 bg-[#0a0a0a] shadow-xl">
        <header className="flex items-start justify-between border-b border-zinc-800 px-5 py-4">
          <div className="flex min-w-0 items-start gap-2">
            {onProviderStep ? (
              <button
                type="button"
                onClick={() => setStep("method")}
                disabled={starting}
                className="mt-0.5 rounded-md p-1 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
                aria-label="Back to payment methods"
              >
                <BackIcon />
              </button>
            ) : null}
            <div>
              <p className="text-xs uppercase tracking-wider text-zinc-500">
                {planMeta.badge}
              </p>
              <h2
                id="payment-method-title"
                className="mt-1 text-lg font-semibold text-white"
              >
                {onProviderStep
                  ? "Choose a provider"
                  : "Choose how to pay"}
              </h2>
            </div>
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
          {onProviderStep ? (
            <>
              <p className="text-sm text-zinc-400">
                Both send Naira to a Nigerian bank account. Pick a provider.
              </p>

              {bachsEnabled ? (
                <button
                  type="button"
                  onClick={() => onBachs("bank_transfer")}
                  disabled={starting}
                  className={OPTION_BUTTON_CLASS}
                >
                  <span className="text-sm font-medium text-white">
                    {startingMethod === "bank_transfer"
                      ? "Starting NGN checkout…"
                      : "Bachs"}
                  </span>
                  <span className="text-xs text-zinc-500">
                    Pay in Naira through the hosted bank-transfer checkout.
                  </span>
                </button>
              ) : null}

              {aellaEnabled ? (
                <button
                  type="button"
                  onClick={onAella}
                  disabled={starting}
                  className={OPTION_BUTTON_CLASS}
                >
                  <span className="text-sm font-medium text-white">
                    {startingAella
                      ? "Starting NGN bank transfer…"
                      : "Aella"}
                  </span>
                  <span className="text-xs text-zinc-500">
                    Transfer the exact Naira amount to a Nigerian account
                    number.
                  </span>
                </button>
              ) : null}
            </>
          ) : (
            <>
              <p className="text-sm text-zinc-400">
                {anyMethod
                  ? "Pay by Naira bank transfer, card, or hosted crypto checkout."
                  : "No payment methods are available for this plan right now."}
              </p>

              {ngnEnabled ? (
                <button
                  type="button"
                  onClick={handleNgnClick}
                  disabled={starting}
                  className={OPTION_BUTTON_CLASS}
                >
                  <span className="text-sm font-medium text-white">
                    {ngnStarting && !bothNgnProviders
                      ? "Starting NGN bank transfer…"
                      : "NGN bank transfer"}
                  </span>
                  <span className="text-xs text-zinc-500">
                    Transfer the exact Naira amount to a Nigerian account
                    number.
                  </span>
                </button>
              ) : null}

              {bachsEnabled
                ? HOSTED_CHECKOUT_OPTIONS.map((option) => {
                    const isStarting = startingMethod === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => onBachs(option.id)}
                        disabled={starting}
                        className={OPTION_BUTTON_CLASS}
                      >
                        <span className="text-sm font-medium text-white">
                          {isStarting ? option.startingTitle : option.title}
                        </span>
                        <span className="text-xs text-zinc-500">
                          {option.description}
                        </span>
                      </button>
                    );
                  })
                : null}

              {!anyMethod ? (
                <p className="text-sm text-amber-400">
                  Try again later, or contact support if this persists.
                </p>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
