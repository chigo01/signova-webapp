import { Signal } from "@/types/signal";
import { API_URL } from "@/lib/config";
import { getAuthToken } from "./cookies";

interface WinRateResponse {
  success: boolean;
  winRate: number;
  totalSignals: number;
  takeProfitHits: number;
}

type SignalDirection = Signal["direction"];

type ApiSignal = Partial<Signal> & {
  engine?: Signal["engine"];
  rawSignal?: Partial<Signal>;
  activeSignal?: Partial<Signal>;
  legacySignal?: Partial<Signal>;
};

const fallbackTechnicalIndicators: Signal["technicalIndicators"] = {
  rsi: 0,
  macd: {
    line: 0,
    signal: 0,
    histogram: 0,
  },
  movingAverages: {
    sma20: 0,
    sma50: 0,
    ema12: 0,
    ema26: 0,
  },
  bollinger: {
    upper: 0,
    middle: 0,
    lower: 0,
  },
  stochastic: {
    k: 0,
    d: 0,
  },
};

const fallbackSupportResistance: Signal["supportResistance"] = {
  resistance: [],
  support: [],
  currentLevel: "neutral",
};

/**
 * Strip internal provider attribution from user-facing reasoning text.
 * The contrarian-reversal signal was historically labelled with the engine
 * that produced its source picks; those strings are still stored on older
 * signals in the DB, so we rewrite them to neutral wording on the way out.
 * The "LLM optimized R/R ratio" and "Math optimized" lines appended by
 * admin-server's exit-target optimizers are dropped entirely for the same
 * reason (no longer written for new signals, but stored on older ones).
 */
function sanitizeReasoning(points: string[]): string[] {
  return points
    .filter((p) => !/^(?:LLM optimized R\/R ratio|Math optimized)/i.test(p))
    .map((p) =>
      p
        // legacy: "Contrarian reverse of Claude worst-5 BUY setup" -> "Contrarian reversal setup (BUY)"
        .replace(
          /Contrarian reverse of Claude worst-5 (BUY|SELL) setup/gi,
          "Contrarian reversal setup ($1)"
        )
        // legacy: "Reverse trade setup from Claude worst-5: ..." -> "Reverse trade setup: ..."
        .replace(/Reverse trade setup from Claude worst-5:/gi, "Reverse trade setup:")
        // catch-all: remove any remaining provider attribution
        .replace(/\bClaude(?:'s)?\s+(?:worst|best)-5\b/gi, "model")
        .replace(/\b(?:Claude|Anthropic)\b/gi, "the engine")
    );
}

function parseMonitorKey(monitorKey?: string): Partial<Signal> {
  if (!monitorKey) return {};

  const [pair, direction, timeframe, entryPrice, timestamp] =
    monitorKey.split("|");
  const parsedEntryPrice = Number(entryPrice);

  return {
    ...(pair && { pair }),
    ...(direction === "BUY" || direction === "SELL" || direction === "HOLD"
      ? { direction }
      : {}),
    ...(timeframe && { timeframe }),
    ...(Number.isFinite(parsedEntryPrice) && { entryPrice: parsedEntryPrice }),
    ...(timestamp && { timestamp }),
  };
}

function normalizeSignal(signal: ApiSignal): Signal | null {
  const rawSignal = signal.rawSignal ?? signal.activeSignal ?? {};
  const legacySignal = signal.legacySignal ?? {};
  const monitorSignal = parseMonitorKey(signal.engine?.monitorKey);

  const pair =
    signal.pair ?? rawSignal.pair ?? legacySignal.pair ?? monitorSignal.pair;
  const direction =
    signal.direction ??
    rawSignal.direction ??
    legacySignal.direction ??
    monitorSignal.direction;
  const timeframe =
    signal.timeframe ??
    rawSignal.timeframe ??
    legacySignal.timeframe ??
    monitorSignal.timeframe;
  const entryPrice =
    signal.entryPrice ??
    rawSignal.entryPrice ??
    legacySignal.entryPrice ??
    monitorSignal.entryPrice;
  const exitTargets =
    signal.exitTargets ?? rawSignal.exitTargets ?? legacySignal.exitTargets;

  if (!signal._id || !pair || !direction || !timeframe || !exitTargets) {
    return null;
  }

  const riskAssessment = {
    positionSize: 0,
    maxDrawdown: 0,
    ...(rawSignal.riskAssessment ?? {}),
    ...(legacySignal.riskAssessment ?? {}),
    ...(signal.riskAssessment ?? {}),
  };

  return {
    _id: signal._id,
    pair,
    direction: direction as SignalDirection,
    timeframe,
    confidence:
      signal.confidence ?? rawSignal.confidence ?? legacySignal.confidence ?? 0,
    strength: signal.strength ?? rawSignal.strength ?? legacySignal.strength ?? 0,
    entryPrice: entryPrice ?? 0,
    exitTargets,
    technicalIndicators:
      signal.technicalIndicators ??
      rawSignal.technicalIndicators ??
      legacySignal.technicalIndicators ??
      fallbackTechnicalIndicators,
    supportResistance:
      signal.supportResistance ??
      rawSignal.supportResistance ??
      legacySignal.supportResistance ??
      fallbackSupportResistance,
    riskAssessment: {
      ...riskAssessment,
      stopLoss: riskAssessment.stopLoss ?? exitTargets.stopLoss,
      takeProfit: riskAssessment.takeProfit ?? exitTargets.takeProfit1,
      riskRewardRatio: riskAssessment.riskRewardRatio ?? 0,
    },
    reasoning: sanitizeReasoning(
      signal.reasoning ?? rawSignal.reasoning ?? legacySignal.reasoning ?? []
    ),
    timestamp:
      signal.timestamp ??
      rawSignal.timestamp ??
      legacySignal.timestamp ??
      monitorSignal.timestamp ??
      "",
    screenshot: signal.screenshot ?? rawSignal.screenshot ?? legacySignal.screenshot,
    tradeOutcome:
      signal.tradeOutcome ?? rawSignal.tradeOutcome ?? legacySignal.tradeOutcome,
    engine: signal.engine,
  };
}

export async function fetchApprovedSignals(): Promise<Signal[]> {
  try {
    const token = getAuthToken();
    const res = await fetch(`${API_URL}/signals/approved`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });

    if (!res.ok) {
      if (res.status === 404) {
        // No signals found is a valid state, return empty array
        return [];
      }
      throw new Error(`Failed to fetch signals: ${res.statusText}`);
    }

    const data = await res.json();

    // Handle both array and object responses from the API
    let signals: ApiSignal[] = [];
    if (Array.isArray(data)) {
      // If it's an array, get the first item's signals
      const firstItem = data[0];
      signals = firstItem?.signals || [];
    } else if (data && typeof data === "object") {
      // If it's an object, get signals directly
      signals = data.signals || [];
    }

    return signals.map(normalizeSignal).filter((signal) => signal !== null);
  } catch (error) {
    console.error("Error fetching approved signals:", error);
    // Return empty array on error to allow UI to show "try again" rather than crashing
    // But re-throw if we want the UI to explicitly handle error states differently
    throw error;
  }
}

/**
 * Guest-facing signals: the public endpoint returns a limited subset used by
 * locked cards, including release time, entry, and TP1. Stop loss, TP2,
 * indicators, reasoning, and other protected details stay server-side.
 */
export interface PublicSignal {
  _id: string;
  pair: string;
  direction: SignalDirection;
  timestamp?: string;
  entryPrice?: number;
  takeProfit1?: number;
}

export function toLockedSignal(signal: PublicSignal): Signal {
  return {
    _id: signal._id,
    pair: signal.pair,
    direction: signal.direction,
    timestamp: signal.timestamp ?? "",
    entryPrice: signal.entryPrice,
    exitTargets: {
      takeProfit1: signal.takeProfit1,
    },
  } as Signal;
}

export async function fetchPublicSignals(): Promise<PublicSignal[]> {
  try {
    const res = await fetch(`${API_URL}/signals/approved/public`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.signals) ? (data.signals as PublicSignal[]) : [];
  } catch (error) {
    console.error("Error fetching public signals:", error);
    return [];
  }
}

export async function playSignal(signal: Signal): Promise<void> {
  const token = getAuthToken();
  const payload = {
    signalId: signal._id,
    symbol: signal.pair,
    signalType: signal.direction.toLowerCase(), // "buy" or "sell"
    entryPrice: signal.entryPrice,
    targetPrice: signal.exitTargets.takeProfit1,
    stopLoss: signal.exitTargets.stopLoss,
  };

  const res = await fetch(`${API_URL}/signals/play`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to play signal: ${errorText}`);
  }
}

/** GET /signals/history?page=&limit= — paginated list of plays for the authenticated user. */
export interface SignalHistoryResponse {
  items: import("@/types/signal").ApprovedSignalsHistory[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface SignalHistoryApiItem {
  date: string;
  sourceCollection: string;
  signal: Signal;
}

interface SignalHistoryApiResponse {
  success: boolean;
  items: SignalHistoryApiItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function fetchSignalHistory(
  page: number = 1,
  limit: number = 20
): Promise<SignalHistoryResponse> {
  const token = getAuthToken();
  const res = await fetch(
    `${API_URL}/signals/history?page=${page}&limit=${limit}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    }
  );

  if (!res.ok) {
    throw new Error("Failed to fetch signal history");
  }

  const data: SignalHistoryApiResponse = await res.json();

  if (!data.success || !Array.isArray(data.items)) {
    throw new Error("Invalid signal history response");
  }

  const items = data.items.map((item) => {
    const signal = item.signal;
    const signalType: "buy" | "sell" =
      signal.direction === "BUY" ? "buy" : "sell";

    return {
      _id: signal._id,
      userId: "",
      signalId: signal._id,
      symbol: signal.pair,
      signalType,
      entryPrice: signal.entryPrice,
      tp1: signal.exitTargets.takeProfit1,
      tp2: signal.exitTargets.takeProfit2,
      stopLoss: signal.exitTargets.stopLoss,
      playedAt: signal.timestamp,
      tradeOutcome: signal.tradeOutcome ?? "PENDING",
      createdAt: signal.timestamp,
      updatedAt: signal.timestamp,
    };
  });

  return {
    items,
    pagination: data.pagination,
  };
}

export async function fetchWinRate(): Promise<number> {
  const token = getAuthToken();
  const res = await fetch(`${API_URL}/signals/win-rate`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch win rate: ${res.statusText}`);
  }

  const data: WinRateResponse = await res.json();

  if (!data.success || typeof data.winRate !== "number") {
    throw new Error("Invalid win rate response");
  }

  return data.winRate;
}

// FCS API Response Types
interface FcsApiTickerData {
  ticker: string;
  update: number;
  updateTime: string;
  active: {
    a: number; // ask
    b: number; // bid
    o: number; // open
    h: number; // high
    l: number; // low
    c: number; // close
    v: number | null; // volume
    t: number; // timestamp
    vw: number; // volume weighted
    tm: string; // time string
    ch: number; // change
    chp: number; // change percent
  };
  previous: {
    o: number;
    h: number;
    l: number;
    c: number;
    v: number | null;
    t: number;
    vw: number;
    tm: string;
    ch: number;
    chp: number;
  };
}

interface FcsApiResponse {
  status: boolean;
  code: number;
  msg: string;
  response: FcsApiTickerData[];
  info: {
    support_params: string;
    filter_exchange: string;
    type: string;
    sub_type: string;
    period: string;
    merge: string;
    sort_by: string;
    total_rows: number;
    pagination: object;
    server_time: string;
    credit_count: number;
    file_read: string;
    load_time: string;
    process_time: string;
    radis_used: boolean;
    _t: string;
  };
}

interface PairSignalResponse {
  success: boolean;
  pair: string;
  cached: boolean;
  cachedAt: string;
  expiresAt: string;
  usage: {
    current: number;
    limit: number;
    warning: boolean;
  };
  signals: FcsApiResponse;
}

export interface ChartDataPoint {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface FcsApiCandle {
  o: string | number;
  h: string | number;
  l: string | number;
  c: string | number;
  tm: number;
}

export async function fetchPairSignals(
  pair: string,
  period: string = "1h",
  limit: number = 100
): Promise<ChartDataPoint[]> {
  try {
    const token = getAuthToken();
    const res = await fetch(
      `${API_URL}/signals/pair/${pair}/signals?period=${period}&limit=${limit}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      }
    );

    if (!res.ok) {
      throw new Error(`Failed to fetch pair signals: ${res.statusText}`);
    }

    const data: PairSignalResponse = await res.json();

    console.log("FCS API Response structure:", {
      hasSignals: !!data.signals,
      hasResponse: !!(data.signals && data.signals.response),
      responseType: data.signals?.response
        ? typeof data.signals.response
        : "undefined",
      isArray: Array.isArray(data.signals?.response),
    });

    // Transform FCS API historical response to chart data format
    if (!data.signals || !data.signals.response) {
      console.warn("No signals or response data found");
      return [];
    }

    // FCS API history returns array of candles in response
    const candles = data.signals.response as unknown as FcsApiCandle[];

    if (!Array.isArray(candles) || candles.length === 0) {
      console.warn("Candles is not an array or is empty:", candles);
      return [];
    }

    // Transform each candle to our chart format
    const chartData: ChartDataPoint[] = candles.map((candle: FcsApiCandle) => {
      // Handle both timestamp formats (Unix timestamp or milliseconds)
        const timestamp = candle.tm * 1000; // Assuming tm is in seconds
        const date = new Date(timestamp);

        return {
          time: date.toISOString().split("T")[0],
          open: parseFloat(String(candle.o)),
          high: parseFloat(String(candle.h)),
          low: parseFloat(String(candle.l)),
          close: parseFloat(String(candle.c)),
        };
    });

    // Sort by time ascending (oldest first)
    chartData.sort(
      (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
    );

    console.log(
      `📊 Loaded ${chartData.length} candles for ${pair} (${period}, limit: ${limit})`
    );
    return chartData;
  } catch (error) {
    console.error("Error fetching pair signals:", error);
    throw error;
  }
}
