"use client";

import { useEffect, useRef, useState } from "react";
import { createDatafeed, RESOLUTION_TO_MS } from "@/lib/trading-view-datafeed";

declare global {
  interface Window {
    TradingView?: {
      widget: new (config: Record<string, unknown>) => TradingViewWidgetInstance;
    };
  }
}

interface TradingViewWidgetInstance {
  onChartReady(cb: () => void): void;
  activeChart(): {
    createShape(
      point: { price: number; time?: number },
      options: Record<string, unknown>
    ): unknown;
    createStudy(
      name: string,
      forceOverlay: boolean,
      lock: boolean,
      inputs?: unknown[],
      overrides?: Record<string, unknown>
    ): unknown;
    setVisibleRange(
      range: { from: number; to: number },
      options?: Record<string, unknown>
    ): Promise<void> | void;
  };
  remove(): void;
}

export interface SignalLines {
  entryPrice: number;
  exitTargets: {
    stopLoss: number;
    takeProfit1: number;
    takeProfit2: number;
  };
}

interface TradingViewChartProps {
  symbol: string;
  interval?: string;
  signal?: SignalLines;
}

const TIMEFRAME_TO_RESOLUTION: Record<string, string> = {
  "1m": "1",
  "5m": "5",
  "15m": "15",
  "30m": "30",
  "1h": "60",
  "4h": "240",
  daily: "1D",
  D: "1D",
  "1D": "1D",
};

function mapInterval(tf: string | undefined): string {
  if (!tf) return "60";
  return TIMEFRAME_TO_RESOLUTION[tf] || tf;
}

let scriptPromise: Promise<void> | null = null;

function loadTradingViewScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("ssr"));
  if (window.TradingView) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-tradingview-loader="true"]'
    );
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Failed to load TradingView")));
      return;
    }

    const script = document.createElement("script");
    script.src = "/charting_library/charting_library.standalone.js";
    script.async = true;
    script.dataset.tradingviewLoader = "true";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load TradingView"));
    document.head.appendChild(script);
  });

  return scriptPromise;
}

export default function TradingViewChart({
  symbol,
  interval,
  signal,
}: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<TradingViewWidgetInstance | null>(null);
  const [isMobile, setIsMobile] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 1023px)").matches
  );

  // Re-create the widget with a mobile-optimized layout when crossing the
  // breakpoint (matches the `lg:` Tailwind breakpoint).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(max-width: 1023px)");
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    let disposed = false;

    loadTradingViewScript()
      .then(() => {
        if (disposed || !containerRef.current || !window.TradingView) return;

        const widget = new window.TradingView.widget({
          container: containerRef.current,
          library_path: "/charting_library/",
          symbol,
          interval: mapInterval(interval),
          datafeed: createDatafeed(symbol),
          autosize: true,
          theme: "Dark",
          locale: "en",
          timezone: "Etc/UTC",
          fullscreen: false,
          debug: false,
          disabled_features: [
            "use_localstorage_for_settings",
            // On mobile, strip the chrome so candles fill the screen like the
            // TradingView app (the page supplies a fixed symbol + interval).
            ...(isMobile
              ? [
                  "header_widget",
                  "timeframes_toolbar",
                  "control_bar",
                  "legend_widget",
                ]
              : []),
          ],
          enabled_features: ["hide_left_toolbar_by_default"],
          overrides: {
            "paneProperties.background": "#09090b",
            "paneProperties.backgroundType": "solid",
            "paneProperties.vertGridProperties.color": "#1f1f23",
            "paneProperties.horzGridProperties.color": "#1f1f23",
            "scalesProperties.textColor": "#a1a1aa",
          },
          studies_overrides: {
            "volume.volume.color.0": "#ef5350",
            "volume.volume.color.1": "#26a69a",
            "volume.volume.transparency": 70,
            "volume.volume ma.visible": false,
          },
        });
        widgetRef.current = widget;

        widget.onChartReady(() => {
          if (disposed) return;
          const chart = widget.activeChart();

          // Volume histogram (datafeed already returns volume per bar).
          try {
            chart.createStudy("Volume", false, false);
          } catch (err) {
            console.error("[TradingViewChart] failed to add volume study", err);
          }

          // Comfortable default zoom: show roughly the last ~55 bars so candles
          // render wide like the TradingView app instead of hundreds of thin
          // bars crammed across the width.
          try {
            const stepMs = RESOLUTION_TO_MS[mapInterval(interval)];
            if (stepMs) {
              const barsToShow = isMobile ? 55 : 90;
              const to = Math.floor(Date.now() / 1000);
              const from = to - Math.floor((stepMs / 1000) * barsToShow);
              chart.setVisibleRange({ from, to });
            }
          } catch (err) {
            console.error("[TradingViewChart] failed to set visible range", err);
          }

          if (signal) {
            try {
              const lines: Array<{ price: number; color: string; label: string }> = [
                { price: signal.entryPrice, color: "#ffffff", label: "Entry" },
                { price: signal.exitTargets.stopLoss, color: "#f43f5e", label: "SL" },
                { price: signal.exitTargets.takeProfit1, color: "#10b981", label: "TP1" },
                { price: signal.exitTargets.takeProfit2, color: "#34d399", label: "TP2" },
              ];
              for (const line of lines) {
                chart.createShape(
                  { price: line.price },
                  {
                    shape: "horizontal_line",
                    lock: true,
                    disableSelection: true,
                    disableSave: true,
                    overrides: {
                      linecolor: line.color,
                      linestyle: 0,
                      linewidth: 1,
                      showLabel: true,
                      text: line.label,
                      textcolor: line.color,
                      horzLabelsAlign: "right",
                      vertLabelsAlign: "middle",
                    },
                  }
                );
              }
            } catch (err) {
              console.error("[TradingViewChart] failed to draw price lines", err);
            }
          }
        });
      })
      .catch((err) => {
        console.error("[TradingViewChart] script load failed", err);
      });

    return () => {
      disposed = true;
      try {
        widgetRef.current?.remove();
      } catch {
        // ignore teardown errors
      }
      widgetRef.current = null;
    };
  }, [
    symbol,
    interval,
    isMobile,
    signal?.entryPrice,
    signal?.exitTargets.stopLoss,
    signal?.exitTargets.takeProfit1,
    signal?.exitTargets.takeProfit2,
  ]);

  return (
    <div className="h-full w-full overflow-hidden rounded-lg border border-[#1D1D1D] bg-[#121212]">
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}
