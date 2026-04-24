"use client";

import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  CircleAlert,
  Loader2,
  Minus,
  ShieldAlert,
  Target,
  Waves,
} from "lucide-react";
import {
  memo,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import {
  fetchPairAnalysis,
  formatForexPrice,
  getTradingViewDatafeedUrl,
  normalizeChartResolution,
  normalizeForexSymbol,
  PairAnalysisResponse,
  TRADINGVIEW_DATAFEED_SCRIPT,
  TRADINGVIEW_LIBRARY_PATH,
  TRADINGVIEW_LIBRARY_SCRIPT,
} from "@/lib/forex-analysis";
import { cn } from "@/lib/utils";
import type {
  TradingViewChartApi,
  TradingViewSubscription,
  TradingViewSymbolInfo,
  TradingViewWidgetHandle,
} from "@/types/tradingview-globals";

type ForexAdvancedChartProps = {
  symbol: string;
  interval?: string;
  theme?: "light" | "dark";
  analysisPreset?: string;
  className?: string;
  onSymbolChange?: (symbol: string) => void;
  onIntervalChange?: (interval: string) => void;
};

function loadExternalScript(src: string, id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.getElementById(id) as HTMLScriptElement | null;
    if (existing) {
      if (existing.dataset.loaded === "true") {
        resolve();
        return;
      }

      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error(`Failed to load script: ${src}`)),
        { once: true }
      );
      return;
    }

    const script = document.createElement("script");
    script.id = id;
    script.src = src;
    script.async = true;
    script.dataset.loaded = "false";
    script.onload = () => {
      script.dataset.loaded = "true";
      resolve();
    };
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.body.appendChild(script);
  });
}

async function ensureTradingViewRuntime(): Promise<void> {
  if (window.TradingView?.widget && window.Datafeeds?.UDFCompatibleDatafeed) {
    return;
  }

  if (!window.__tvAdvancedChartLoader__) {
    window.__tvAdvancedChartLoader__ = (async () => {
      await loadExternalScript(
        TRADINGVIEW_LIBRARY_SCRIPT,
        "signova-tv-charting-library"
      );
      await loadExternalScript(
        TRADINGVIEW_DATAFEED_SCRIPT,
        "signova-tv-udf-datafeed"
      );
    })();
  }

  return window.__tvAdvancedChartLoader__;
}

function biasClasses(bias: "buy" | "sell" | "neutral") {
  if (bias === "buy") {
    return "bg-emerald-500/15 text-emerald-300 border border-emerald-500/25";
  }
  if (bias === "sell") {
    return "bg-red-500/15 text-red-300 border border-red-500/25";
  }
  return "bg-zinc-800 text-zinc-300 border border-zinc-700";
}

function TrendIcon({ trend }: { trend: "bullish" | "bearish" | "sideways" }) {
  if (trend === "bullish") {
    return <ArrowUpRight className="h-4 w-4 text-emerald-400" />;
  }
  if (trend === "bearish") {
    return <ArrowDownRight className="h-4 w-4 text-red-400" />;
  }
  return <Minus className="h-4 w-4 text-zinc-400" />;
}

function ForexAdvancedChart({
  symbol,
  interval = "1D",
  theme = "dark",
  analysisPreset = "approved-signal",
  className,
  onSymbolChange,
  onIntervalChange,
}: ForexAdvancedChartProps) {
  const chartHostId = useId().replace(/:/g, "_");
  const widgetRef = useRef<TradingViewWidgetHandle | null>(null);
  const chartApiRef = useRef<TradingViewChartApi | null>(null);
  const overlayIdsRef = useRef<string[]>([]);
  const symbolSubscriptionRef = useRef<
    TradingViewSubscription<(symbol: TradingViewSymbolInfo) => void> | null
  >(null);
  const symbolHandlerRef = useRef<
    ((symbol: TradingViewSymbolInfo) => void) | null
  >(null);
  const intervalSubscriptionRef = useRef<
    TradingViewSubscription<(intervalValue: string, timeframe: unknown) => void> | null
  >(null);
  const intervalHandlerRef = useRef<
    ((intervalValue: string, timeframe: unknown) => void) | null
  >(null);
  const activeSymbolRef = useRef(normalizeForexSymbol(symbol));
  const activeIntervalRef = useRef(normalizeChartResolution(interval));
  const analysisRequestIdRef = useRef(0);
  const [activeSymbol, setActiveSymbol] = useState(activeSymbolRef.current);
  const [activeInterval, setActiveInterval] = useState(activeIntervalRef.current);
  const [analysis, setAnalysis] = useState<PairAnalysisResponse | null>(null);
  const [isChartLoading, setIsChartLoading] = useState(true);
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(true);
  const [chartError, setChartError] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const clearOverlays = useCallback(async () => {
    const chartApi = chartApiRef.current;
    if (!chartApi || overlayIdsRef.current.length === 0) return;

    for (const overlayId of overlayIdsRef.current) {
      try {
        chartApi.removeEntity(overlayId);
      } catch {
        // Ignore stale overlay ids during widget teardown/rebuild.
      }
    }

    overlayIdsRef.current = [];
  }, []);

  const drawOverlays = useCallback(
    async (payload: PairAnalysisResponse | null) => {
      const chartApi = chartApiRef.current;
      if (!chartApi) return;

      await clearOverlays();

      if (!payload || payload.overlays.length === 0) return;

      const now = Math.floor(Date.now() / 1000);
      const nextOverlayIds: string[] = [];

      for (const overlay of payload.overlays) {
        try {
          const entityId = await chartApi.createShape(
            { time: now, price: overlay.price },
            {
              shape: "horizontal_line",
              lock: true,
              disableSelection: true,
              disableSave: true,
              disableUndo: true,
              overrides: {
                linecolor: overlay.color,
                linewidth: overlay.emphasis === "primary" ? 2 : 1,
                linestyle: overlay.lineStyle === "dashed" ? 2 : 0,
              },
            }
          );
          nextOverlayIds.push(entityId);
        } catch (error) {
          console.warn("Failed to draw TradingView overlay", overlay, error);
        }
      }

      overlayIdsRef.current = nextOverlayIds;
    },
    [clearOverlays]
  );

  const refreshAnalysis = useCallback(
    async (nextSymbol: string, nextInterval: string) => {
      const requestId = analysisRequestIdRef.current + 1;
      analysisRequestIdRef.current = requestId;
      setIsAnalysisLoading(true);
      setAnalysisError(null);

      try {
        const payload = await fetchPairAnalysis(
          nextSymbol,
          nextInterval,
          analysisPreset
        );

        if (analysisRequestIdRef.current !== requestId) {
          return;
        }

        setAnalysis(payload);
        await drawOverlays(payload);
      } catch (error) {
        if (analysisRequestIdRef.current !== requestId) {
          return;
        }

        setAnalysis(null);
        setAnalysisError(
          error instanceof Error
            ? error.message
            : "Could not load backend forex analysis."
        );
        await drawOverlays(null);
      } finally {
        if (analysisRequestIdRef.current === requestId) {
          setIsAnalysisLoading(false);
        }
      }
    },
    [analysisPreset, drawOverlays]
  );

  useEffect(() => {
    let disposed = false;

    async function mountWidget() {
      setIsChartLoading(true);
      setChartError(null);

      try {
        await ensureTradingViewRuntime();
        if (disposed || !window.TradingView?.widget || !window.Datafeeds) {
          return;
        }

        const datafeed = new window.Datafeeds.UDFCompatibleDatafeed(
          getTradingViewDatafeedUrl(),
          10_000,
          {
            maxResponseLength: 1000,
            expectedOrder: "latestFirst",
          }
        );

        const widget = new window.TradingView.widget({
          symbol: activeSymbolRef.current,
          interval: activeIntervalRef.current,
          container: chartHostId,
          datafeed,
          library_path: TRADINGVIEW_LIBRARY_PATH,
          locale: "en",
          timezone: "Etc/UTC",
          autosize: true,
          fullscreen: false,
          theme,
          disabled_features: ["use_localstorage_for_settings"],
          enabled_features: ["study_templates"],
          favorites: {
            intervals: ["5", "15", "60", "240", "1D"],
          },
        });

        widgetRef.current = widget;

        widget.onChartReady(() => {
          if (disposed) return;

          const chartApi = widget.activeChart();
          chartApiRef.current = chartApi;

          const handleSymbolChanged = (symbolInfo: TradingViewSymbolInfo) => {
            const nextSymbol = normalizeForexSymbol(
              symbolInfo.ticker || symbolInfo.name || activeSymbolRef.current
            );
            activeSymbolRef.current = nextSymbol;
            setActiveSymbol(nextSymbol);
            onSymbolChange?.(nextSymbol);
            void refreshAnalysis(nextSymbol, activeIntervalRef.current);
          };

          const handleIntervalChanged = (intervalValue: string) => {
            const nextInterval = normalizeChartResolution(String(intervalValue));
            activeIntervalRef.current = nextInterval;
            setActiveInterval(nextInterval);
            onIntervalChange?.(nextInterval);
            void refreshAnalysis(activeSymbolRef.current, nextInterval);
          };

          const symbolSubscription = chartApi.onSymbolChanged();
          symbolSubscription.subscribe(null, handleSymbolChanged);
          symbolSubscriptionRef.current = symbolSubscription;
          symbolHandlerRef.current = handleSymbolChanged;

          const intervalSubscription = chartApi.onIntervalChanged();
          intervalSubscription.subscribe(null, handleIntervalChanged);
          intervalSubscriptionRef.current = intervalSubscription;
          intervalHandlerRef.current = handleIntervalChanged;

          setIsChartLoading(false);
          void refreshAnalysis(activeSymbolRef.current, activeIntervalRef.current);
        });
      } catch (error) {
        if (disposed) return;
        setChartError(
          error instanceof Error
            ? error.message
            : "Could not boot the TradingView chart."
        );
        setIsChartLoading(false);
      }
    }

    void mountWidget();

    return () => {
      disposed = true;

      if (symbolSubscriptionRef.current) {
        if (symbolHandlerRef.current) {
          symbolSubscriptionRef.current.unsubscribe(null, symbolHandlerRef.current);
        }
        symbolSubscriptionRef.current = null;
        symbolHandlerRef.current = null;
      }

      if (intervalSubscriptionRef.current) {
        if (intervalHandlerRef.current) {
          intervalSubscriptionRef.current.unsubscribe(null, intervalHandlerRef.current);
        }
        intervalSubscriptionRef.current = null;
        intervalHandlerRef.current = null;
      }

      void clearOverlays();
      chartApiRef.current = null;
      widgetRef.current?.remove();
      widgetRef.current = null;
    };
  }, [chartHostId, clearOverlays, onIntervalChange, onSymbolChange, refreshAnalysis, theme]);

  useEffect(() => {
    const nextSymbol = normalizeForexSymbol(symbol);
    const nextInterval = normalizeChartResolution(interval);
    activeSymbolRef.current = nextSymbol;
    activeIntervalRef.current = nextInterval;
    setActiveSymbol(nextSymbol);
    setActiveInterval(nextInterval);

    if (!widgetRef.current || !chartApiRef.current) {
      return;
    }

    widgetRef.current.setSymbol(nextSymbol, nextInterval, () => {
      void refreshAnalysis(nextSymbol, nextInterval);
    });
  }, [interval, refreshAnalysis, symbol]);

  const summary = analysis?.summary;

  return (
    <div
      className={cn(
        "grid h-full min-h-0 gap-3 lg:grid-cols-[minmax(0,1fr)_280px]",
        className
      )}
    >
      <section className="relative min-h-[320px] overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
        <div className="absolute left-3 top-3 z-10 flex items-center gap-2 rounded-full border border-zinc-800 bg-black/70 px-3 py-1.5 text-[11px] text-zinc-300 backdrop-blur">
          <span className="font-semibold text-white">{activeSymbol}</span>
          <span className="text-zinc-500">{activeInterval}</span>
        </div>

        <div id={chartHostId} className="h-full w-full" />

        {(isChartLoading || chartError) && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/55 backdrop-blur-[1px]">
            {chartError ? (
              <div className="flex max-w-sm items-start gap-3 rounded-2xl border border-red-500/20 bg-zinc-950/90 px-4 py-3 text-sm text-zinc-200">
                <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                <div>
                  <p className="font-semibold text-white">Chart unavailable</p>
                  <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                    {chartError}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-950/80 px-4 py-2 text-xs text-zinc-200">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading advanced chart…
              </div>
            )}
          </div>
        )}
      </section>

      <aside className="flex min-h-0 flex-col gap-3 overflow-y-auto rounded-2xl border border-zinc-800 bg-[#101010] p-3">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">
                Market bias
              </p>
              <div className="mt-2 flex items-center gap-2">
                {summary ? <TrendIcon trend={summary.trend} /> : <Activity className="h-4 w-4 text-zinc-500" />}
                <span className="text-sm font-semibold text-white">
                  {summary ? summary.trend : "Loading…"}
                </span>
              </div>
            </div>

            <span
              className={cn(
                "rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide",
                summary ? biasClasses(summary.bias) : "border border-zinc-700 bg-zinc-900 text-zinc-400"
              )}
            >
              {summary ? summary.bias : "pending"}
            </span>
          </div>

          {summary && (
            <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-zinc-400">
              <div>
                <p className="text-zinc-500">Last price</p>
                <p className="mt-1 font-mono text-sm text-white">
                  {formatForexPrice(activeSymbol, summary.lastPrice)}
                </p>
              </div>
              <div>
                <p className="text-zinc-500">Change</p>
                <p
                  className={cn(
                    "mt-1 font-mono text-sm",
                    summary.change >= 0 ? "text-emerald-400" : "text-red-400"
                  )}
                >
                  {summary.change >= 0 ? "+" : ""}
                  {formatForexPrice(activeSymbol, summary.change)} ({summary.changePercent}%)
                </p>
              </div>
              <div>
                <p className="text-zinc-500">ATR (14)</p>
                <p className="mt-1 font-mono text-sm text-white">
                  {formatForexPrice(activeSymbol, summary.atr14)}
                </p>
              </div>
              <div>
                <p className="text-zinc-500">Candles</p>
                <p className="mt-1 text-sm font-semibold text-white">
                  {summary.candles}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-3">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-zinc-500">
            <Waves className="h-4 w-4 text-zinc-500" />
            Key levels
          </div>

          {analysis?.overlays.length ? (
            <div className="mt-3 space-y-2">
              {analysis.overlays.map((overlay) => (
                <div
                  key={overlay.id}
                  className="flex items-center justify-between rounded-xl border border-zinc-800 bg-black/40 px-3 py-2 text-xs"
                >
                  <div className="flex items-center gap-2 text-zinc-300">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: overlay.color }}
                    />
                    <span>{overlay.label}</span>
                  </div>
                  <span className="font-mono text-white">
                    {formatForexPrice(activeSymbol, overlay.price)}
                  </span>
                </div>
              ))}
            </div>
          ) : isAnalysisLoading ? (
            <div className="mt-3 flex items-center gap-2 text-xs text-zinc-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading levels…
            </div>
          ) : (
            <p className="mt-3 text-xs text-zinc-500">No overlay levels available yet.</p>
          )}
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-3">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-zinc-500">
            <Target className="h-4 w-4 text-zinc-500" />
            Approved signal
          </div>

          {analysis?.signal ? (
            <div className="mt-3 space-y-3 text-xs text-zinc-300">
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Direction</span>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                    analysis.signal.direction === "BUY"
                      ? "bg-emerald-500/15 text-emerald-300"
                      : analysis.signal.direction === "SELL"
                        ? "bg-red-500/15 text-red-300"
                        : "bg-zinc-800 text-zinc-300"
                  )}
                >
                  {analysis.signal.direction}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-zinc-500">Entry</p>
                  <p className="mt-1 font-mono text-white">
                    {formatForexPrice(activeSymbol, analysis.signal.entryPrice)}
                  </p>
                </div>
                <div>
                  <p className="text-zinc-500">Confidence</p>
                  <p className="mt-1 font-semibold text-white">
                    {analysis.signal.confidence}%
                  </p>
                </div>
                <div>
                  <p className="text-zinc-500">Take profit</p>
                  <p className="mt-1 font-mono text-emerald-300">
                    {formatForexPrice(activeSymbol, analysis.signal.takeProfit1)}
                  </p>
                </div>
                <div>
                  <p className="text-zinc-500">Stop loss</p>
                  <p className="mt-1 font-mono text-red-300">
                    {formatForexPrice(activeSymbol, analysis.signal.stopLoss)}
                  </p>
                </div>
              </div>
              {analysis.signal.reasoning[0] && (
                <p className="rounded-xl border border-zinc-800 bg-black/40 px-3 py-2 leading-relaxed text-zinc-400">
                  {analysis.signal.reasoning[0]}
                </p>
              )}
            </div>
          ) : (
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-zinc-800 bg-black/40 px-3 py-2 text-xs text-zinc-500">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-zinc-600" />
              No approved signal is attached to this pair right now.
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-3">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-zinc-500">
            <Activity className="h-4 w-4 text-zinc-500" />
            Analyst notes
          </div>

          {analysisError ? (
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-200">
              <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
              {analysisError}
            </div>
          ) : isAnalysisLoading ? (
            <div className="mt-3 flex items-center gap-2 text-xs text-zinc-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Refreshing analysis…
            </div>
          ) : analysis?.notes.length ? (
            <div className="mt-3 space-y-2 text-xs leading-relaxed text-zinc-400">
              {analysis.notes.map((note) => (
                <p key={note} className="rounded-xl border border-zinc-800 bg-black/40 px-3 py-2">
                  {note}
                </p>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-xs text-zinc-500">No analysis notes yet.</p>
          )}
        </div>
      </aside>
    </div>
  );
}

export default memo(ForexAdvancedChart);
