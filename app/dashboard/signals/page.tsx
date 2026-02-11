"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  createChart,
  ColorType,
  LineStyle,
  CandlestickSeries,
} from "lightweight-charts";
import {
  Search,
  RefreshCw,
  Play,
  Loader2,
  Target,
  ShieldAlert,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Signal } from "@/types/signal";
import {
  fetchApprovedSignals,
  fetchPairSignals,
  playSignal,
  ChartDataPoint,
} from "@/lib/signals";
import Link from "next/link";

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

// Fallback dummy chart data
const dummyData: ChartDataPoint[] = Array.from({ length: 200 }, (_, i) => {
  const d = new Date(2025, 0, 1);
  d.setDate(d.getDate() + i);
  const time = d.toISOString().split("T")[0];
  const basePrice = 300 + Math.sin(i / 10) * 50 + Math.random() * 30;
  return {
    time,
    open: basePrice,
    high: basePrice + Math.random() * 10,
    low: basePrice - Math.random() * 10,
    close: basePrice + (Math.random() - 0.5) * 20,
  };
});

/* ─── Chart Component ─── */
function SignalVaultChart({
  data,
  height = 500,
}: {
  data: ChartDataPoint[];
  height?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height,
      layout: {
        background: { type: ColorType.Solid, color: "#0B0B0B" },
        textColor: "#A0A0A0",
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.04)" },
        horzLines: { color: "rgba(255,255,255,0.04)" },
      },
      crosshair: {
        mode: 1,
        horzLine: {
          color: "rgba(0, 255, 255, 0.3)",
          style: LineStyle.Dotted,
          width: 1,
        },
        vertLine: {
          color: "rgba(0, 255, 255, 0.3)",
          style: LineStyle.Dotted,
          width: 1,
        },
      },
      rightPriceScale: {
        borderColor: "rgba(0,0,0,0)",
      },
      timeScale: {
        borderColor: "rgba(0,0,0,0)",
      },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#0ee8c8",
      downColor: "#ff477a",
      wickUpColor: "#0ee8c8",
      wickDownColor: "#ff477a",
      borderVisible: false,
    });

    candleSeries.setData(data);

    // Horizontal dotted price line at last close
    if (data.length > 0) {
      candleSeries.createPriceLine({
        price: data[data.length - 1].close,
        color: "#00E5D4",
        lineWidth: 2,
        lineStyle: LineStyle.Dotted,
        axisLabelVisible: true,
        title: "",
      });
    }

    chart.timeScale().fitContent();

    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [data, height]);

  return (
    <div ref={containerRef} style={{ width: "100%", height: `${height}px` }} />
  );
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
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-4">
      {/* Header: Pair + Confidence */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-bold text-white">{signal.pair}</h3>
          <span className={`text-xs font-bold ${directionColor}`}>
            {signal.direction}
          </span>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-zinc-500">Confidence</span>
          <p className="text-xs font-mono text-white">{signal.confidence}%</p>
        </div>
      </div>

      {/* Entry Price */}
      <div className="flex items-center justify-between rounded-lg bg-zinc-800/60 px-3 py-2 mb-3">
        <span className="text-xs text-zinc-400">Entry</span>
        <span className="text-xs font-mono text-white">
          {signal.entryPrice}
        </span>
      </div>

      {/* TP1 & SL */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2">
          <div className="flex items-center gap-1.5 mb-1">
            <Target className="w-3 h-3 text-emerald-400" />
            <span className="text-[10px] font-semibold text-emerald-400">
              TP1
            </span>
          </div>
          <span className="text-xs font-mono text-white block text-center">
            {signal.exitTargets.takeProfit1}
          </span>
        </div>
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2">
          <div className="flex items-center gap-1.5 mb-1">
            <ShieldAlert className="w-3 h-3 text-red-400" />
            <span className="text-[10px] font-semibold text-red-400">SL</span>
          </div>
          <span className="text-xs font-mono text-white block text-center">
            {signal.exitTargets.stopLoss}
          </span>
        </div>
      </div>

      {/* Reasoning */}
      {signal.reasoning && signal.reasoning.length > 0 && (
        <p className="text-[11px] text-zinc-500 mb-3 line-clamp-2">
          {signal.reasoning[0]}
        </p>
      )}

      {/* Play Button */}
      <button
        onClick={handlePlay}
        disabled={isPlaying}
        className="w-full flex items-center justify-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800/80 px-3 py-2.5 text-xs font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50"
      >
        {isPlaying ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Play className="w-3.5 h-3.5 fill-current" />
        )}
        {isPlaying ? "Playing..." : "Play Signal"}
      </button>
    </div>
  );
}

/* ─── Main Page ─── */
export default function SignalVaultPage() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [chartData, setChartData] = useState<ChartDataPoint[]>(dummyData);
  const [selectedTimeframe, setSelectedTimeframe] = useState("1h");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoadingSignals, setIsLoadingSignals] = useState(true);
  const [isLoadingChart, setIsLoadingChart] = useState(false);
  const [selectedPair, setSelectedPair] = useState("EUR/USD");

  // Fetch signals on mount
  const loadSignals = useCallback(async () => {
    try {
      setIsLoadingSignals(true);
      const data = await fetchApprovedSignals();
      setSignals(data);

      // Load chart for the first signal's pair
      if (data.length > 0) {
        setSelectedPair(data[0].pair);
        loadChartData(data[0].pair, selectedTimeframe);
      }
    } catch (error) {
      console.error("Failed to load signals:", error);
    } finally {
      setIsLoadingSignals(false);
    }
  }, []);

  const loadChartData = async (pair: string, period: string) => {
    try {
      setIsLoadingChart(true);
      const formattedPair = pair.replace("/", "-");
      const data = await fetchPairSignals(formattedPair, period);
      if (data.length > 0) {
        setChartData(data);
      }
    } catch (error) {
      console.error("Failed to load chart data:", error);
      // Keep dummy data as fallback
    } finally {
      setIsLoadingChart(false);
    }
  };

  useEffect(() => {
    loadSignals();
  }, [loadSignals]);

  const handleTimeframeChange = (tf: string) => {
    setSelectedTimeframe(tf);
    loadChartData(selectedPair, tf);
  };

  const handleSignalPlay = (signal: Signal) => {
    // Could show a toast notification here
    console.log("Signal played:", signal.pair);
  };

  return (
    <main className="ml-64 flex-1 overflow-y-auto">
      <div className="flex h-screen flex-col">
        {/* ─── Header ─── */}
        <header className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
          <h3 className="text-lg font-semibold text-white">Signal vault</h3>

          <div className="relative hidden md:block">
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
              className="rounded-full bg-white text-black hover:bg-zinc-200 text-xs px-4"
            >
              Watch tutorials
            </Button>
          </Link>
        </header>

        {/* ─── Body: Chart + Signals ─── */}
        <div className="flex flex-1 overflow-hidden">
          {/* ─── Left: Chart Area ─── */}
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Timeframe Selector */}
            <div className="flex items-center gap-1 border-b border-zinc-800 px-6 py-3">
              <span className="mr-2 text-xs text-zinc-500">Time frame:</span>
              {timeframes.map((tf) => (
                <button
                  key={tf.value}
                  onClick={() => handleTimeframeChange(tf.value)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                    selectedTimeframe === tf.value
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                  }`}
                >
                  {tf.label}
                </button>
              ))}
              {/* Period Dropdown */}
              <button className="ml-1 flex items-center gap-1 rounded-md px-2.5 py-1 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">
                2m
                <ChevronDown className="h-3 w-3" />
              </button>
            </div>

            {/* Chart */}
            <div className="relative flex-1 px-2">
              {isLoadingChart && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50">
                  <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
                </div>
              )}
              <SignalVaultChart data={chartData} height={600} />
            </div>
          </div>

          {/* ─── Right: Active Signals Panel ─── */}
          <div className="w-80 shrink-0 border-l border-zinc-800 flex flex-col overflow-hidden bg-zinc-950/50">
            {/* Panel Header */}
            <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
              <h2 className="text-sm font-semibold text-white">
                Active Signals
              </h2>
              <button
                onClick={loadSignals}
                disabled={isLoadingSignals}
                className="rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-4 w-4 ${
                    isLoadingSignals ? "animate-spin" : ""
                  }`}
                />
              </button>
            </div>

            {/* Signal Cards */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {isLoadingSignals && signals.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
                  <Loader2 className="h-6 w-6 animate-spin mb-2" />
                  <p className="text-xs">Loading signals...</p>
                </div>
              ) : signals.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <RefreshCw className="h-8 w-8 text-zinc-600 mb-3" />
                  <p className="text-sm text-zinc-400 font-medium mb-1">
                    No signals available
                  </p>
                  <p className="text-xs text-zinc-600 mb-4">
                    Check back later for new trading opportunities.
                  </p>
                  <Button
                    onClick={loadSignals}
                    variant="outline"
                    size="sm"
                    className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                  >
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
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
          </div>
        </div>
      </div>
    </main>
  );
}
