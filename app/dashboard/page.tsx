"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { WinRateGauge } from "@/components/dashboard/win-rate-gauge";
import { StockOptions } from "@/components/dashboard/stock-options";
import { SignalVaultPreview } from "@/components/dashboard/signal-vault-preview";
import { AutoJournal } from "@/components/dashboard/auto-journal";
import { Search, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getPlanBalance, type SubscriptionPlan } from "@/lib/payments";
import { useAuthState } from "@/components/auth/auth-provider";

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

export default function DashboardPage() {
  const { isGuest, promptAuth } = useAuthState();
  const [plan, setPlan] = useState<SubscriptionPlan | null>(null);
  const [proPlanExpiry, setProPlanExpiry] = useState<string | null>(null);

  useEffect(() => {
    // Guests have no plan to load — skip the authed call to avoid 401 noise.
    if (isGuest) return;
    const controller = new AbortController();
    void (async () => {
      try {
        const balance = await getPlanBalance({ signal: controller.signal });
        if (controller.signal.aborted) return;
        setPlan(balance.plan);
        setProPlanExpiry(balance.proPlanExpiry ?? null);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          console.error("Failed to load plan on dashboard", err);
        }
      }
    })();
    return () => controller.abort();
  }, [isGuest]);

  const expiryLabel = formatExpiryDate(proPlanExpiry);

  return (
    <main className="flex-1 overflow-y-auto overflow-x-hidden bg-black">
      <div className="mx-auto w-full max-w-[1600px] bg-black px-4 pb-6 pt-4 sm:px-6 sm:pb-8 sm:pt-6 lg:px-8">
        <header className="mb-6 hidden items-center justify-between border-b border-zinc-900 pb-3 lg:flex">
          <h3 className="text-xl font-bold">Dashboard</h3>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white" />
              <input
                type="text"
                placeholder="USDT/GOLD"
                className="h-10 w-64 rounded-full bg-zinc-900 pl-10 pr-4 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-700"
              />
            </div>
            <Link href="/dashboard/videos">
              <Button
                variant="secondary"
                size="sm"
                className="rounded-full bg-white px-4 text-xs text-black hover:bg-zinc-200"
              >
                Watch tutorials
              </Button>
            </Link>
          </div>
        </header>

        <h1 className="mb-5 text-3xl font-semibold tracking-tight bg-linear-to-r from-white via-[#A3A3A3] to-white bg-clip-text text-transparent sm:mb-6 sm:text-4xl md:mb-8">
          Welcome to SIG<span className="text-[#565656]">NOVA</span>(beta)
        </h1>

        {/* Mobile: Watch tutorials */}
        <div className="mb-5 flex lg:hidden">
          <Link href="/dashboard/videos">
            <Button
              variant="secondary"
              size="sm"
              className="rounded-full bg-white px-5 py-2.5 text-xs font-semibold text-black hover:bg-zinc-200"
            >
              <Play className="mr-2 h-3.5 w-3.5 fill-current" />
              Watch tutorials
            </Button>
          </Link>
        </div>

        {isGuest && (
          <div className="mb-5 flex flex-col gap-3 rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-4 sm:mb-6 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
                You&apos;re browsing as a guest
              </p>
              <p className="mt-1 text-sm text-zinc-300">
                Create a free account to unlock live signals, the signal vault,
                and your trading journal.
              </p>
            </div>
            <button
              type="button"
              onClick={() => promptAuth("Create your free account")}
              className="inline-flex shrink-0 items-center justify-center rounded-md bg-emerald-400 px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-emerald-300 sm:self-auto"
            >
              Sign up free
            </button>
          </div>
        )}

        {!isGuest && plan === "free" && (
          <div className="mb-5 flex flex-col gap-3 rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-4 sm:mb-6 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
                You&apos;re on the Free plan
              </p>
              <p className="mt-1 text-sm text-zinc-300">
                Upgrade to Pro to unlock options flow awareness, strike selection
                guidance, and market sentiment context.
              </p>
            </div>
            <Link
              href="/dashboard/settings/pricing"
              className="inline-flex shrink-0 items-center justify-center rounded-md bg-emerald-400 px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-emerald-300 sm:self-auto"
            >
              Upgrade to Pro
            </Link>
          </div>
        )}

        {!isGuest && (plan === "pro" || plan === "business") && expiryLabel && (
          <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-zinc-800 bg-[#090909] px-4 py-3 sm:mb-6">
            <span
              className={
                plan === "business"
                  ? "rounded-md border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-300"
                  : "rounded-md border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-300"
              }
            >
              {plan === "business" ? "Business" : "Pro"}
            </span>
            <p className="text-sm text-zinc-300">
              Renews on <span className="text-zinc-100">{expiryLabel}</span>
            </p>
            <Link
              href="/dashboard/settings/pricing"
              className="ml-auto text-xs text-zinc-400 underline-offset-4 hover:text-zinc-100 hover:underline"
            >
              Manage plan
            </Link>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-4 xl:grid-cols-7 xl:gap-x-4">
          <div className="min-w-0 md:col-span-1 xl:col-span-3">
            <WinRateGauge value={80} />
          </div>
          <div className="min-w-0 md:col-span-1 xl:col-span-4">
            <StockOptions />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3 xl:gap-x-4">
          <div className="min-w-0 xl:col-span-2">
            <SignalVaultPreview />
          </div>
          <div className="min-w-0 xl:col-span-1">
            <AutoJournal />
          </div>
        </div>
      </div>
    </main>
  );
}
