"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Search,
  RefreshCw,
  Play,
  Loader2,
  Target,
  ShieldAlert,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Signal } from "@/types/signal";
import { fetchApprovedSignals, playSignal } from "@/lib/signals";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { pairToTradingViewSymbol } from "@/lib/tradingview-symbol";
import TradingViewWidget from "@/components/signals/tradingview-widget";

function formatLevelValue(value: number): string {
  // Keep signal levels compact so they never overflow the TP/SL boxes.
  if (!Number.isFinite(value)) return String(value);
  if (Math.abs(value) >= 100) return value.toFixed(3);
  if (Math.abs(value) >= 1) return value.toFixed(6);
  return value.toFixed(8);
}

/* ─── Signal Card (matches image design) ─── */
function VaultSignalCard({
  signal,
  onPlay,
}: {
  signal: Signal;
  onPlay: (signal: Signal) => void;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const isBuy = signal.direction === "BUY";
  const directionColor = isBuy ? "text-emerald-400" : "text-red-400";

  const handlePlay = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setIsPlaying(true);
      await playSignal(signal);
      onPlay(signal);
    } catch (error) {
      console.error("Failed to play signal:", error);
    } finally {
      setIsPlaying(false);
    }
  };

  return (
    <div className="flex flex-col gap-[14px] rounded-[8px] border border-[#1D1D1D] bg-[#121212] px-[13px] py-[14px]">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-white">{signal.pair}</h3>
        <span className={`text-xs font-bold ${directionColor}`}>
          {signal.direction}
        </span>
      </div>

      {/* Entry Price */}
      <div className="flex items-center justify-between rounded-lg bg-zinc-900/80 px-3 py-2.5">
        <span className="text-xs text-zinc-400">Entry</span>
        <span className="text-xs font-mono text-white">
          {signal.entryPrice}
        </span>
      </div>

      {/* TP1 & SL */}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col items-center justify-center gap-[10px] rounded-[4px] border border-[#10C29C]/30 bg-[#10C29C]/10 p-[8px] text-center">
          <div className="flex items-center gap-1.5">
            <Target className="h-3 w-3 text-emerald-400" />
            <span className="text-[10px] font-semibold text-emerald-400">
              TP1
            </span>
          </div>
          <span
            className="block w-full truncate text-center text-xs font-mono text-white"
            title={String(signal.exitTargets.takeProfit1)}
          >
            {formatLevelValue(signal.exitTargets.takeProfit1)}
          </span>
        </div>
        <div className="flex flex-col items-center justify-center gap-[10px] rounded-[4px] border border-[#F63B6B]/30 bg-[#F63B6B]/10 p-[8px] text-center">
          <div className="flex items-center gap-1.5">
            <ShieldAlert className="h-3 w-3 text-red-400" />
            <span className="text-[10px] font-semibold text-red-400">SL</span>
          </div>
          <span
            className="block w-full truncate text-center text-xs font-mono text-white"
            title={String(signal.exitTargets.stopLoss)}
          >
            {formatLevelValue(signal.exitTargets.stopLoss)}
          </span>
        </div>
      </div>

      {/* Reasoning */}
      {signal.reasoning && signal.reasoning.length > 0 && (
        <p className="line-clamp-3 text-[11px] leading-relaxed text-zinc-500">
          {signal.reasoning[0]}
        </p>
      )}

      {/* Play Button — white pill, dark icon (mobile mock) */}
      <button
        type="button"
        onClick={handlePlay}
        disabled={isPlaying}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-3 py-3 text-xs font-semibold text-black transition-colors hover:bg-zinc-200 disabled:opacity-50"
      >
        {isPlaying ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Play className="h-4 w-4 fill-current text-black" />
        )}
        {isPlaying ? "Playing..." : "Play Signal"}
      </button>
    </div>
  );
}

/* ─── Main Page ─── */
export default function SignalVaultPage() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoadingSignals, setIsLoadingSignals] = useState(true);
  /** Set when fetch throws so we show the same refresh affordances as empty state */
  const [signalsLoadError, setSignalsLoadError] = useState<string | null>(null);
  const [chartSymbol, setChartSymbol] = useState("OANDA:EURUSD");

  const loadSignals = useCallback(async () => {
    try {
      setIsLoadingSignals(true);
      setSignalsLoadError(null);
      const data = await fetchApprovedSignals();
      setSignals(data);
    } catch (error) {
      console.error("Failed to load signals:", error);
      setSignals([]);
      setSignalsLoadError(
        error instanceof Error
          ? error.message
          : "Couldn’t load signals. Try again."
      );
    } finally {
      setIsLoadingSignals(false);
    }
  }, []);

  useEffect(() => {
    loadSignals();
  }, [loadSignals]);

  const handleSignalPlay = (signal: Signal) => {
    setChartSymbol(pairToTradingViewSymbol(signal.pair));
  };

  const signalsPanel = (
    <>
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3 lg:px-4">
        <h2 className="text-sm font-semibold text-white">Active Signals</h2>
        <button
          type="button"
          onClick={loadSignals}
          disabled={isLoadingSignals}
          className="rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white disabled:opacity-50"
          aria-label="Refresh signals"
        >
          <RefreshCw
            className={cn("h-4 w-4", isLoadingSignals && "animate-spin")}
          />
        </button>
      </div>

      <div className="border-b border-zinc-800/70 px-4 py-2 lg:px-4">
        <Link
          href="/dashboard/history"
          className="text-[11px] font-medium text-zinc-500 transition-colors hover:text-zinc-300"
        >
          View signal history
        </Link>
      </div>

      <div
        className={cn(
          "space-y-4 p-4 pb-8 lg:min-h-0 lg:flex-1 lg:pb-4",
          signals.length > 0
            ? "max-h-[72vh] overflow-y-auto sm:max-h-[76vh] lg:max-h-full lg:overflow-y-auto"
            : "min-h-[min(260px,50vh)] lg:max-h-full lg:overflow-y-auto"
        )}
      >
        {isLoadingSignals && signals.length === 0 && !signalsLoadError ? (
          <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
            <Loader2 className="mb-2 h-6 w-6 animate-spin" />
            <p className="text-xs">Loading signals...</p>
          </div>
        ) : signals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center sm:py-12">
            {signalsLoadError ? (
              <>
                <AlertCircle className="mb-3 h-10 w-10 text-amber-500/90" />
                <p className="mb-1 text-sm font-medium text-white">
                  Couldn&apos;t load signals
                </p>
                <p className="mb-4 max-w-[280px] text-xs leading-relaxed text-zinc-500">
                  {signalsLoadError}
                </p>
              </>
            ) : (
              <>
                <RefreshCw className="mb-3 h-8 w-8 text-zinc-600" />
                <p className="mb-1 text-sm font-medium text-zinc-400">
                  No signals available
                </p>
                <p className="mb-4 text-xs text-zinc-600">
                  Check back later for new trading opportunities.
                </p>
              </>
            )}
            <Button
              type="button"
              onClick={() => void loadSignals()}
              variant="outline"
              size="sm"
              className="border-zinc-600 bg-transparent text-white hover:bg-zinc-800"
            >
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Refresh
            </Button>
          </div>
        ) : (
          signals.map((signal) => (
            <VaultSignalCard
              key={signal._id}
              signal={signal}
              onPlay={handleSignalPlay}
            />
          ))
        )}
      </div>
    </>
  );

  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden bg-black lg:overflow-hidden">
      {/* Desktop top bar */}
      <header className="hidden items-center justify-between border-b border-zinc-800 px-6 py-4 lg:flex">
        <h3 className="text-lg font-semibold text-white">Signal vault</h3>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="USDT/GOLD"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 w-56 rounded-full bg-zinc-900 pl-10 pr-4 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-700"
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
      </header>

      {/* Mobile: title (layout already has logo bar) */}
      <div className="border-b border-zinc-800 px-4 py-3 lg:hidden">
        <h1 className="text-base font-semibold text-white">Signal vault</h1>
      </div>

      {/* Mobile: chart first, Active Signals below; desktop: chart | sidebar */}
      <div className="flex min-h-0 flex-col px-3 lg:h-[calc(100dvh-5.5rem)] lg:flex-row lg:overflow-hidden lg:px-0">
        {/* Chart column */}
        <section className="flex min-h-0 flex-col lg:h-full lg:min-h-0 lg:flex-1">
          <div className="relative flex min-h-0 flex-1 flex-col px-2 pb-2 pt-1 lg:h-full lg:min-h-0">
            <div className="h-[min(42vh,380px)] max-h-[420px] min-h-[280px] w-full flex-1 sm:h-[min(50vh,480px)] sm:max-h-[520px] lg:h-full lg:max-h-[760px] lg:min-h-[400px]">
              <TradingViewWidget symbol={chartSymbol} interval="D" />
            </div>
          </div>

          {/* Mobile: Watch tutorials under chart */}
          <div className="flex justify-center px-4 py-3 lg:hidden">
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
        </section>

        {/* Active signals — full width card on mobile, sidebar on desktop */}
        <aside className="mt-1 flex min-h-0 flex-col rounded-2xl border border-zinc-800/90 bg-[#121212] lg:mt-0 lg:h-full lg:w-80 lg:shrink-0 lg:rounded-none lg:border-b-0 lg:border-l lg:border-t-0 lg:bg-zinc-950/50">
          <div className="lg:flex lg:h-full lg:min-h-0 lg:flex-1 lg:flex-col lg:overflow-hidden">
            {signalsPanel}
          </div>
        </aside>
      </div>
    </main>
  );
}
