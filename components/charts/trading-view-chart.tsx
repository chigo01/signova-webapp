"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createDatafeed } from "@/lib/trading-view-datafeed";
import { createSaveLoadAdapter } from "@/lib/trading-view-save-load-adapter";
import { getAuthUserProfile } from "@/lib/auth-user";
import {
  getDefaultStudyTemplate,
  listStudyTemplatesWithDefault,
  setDefaultStudyTemplate,
  type StudyTemplateSummary,
} from "@/lib/chart-presets";

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
    applyStudyTemplate(template: object): void;
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
  // When true, show the "default analysis preset" picker and auto-apply the
  // trader's default indicator template on every new signal/symbol.
  showPresetControls?: boolean;
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

// Apply a saved study-template `content` string (JSON) to the current chart.
// Study templates are symbol-agnostic, so this layers the trader's indicators
// onto whatever symbol is loaded without switching symbols.
function applyTemplateContent(
  widget: TradingViewWidgetInstance,
  content: string
): void {
  try {
    const parsed = JSON.parse(content) as object;
    widget.activeChart().applyStudyTemplate(parsed);
  } catch (err) {
    console.error("[TradingViewChart] failed to apply study template", err);
  }
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
  showPresetControls = false,
}: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<TradingViewWidgetInstance | null>(null);

  const [templates, setTemplates] = useState<StudyTemplateSummary[]>([]);
  const defaultName = templates.find((t) => t.isDefault)?.name ?? "";

  const refreshTemplates = useCallback(() => {
    if (!showPresetControls) return;
    listStudyTemplatesWithDefault().then(setTemplates).catch(() => {});
  }, [showPresetControls]);

  useEffect(() => {
    refreshTemplates();
  }, [refreshTemplates]);

  const handleSelectDefault = useCallback(
    async (name: string) => {
      if (!name) return;
      try {
        await setDefaultStudyTemplate(name);
        // Reflect the change locally and apply it to the live chart now.
        setTemplates((prev) =>
          prev.map((t) => ({ ...t, isDefault: t.name === name }))
        );
        const tpl = await getDefaultStudyTemplate();
        const widget = widgetRef.current;
        if (tpl && widget) applyTemplateContent(widget, tpl.content);
      } catch (err) {
        console.error("[TradingViewChart] failed to set default template", err);
      }
    },
    []
  );

  useEffect(() => {
    let disposed = false;

    loadTradingViewScript()
      .then(() => {
        if (disposed || !containerRef.current || !window.TradingView) return;

        // Stable per-user id so saved layouts associate correctly in the UI.
        // All persistence is scoped server-side by the JWT, so this value is
        // only used by the library to namespace the save/load experience.
        const userKey = getAuthUserProfile()?.email || "signova-user";

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
          client_id: "signova",
          user_id: userKey,
          save_load_adapter: createSaveLoadAdapter(),
          disabled_features: ["use_localstorage_for_settings"],
          enabled_features: ["hide_left_toolbar_by_default", "study_templates"],
          overrides: {
            "paneProperties.background": "#09090b",
            "paneProperties.backgroundType": "solid",
            "paneProperties.vertGridProperties.color": "#1f1f23",
            "paneProperties.horzGridProperties.color": "#1f1f23",
            "scalesProperties.textColor": "#a1a1aa",
          },
        });
        widgetRef.current = widget;

        widget.onChartReady(() => {
          if (disposed) return;

          // Draw the signal's entry / SL / TP lines (not saved into presets).
          if (signal) {
            try {
              const chart = widget.activeChart();
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

          // Auto-apply the trader's default indicator template to this symbol.
          if (showPresetControls) {
            getDefaultStudyTemplate()
              .then((tpl) => {
                if (disposed || !tpl) return;
                applyTemplateContent(widget, tpl.content);
              })
              .catch(() => {});
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
    showPresetControls,
    signal?.entryPrice,
    signal?.exitTargets.stopLoss,
    signal?.exitTargets.takeProfit1,
    signal?.exitTargets.takeProfit2,
  ]);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-lg border border-[#1D1D1D] bg-[#121212]">
      {showPresetControls && (
        <div className="flex items-center gap-2 border-b border-[#1D1D1D] px-3 py-2">
          <label
            htmlFor="tv-default-preset"
            className="text-xs font-medium text-zinc-400"
          >
            Default preset
          </label>
          <select
            id="tv-default-preset"
            value={defaultName}
            onFocus={refreshTemplates}
            onChange={(e) => handleSelectDefault(e.target.value)}
            disabled={templates.length === 0}
            className="h-8 rounded-md border border-zinc-700 bg-zinc-900 px-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-zinc-600 disabled:opacity-50"
          >
            {templates.length === 0 ? (
              <option value="">No saved indicator templates</option>
            ) : (
              <>
                <option value="">Select a template…</option>
                {templates.map((t) => (
                  <option key={t.name} value={t.name}>
                    {t.name}
                  </option>
                ))}
              </>
            )}
          </select>
        </div>
      )}
      <div ref={containerRef} className="h-full w-full flex-1" />
    </div>
  );
}
