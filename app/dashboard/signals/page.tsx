"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Search,
  RefreshCw,
  Play,
  Loader2,
  Target,
  ShieldAlert,
  ChevronDown,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Signal } from "@/types/signal";
import { fetchApprovedSignals, playSignal } from "@/lib/signals";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { BinanceCandleChart } from "@/components/signals/binance-candle-chart";

/** Shown first; union with signals’ pairs so the current selection always appears */
const POPULAR_PAIRS = [
  "EUR/USD",
  "GBP/USD",
  "USD/JPY",
  "AUD/USD",
  "USD/CHF",
  "NZD/USD",
  "USD/CAD",
  "XAU/USD",
  "BTC/USDT",
  "ETH/USDT",
  "BNB/USDT",
  "SOL/USDT",
] as const;

// Timeframe options
const timeframes = [
  { label: "1m", value: "1m" },
  { label: "5m", value: "5m" },
  { label: "15m", value: "15m" },
  { label: "30m", value: "30m" },
  { label: "1h", value: "1h" },
  { label: "2h", value: "2h" },
  { label: "4h", value: "4h" },
  { label: "D", value: "1d" },
  { label: "W", value: "1w" },
  { label: "M", value: "1M" },
  { label: "All", value: "all" },
];

/** Mobile mock: 1m … 4h in a single scroll row */
const MOBILE_TIMEFRAME_VALUES = new Set([
  "1m",
  "5m",
  "15m",
  "30m",
  "1h",
  "2h",
  "4h",
]);

function formatConfidenceDisplay(confidence: number): string {
  if (confidence > 0 && confidence <= 1) {
    return `${(confidence * 100).toFixed(2)}%`;
  }
  if (confidence > 1 && confidence <= 100) {
    return `${confidence.toFixed(2)}%`;
  }
  return `${confidence}%`;
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
    <div className="rounded-xl border border-zinc-800/90 bg-[#1a1a1a] p-4">
      {/* Row 1: pair | Confidence label */}
      <div className="mb-2 flex items-start justify-between gap-2">
        <h3 className="text-sm font-bold text-white">{signal.pair}</h3>
        <span className="text-[10px] font-medium text-zinc-500">Confidence</span>
      </div>
      {/* Row 2: direction | confidence value */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className={`text-xs font-bold ${directionColor}`}>
          {signal.direction}
        </span>
        <span className="text-xs font-mono text-white">
          {formatConfidenceDisplay(signal.confidence)}
        </span>
      </div>

      {/* Entry Price */}
      <div className="mb-3 flex items-center justify-between rounded-lg bg-zinc-900/80 px-3 py-2.5">
        <span className="text-xs text-zinc-400">Entry</span>
        <span className="text-xs font-mono text-white">
          {signal.entryPrice}
        </span>
      </div>

      {/* TP1 & SL */}
      <div className="mb-3 grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-emerald-500/25 bg-emerald-950/40 px-3 py-2.5">
          <div className="mb-1 flex items-center gap-1.5">
            <Target className="h-3 w-3 text-emerald-400" />
            <span className="text-[10px] font-semibold text-emerald-400">
              TP1
            </span>
          </div>
          <span className="block text-center text-xs font-mono text-white">
            {signal.exitTargets.takeProfit1}
          </span>
        </div>
        <div className="rounded-lg border border-red-500/25 bg-red-950/40 px-3 py-2.5">
          <div className="mb-1 flex items-center gap-1.5">
            <ShieldAlert className="h-3 w-3 text-red-400" />
            <span className="text-[10px] font-semibold text-red-400">SL</span>
          </div>
          <span className="block text-center text-xs font-mono text-white">
            {signal.exitTargets.stopLoss}
          </span>
        </div>
      </div>

      {/* Reasoning */}
      {signal.reasoning && signal.reasoning.length > 0 && (
        <p className="mb-3 line-clamp-3 text-[11px] leading-relaxed text-zinc-500">
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
  const [selectedTimeframe, setSelectedTimeframe] = useState("1h");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoadingSignals, setIsLoadingSignals] = useState(true);
  /** Set when fetch throws so we show the same refresh affordances as empty state */
  const [signalsLoadError, setSignalsLoadError] = useState<string | null>(null);
  const [selectedPair, setSelectedPair] = useState("EUR/USD");

  const pairOptions = useMemo(() => {
    const seen = new Set<string>(POPULAR_PAIRS as readonly string[]);
    const extras: string[] = [];
    if (selectedPair && !seen.has(selectedPair)) {
      extras.push(selectedPair);
      seen.add(selectedPair);
    }
    signals.forEach((s) => {
      if (!seen.has(s.pair)) {
        extras.push(s.pair);
        seen.add(s.pair);
      }
    });
    extras.sort((a, b) => a.localeCompare(b));
    return [...POPULAR_PAIRS, ...extras];
  }, [selectedPair, signals]);

  const loadSignals = useCallback(async () => {
    try {
      setIsLoadingSignals(true);
      setSignalsLoadError(null);
      const data = await fetchApprovedSignals();
      setSignals(data);

      if (data.length > 0) {
        setSelectedPair(data[0].pair);
      }
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

  const handlePairChange = (pair: string) => {
    setSelectedPair(pair);
  };

  const handleTimeframeChange = (tf: string) => {
    setSelectedTimeframe(tf);
  };

  const handleSignalPlay = (signal: Signal) => {
    // Could show a toast notification here
    console.log("Signal played:", signal.pair);
  };

  const mobileTimeframeList = useMemo(() => {
    const list = timeframes.filter((tf) => MOBILE_TIMEFRAME_VALUES.has(tf.value));
    if (!list.some((tf) => tf.value === selectedTimeframe)) {
      const extra = timeframes.find((tf) => tf.value === selectedTimeframe);
      if (extra) return [extra, ...list];
    }
    return list;
  }, [selectedTimeframe]);

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

      <div
        className={cn(
          "space-y-4 p-4 pb-8 lg:min-h-0 lg:flex-1 lg:pb-4",
          signals.length > 0
            ? "max-h-[52vh] overflow-y-auto sm:max-h-[56vh] lg:max-h-none lg:overflow-y-auto"
            : "min-h-[min(260px,50vh)] lg:overflow-y-auto"
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
    <main className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden bg-black">
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

      {/* Pair + timeframes */}
      <div className="border-b border-zinc-800 px-4 py-3 lg:px-6">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span className="shrink-0 text-xs text-zinc-500">Pair</span>
            <select
              value={selectedPair}
              onChange={(e) => handlePairChange(e.target.value)}
              aria-label="Currency pair"
              className="h-10 min-w-0 flex-1 cursor-pointer rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/40 lg:h-8 lg:min-w-32 lg:rounded-md lg:text-xs"
            >
              {pairOptions.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Mobile: horizontal scroll, pill selected state (dark gray) */}
        <div className="lg:hidden">
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {mobileTimeframeList.map((tf) => (
              <button
                key={tf.value}
                type="button"
                onClick={() => handleTimeframeChange(tf.value)}
                className={cn(
                  "shrink-0 rounded-full px-3.5 py-2 text-xs font-medium transition-colors",
                  selectedTimeframe === tf.value
                    ? "bg-zinc-700 text-white"
                    : "bg-transparent text-zinc-500 hover:text-zinc-300"
                )}
              >
                {tf.label}
              </button>
            ))}
          </div>
        </div>

        {/* Desktop: full timeframe row */}
        <div className="mt-2 hidden flex-wrap items-center gap-x-2 gap-y-2 lg:flex">
          <span className="mr-1 text-xs text-zinc-500">Time frame:</span>
          {timeframes.map((tf) => (
            <button
              key={tf.value}
              type="button"
              onClick={() => handleTimeframeChange(tf.value)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                selectedTimeframe === tf.value
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
              )}
            >
              {tf.label}
            </button>
          ))}
          <button
            type="button"
            className="ml-1 flex items-center gap-1 rounded-md px-2.5 py-1 text-xs text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
          >
            2m
            <ChevronDown className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Mobile: chart first, Active Signals below; desktop: chart | sidebar */}
      <div className="flex min-h-0 flex-col lg:min-h-[min(720px,calc(100vh-11rem))] lg:flex-1 lg:flex-row lg:overflow-hidden">
        {/* Chart column */}
        <section className="flex min-h-0 flex-col lg:min-h-0 lg:flex-1">
          <div className="relative flex min-h-0 flex-1 flex-col px-2 pb-2 pt-1 lg:min-h-0">
            <BinanceCandleChart
              key={`${selectedPair}-${selectedTimeframe}`}
              pair={selectedPair}
              timeframe={selectedTimeframe}
            />
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
        <aside className="mt-1 flex min-h-0 flex-col rounded-t-2xl border border-zinc-800/90 bg-[#121212] lg:mt-0 lg:w-80 lg:shrink-0 lg:rounded-none lg:border-b-0 lg:border-l lg:border-t-0 lg:bg-zinc-950/50">
          <div className="lg:flex lg:min-h-0 lg:flex-1 lg:flex-col lg:overflow-hidden">
            {signalsPanel}
          </div>
        </aside>
      </div>
    </main>
  );
}
