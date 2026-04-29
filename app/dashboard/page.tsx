"use client";

import { useEffect, useMemo, useState } from "react";
import { SignalCard } from "@/components/dashboard/signal-card";
import { Button } from "@/components/ui/button";
import { fetchApprovedSignals, fetchWinRate } from "@/lib/signals";
import { Signal } from "@/types/signal";
import { RefreshCw, ShieldCheck, TrendingUp } from "lucide-react";

export default function DashboardPage() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [winRate, setWinRate] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSignals = async () => {
    setLoading(true);
    setError(null);
    try {
      const [approvedSignals, rate] = await Promise.all([
        fetchApprovedSignals(),
        fetchWinRate().catch(() => null),
      ]);
      setSignals(approvedSignals);
      setWinRate(rate);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load SIGnova signals");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSignals();
  }, []);

  const stats = useMemo(() => {
    const buyCount = signals.filter((signal) => signal.direction === "BUY").length;
    const sellCount = signals.filter((signal) => signal.direction === "SELL").length;
    const avgConfidence =
      signals.length === 0
        ? 0
        : Math.round(
            (signals.reduce(
              (sum, signal) =>
                sum + (signal.confidence <= 1 ? signal.confidence * 100 : signal.confidence),
              0,
            ) /
              signals.length) *
              10,
          ) / 10;

    return { buyCount, sellCount, avgConfidence };
  }, [signals]);

  return (
    <main className="flex-1 overflow-y-auto overflow-x-hidden bg-black text-white">
      <div className="mx-auto w-full max-w-[1600px] px-4 pb-8 pt-4 sm:px-6 lg:px-8">
        <header className="mb-6 flex flex-col gap-4 border-b border-zinc-900 pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              SIGnova Elite Trades
            </h1>
            <p className="mt-2 text-sm text-zinc-400">
              Admin-approved forex opportunities from the latest engine cycle.
            </p>
          </div>
          <Button onClick={loadSignals} disabled={loading} className="gap-2 self-start">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </header>

        <section className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-4">
          <DashboardStat label="Approved" value={signals.length} detail="visible trades" />
          <DashboardStat label="Average Confidence" value={`${stats.avgConfidence}%`} detail="current set" />
          <DashboardStat label="Direction Mix" value={`${stats.buyCount}/${stats.sellCount}`} detail="buy / sell" />
          <DashboardStat label="Win Rate" value={winRate == null ? "N/A" : `${winRate}%`} detail="approved history" />
        </section>

        {error && (
          <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
            {error}
          </div>
        )}

        {loading && signals.length === 0 ? (
          <div className="flex min-h-[360px] items-center justify-center rounded-lg border border-zinc-900 bg-zinc-950 text-zinc-400">
            Loading elite trades...
          </div>
        ) : signals.length === 0 ? (
          <div className="flex min-h-[360px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-zinc-800 bg-zinc-950 px-6 text-center">
            <ShieldCheck className="h-10 w-10 text-zinc-500" />
            <h2 className="text-lg font-semibold">No approved elite trades</h2>
            <p className="max-w-md text-sm text-zinc-500">
              The engine may have candidates waiting for admin review, or quality rules may have blocked today&apos;s quota.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {signals.map((signal) => (
              <SignalCard key={signal._id || signal.engine?.candidateId} signal={signal} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function DashboardStat({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail: string;
}) {
  return (
    <div className="rounded-lg border border-zinc-900 bg-zinc-950 p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs uppercase tracking-wide text-zinc-500">{label}</span>
        <TrendingUp className="h-4 w-4 text-zinc-600" />
      </div>
      <div className="mt-3 text-2xl font-semibold">{value}</div>
      <div className="mt-1 text-xs text-zinc-500">{detail}</div>
    </div>
  );
}
