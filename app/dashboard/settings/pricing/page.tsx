"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuthUserProfile } from "@/lib/auth-user";
import { logout as performLogout } from "@/lib/logout";
import { PaymentModal } from "@/components/settings/payment-modal";
import {
  PLAN_META,
  createUpgradePayment,
  getPlanBalance,
  type PlanId,
  type SubscriptionPlan,
  type TransactionStatusResponse,
  type UpgradePaymentResponse,
} from "@/lib/payments";

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function CheckMark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function BackArrow({ className }: { className?: string }) {
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
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

const PLAN_ORDER: Array<"free" | PlanId> = ["free", "pro", "business"];

export default function PricingPage() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [name, setName] = useState("User");
  const [role, setRole] = useState("Trader");

  const [currentPlan, setCurrentPlan] = useState<SubscriptionPlan>("free");
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [planError, setPlanError] = useState<string | null>(null);

  const [subscribingPlanId, setSubscribingPlanId] = useState<PlanId | null>(
    null,
  );
  const [subscribeError, setSubscribeError] = useState<string | null>(null);
  const [activePayment, setActivePayment] = useState<{
    response: UpgradePaymentResponse;
    planId: PlanId;
  } | null>(null);

  useEffect(() => {
    const user = getAuthUserProfile();
    if (user?.name) setName(user.name);
    if (user?.role) setRole(user.role);
  }, []);

  const refreshBalance = useCallback(async (signal?: AbortSignal) => {
    try {
      const balance = await getPlanBalance({ signal });
      setCurrentPlan(balance.plan);
      setPlanError(null);
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setPlanError((err as Error).message || "Could not load current plan");
    } finally {
      setLoadingPlan(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void refreshBalance(controller.signal);
    return () => controller.abort();
  }, [refreshBalance]);

  const handleSubscribe = useCallback(async (planId: PlanId) => {
    setSubscribingPlanId(planId);
    setSubscribeError(null);
    try {
      const response = await createUpgradePayment(planId);
      setActivePayment({ response, planId });
    } catch (err) {
      setSubscribeError(
        (err as Error).message || "Could not start payment. Try again.",
      );
    } finally {
      setSubscribingPlanId(null);
    }
  }, []);

  const handleClosePayment = useCallback(() => {
    setActivePayment(null);
    void refreshBalance();
  }, [refreshBalance]);

  const handlePaymentSuccess = useCallback(
    (status: TransactionStatusResponse) => {
      setCurrentPlan(status.user.plan);
    },
    [],
  );

  const handleRetryPayment = useCallback(() => {
    const previous = activePayment;
    setActivePayment(null);
    if (previous) {
      void handleSubscribe(previous.planId);
    }
  }, [activePayment, handleSubscribe]);

  const activePaymentResponse = activePayment?.response ?? null;
  const activePaymentPlanId = activePayment?.planId ?? null;

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await performLogout();
      router.replace("/login");
    } finally {
      setIsLoggingOut(false);
    }
  }

  const avatarInitials = useMemo(() => initialsFromName(name), [name]);

  return (
    <main className="flex-1 overflow-y-auto overflow-x-hidden bg-black">
      <div className="mx-auto w-full max-w-[1600px] px-4 pb-10 pt-4 sm:px-6 sm:pb-12 sm:pt-6 lg:px-8">
        <header className="mb-5 flex items-center justify-between sm:mb-6">
          <h1 className="text-2xl font-semibold text-white sm:text-[32px]">
            Settings
          </h1>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-100 transition-colors hover:bg-zinc-800"
            >
              Edit profile
            </button>
            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-100 transition-colors hover:bg-zinc-800 disabled:opacity-50"
            >
              {isLoggingOut ? "Logging out..." : "Log out"}
            </button>
          </div>
        </header>

        <section className="rounded-xl border border-zinc-800 bg-[#090909] p-4 sm:p-6">
          <button
            type="button"
            onClick={() => router.back()}
            className="mb-4 inline-flex items-center gap-1.5 text-sm text-zinc-400 transition-colors hover:text-zinc-200"
          >
            <BackArrow className="h-4 w-4" />
            <span>Pricing plan</span>
          </button>

          <div className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-black/40 p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-sm font-medium text-white">
              {avatarInitials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-zinc-100">
                {name}
              </p>
              <p className="truncate text-xs text-zinc-500">{role}</p>
            </div>
          </div>

          <div className="mt-8 flex flex-col items-center px-4 py-12 text-center">
            <span className="inline-flex items-center rounded-md border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-300">
              Coming Soon
            </span>
            <h2 className="mt-3 text-2xl font-semibold text-white sm:text-3xl">
              Payment plans are coming soon
            </h2>
            <p className="mt-2 max-w-md text-sm text-zinc-400">
              We&apos;re putting the finishing touches on our subscription
              plans. Check back soon to upgrade.
            </p>
          </div>

          {/* TODO: re-enable payment plans — original markup preserved below */}
          {/*
          <div className="mt-8 flex flex-col items-center text-center">
            <span className="inline-flex items-center rounded-md border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-300">
              Payment plan
            </span>
            <h2 className="mt-3 text-2xl font-semibold text-white sm:text-3xl">
              Upgrade your plan
            </h2>
            {planError && (
              <p className="mt-2 text-xs text-red-400">{planError}</p>
            )}
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {PLAN_ORDER.map((id) => {
              const meta = PLAN_META[id];
              const isCurrent = !loadingPlan && currentPlan === id;
              const isFree = id === "free";
              const isPro = id === "pro";
              return (
                <article
                  key={id}
                  className="flex flex-col rounded-xl border border-zinc-800 bg-black/40 p-5"
                >
                  <header className="flex items-center justify-between">
                    <span
                      className={
                        isFree
                          ? "inline-flex items-center rounded-md bg-emerald-400 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-black"
                          : isPro
                            ? "inline-flex items-center rounded-md border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-200"
                            : "inline-flex items-center rounded-md border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-200"
                      }
                    >
                      {meta.badge}
                    </span>
                  </header>

                  <div className="mt-6">
                    <p className="text-4xl font-semibold text-white">
                      {meta.priceUsdLabel}
                    </p>
                    <div className="mt-2 flex items-baseline justify-between gap-2">
                      <span className="text-sm text-zinc-400">
                        {meta.durationLabel}
                      </span>
                      <span className="text-xs text-zinc-500">
                        {meta.periodLabel}
                      </span>
                    </div>
                  </div>

                  <div className="mt-6 flex-1">
                    <p className="text-sm font-medium text-white">Features</p>
                    <ul className="mt-3 space-y-2">
                      {meta.features.map((feature) => (
                        <li
                          key={feature}
                          className="flex items-start gap-2 text-sm text-zinc-300"
                        >
                          <CheckMark className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-6">
                    {isFree ? (
                      <button
                        type="button"
                        disabled
                        className="w-full rounded-md border border-zinc-800 bg-zinc-900/80 px-4 py-2.5 text-sm font-medium text-zinc-300"
                      >
                        {isCurrent ? "Current plan" : "Free plan"}
                      </button>
                    ) : isCurrent ? (
                      <button
                        type="button"
                        disabled
                        className="w-full rounded-md border border-zinc-800 bg-zinc-900/80 px-4 py-2.5 text-sm font-medium text-zinc-300"
                      >
                        Current plan
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSubscribe(id as PlanId)}
                        disabled={subscribingPlanId !== null}
                        className="w-full rounded-md bg-white px-4 py-2.5 text-sm font-medium text-black transition-colors hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {subscribingPlanId === id
                          ? "Starting..."
                          : "Subscribe Now"}
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>

          {subscribeError && (
            <p className="mt-4 text-center text-sm text-red-400">
              {subscribeError}
            </p>
          )}
          */}
        </section>
      </div>

      {/* TODO: re-enable when payment plans return */}
      {/*
      {activePaymentResponse && activePaymentPlanId && (
        <PaymentModal
          payment={activePaymentResponse}
          planId={activePaymentPlanId}
          onClose={handleClosePayment}
          onSuccess={handlePaymentSuccess}
          onRetry={handleRetryPayment}
        />
      )}
      */}
    </main>
  );
}
