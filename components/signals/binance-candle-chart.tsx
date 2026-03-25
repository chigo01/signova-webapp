"use client";

import { useEffect, useRef, useState } from "react";
import {
  createChart,
  ColorType,
  CandlestickSeries,
  type ISeriesApi,
  type CandlestickData,
  type UTCTimestamp,
} from "lightweight-charts";
import {
  pairToBinanceSymbol,
  timeframeToBinanceInterval,
} from "@/lib/binance-symbol";

type BinanceCandleChartProps = {
  /** Display pair e.g. "EUR/USD" — converted to a Binance symbol */
  pair: string;
  /** Same values as Signal Vault timeframes (1m, 1h, …) */
  timeframe: string;
  className?: string;
};

export function BinanceCandleChart({
  pair,
  timeframe,
  className,
}: BinanceCandleChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const chartRef = useRef<ReturnType<typeof createChart> | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const symbol = pairToBinanceSymbol(pair);
  const interval = timeframeToBinanceInterval(timeframe);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    setError(null);
    setLoading(true);

    const height = Math.max(container.clientHeight || 280, 240);
    const width = container.clientWidth || 320;

    const chart = createChart(container, {
      width,
      height,
      layout: {
        background: { type: ColorType.Solid, color: "#0F0F0F" },
        textColor: "#DDD",
      },
      grid: {
        vertLines: { color: "#222" },
        horzLines: { color: "#222" },
      },
      rightPriceScale: { borderColor: "#222" },
      timeScale: { borderColor: "#222" },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#26a69a",
      downColor: "#ef5350",
      borderVisible: false,
      wickUpColor: "#26a69a",
      wickDownColor: "#ef5350",
    });

    chartRef.current = chart;
    seriesRef.current = candleSeries;

    let cancelled = false;

    const loadHistory = async () => {
      try {
        const res = await fetch(
          `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=500`
        );
        if (!res.ok) {
          throw new Error(`Binance HTTP ${res.status}`);
        }
        const raw = (await res.json()) as [
          number,
          string,
          string,
          string,
          string,
        ][];
        if (cancelled) return;

        const formatted: CandlestickData[] = raw.map((d) => ({
          time: Math.floor(d[0] / 1000) as UTCTimestamp,
          open: parseFloat(d[1]),
          high: parseFloat(d[2]),
          low: parseFloat(d[3]),
          close: parseFloat(d[4]),
        }));

        candleSeries.setData(formatted);
        chart.timeScale().fitContent();
      } catch (e) {
        console.error("Binance klines error:", e);
        if (!cancelled) {
          setError("Could not load chart data. Using fallback symbol may help.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadHistory();

    const stream = `${symbol.toLowerCase()}@kline_${interval}`;
    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${stream}`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        type K = {
          t: number;
          o: string;
          h: string;
          l: string;
          c: string;
        };
        const raw = JSON.parse(event.data as string) as {
          k?: K;
          data?: { k?: K };
        };
        const k = raw.k ?? raw.data?.k;
        if (!k || !seriesRef.current) return;

        const update: CandlestickData = {
          time: Math.floor(k.t / 1000) as UTCTimestamp,
          open: parseFloat(k.o),
          high: parseFloat(k.h),
          low: parseFloat(k.l),
          close: parseFloat(k.c),
        };
        seriesRef.current.update(update);
      } catch {
        /* ignore malformed frames */
      }
    };

    ws.onerror = () => {
      if (!cancelled) {
        setError("WebSocket error — live updates may be unavailable.");
      }
    };

    const ro = new ResizeObserver(() => {
      if (!containerRef.current || !chartRef.current) return;
      const h = containerRef.current.clientHeight;
      chart.applyOptions({
        width: containerRef.current.clientWidth,
        height: Math.max(h, 240),
      });
    });
    ro.observe(container);

    const onWinResize = () => {
      if (!containerRef.current || !chartRef.current) return;
      chartRef.current.applyOptions({
        width: containerRef.current.clientWidth,
        height: Math.max(containerRef.current.clientHeight, 240),
      });
    };
    window.addEventListener("resize", onWinResize);

    return () => {
      cancelled = true;
      ro.disconnect();
      window.removeEventListener("resize", onWinResize);
      ws.close();
      wsRef.current = null;
      seriesRef.current = null;
      chart.remove();
      chartRef.current = null;
    };
  }, [symbol, interval, pair, timeframe]);

  return (
    <div
      className={`relative flex min-h-0 w-full flex-1 flex-col ${className ?? ""}`}
    >
      {loading && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-black/40">
          <span className="text-xs text-zinc-400">Loading chart…</span>
        </div>
      )}
      {error && (
        <div className="absolute left-2 top-2 z-10 rounded bg-red-950/80 px-2 py-1 text-[10px] text-red-200">
          {error}
        </div>
      )}
      <div className="px-1 pb-1 text-[10px] text-zinc-500 lg:text-[10px]">
        {pair} · {symbol} · {interval}
      </div>
      <div
        ref={containerRef}
        className="h-[min(42vh,380px)] w-full min-h-[280px] max-h-[420px] flex-1 sm:h-[min(50vh,480px)] sm:max-h-[520px] lg:h-auto lg:max-h-none lg:min-h-[400px]"
      />
    </div>
  );
}
