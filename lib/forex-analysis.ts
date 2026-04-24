import { ANALYSIS_API_URL, TV_DATAFEED_URL } from "@/lib/config";

export const TRADINGVIEW_LIBRARY_PATH = "/vendor/tradingview/charting_library/";
export const TRADINGVIEW_LIBRARY_SCRIPT =
  "/vendor/tradingview/charting_library/charting_library.standalone.js";
export const TRADINGVIEW_DATAFEED_SCRIPT =
  "/vendor/tradingview/datafeeds/udf/dist/bundle.js";

export interface AnalysisOverlay {
  id: string;
  label: string;
  price: number;
  color: string;
  lineStyle: "solid" | "dashed";
  emphasis: "primary" | "secondary";
}

export interface PairAnalysisResponse {
  success: boolean;
  symbol: string;
  interval: string;
  preset: string;
  summary: {
    lastPrice: number;
    change: number;
    changePercent: number;
    trend: "bullish" | "bearish" | "sideways";
    bias: "buy" | "sell" | "neutral";
    atr14: number;
    sma20: number;
    sma50: number;
    recentHigh: number;
    recentLow: number;
    candles: number;
    updatedAt: string;
  } | null;
  supportResistance: {
    support: number[];
    resistance: number[];
  };
  overlays: AnalysisOverlay[];
  signal: {
    pair: string;
    direction: "BUY" | "SELL" | "HOLD";
    confidence: number;
    timeframe: string;
    entryPrice: number;
    takeProfit1: number;
    stopLoss: number;
    reasoning: string[];
  } | null;
  notes: string[];
}

export function getTradingViewDatafeedUrl(): string {
  return TV_DATAFEED_URL;
}

export function normalizeForexSymbol(raw: string): string {
  const withoutPrefix = raw.split(":").pop() ?? raw;
  const normalized = withoutPrefix.replace(/[^A-Za-z]/g, "").toUpperCase();
  return normalized || "EURUSD";
}

export function normalizeChartResolution(raw: string): string {
  const normalized = raw.toUpperCase();
  if (normalized === "D") return "1D";
  if (normalized === "W") return "1W";
  if (["1", "5", "15", "30", "60", "240", "1D", "1W"].includes(normalized)) {
    return normalized;
  }
  return "60";
}

export function signalTimeframeToResolution(raw?: string): string {
  switch ((raw ?? "").trim().toLowerCase()) {
    case "1m":
      return "1";
    case "5m":
      return "5";
    case "15m":
      return "15";
    case "30m":
      return "30";
    case "1h":
      return "60";
    case "4h":
      return "240";
    case "1w":
      return "1W";
    case "1d":
    default:
      return "1D";
  }
}

export function formatForexPrice(symbol: string, value: number): string {
  if (!Number.isFinite(value)) return "—";
  const decimals = normalizeForexSymbol(symbol).endsWith("JPY") ? 3 : 5;
  return value.toFixed(decimals);
}

export async function fetchPairAnalysis(
  symbol: string,
  resolution: string,
  preset: string = "approved-signal"
): Promise<PairAnalysisResponse> {
  const normalizedSymbol = normalizeForexSymbol(symbol);
  const normalizedResolution = normalizeChartResolution(resolution);
  const query = new URLSearchParams({
    resolution: normalizedResolution,
    preset,
  });
  const response = await fetch(
    `${ANALYSIS_API_URL}/pairs/${encodeURIComponent(normalizedSymbol)}?${query.toString()}`
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch pair analysis: ${response.statusText}`);
  }

  return (await response.json()) as PairAnalysisResponse;
}
