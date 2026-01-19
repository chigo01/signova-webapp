import { Signal } from "@/types/signal";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://signova-server.onrender.com";

interface SignalsResponse {
  success: boolean;
  date: string;
  signals: Signal[];
  count: number;
  totalSignals: number;
}

export async function fetchApprovedSignals(): Promise<Signal[]> {
  try {
    const res = await fetch(`${API_URL}/signals/approved`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include", // Important for auth cookie
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
    if (Array.isArray(data)) {
      // If it's an array, get the first item's signals
      const firstItem = data[0];
      return firstItem?.signals || [];
    } else if (data && typeof data === "object") {
      // If it's an object, get signals directly
      return data.signals || [];
    }

    return [];
  } catch (error) {
    console.error("Error fetching approved signals:", error);
    // Return empty array on error to allow UI to show "try again" rather than crashing
    // But re-throw if we want the UI to explicitly handle error states differently
    throw error;
  }
}

export async function playSignal(signal: Signal): Promise<void> {
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
    },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to play signal: ${errorText}`);
  }
}

export interface SignalHistoryResponse {
  data: import("@/types/signal").SignalPlay[];
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
  const res = await fetch(
    `${API_URL}/signals/history?page=${page}&limit=${limit}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    }
  );

  if (!res.ok) {
    throw new Error("Failed to fetch signal history");
  }

  return res.json();
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

export async function fetchPairSignals(
  pair: string,
  period: string = "1h",
  limit: number = 100
): Promise<ChartDataPoint[]> {
  try {
    const res = await fetch(
      `${API_URL}/signals/pair/${pair}/signals?period=${period}&limit=${limit}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
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
    const candles = data.signals.response;

    if (!Array.isArray(candles) || candles.length === 0) {
      console.warn("Candles is not an array or is empty:", candles);
      return [];
    }

    // Transform each candle to our chart format
    const chartData: ChartDataPoint[] = candles.map((candle: any) => {
      // Handle both timestamp formats (Unix timestamp or milliseconds)
      const timestamp = candle.tm * 1000; // Assuming tm is in seconds
      const date = new Date(timestamp);

      return {
        time: date.toISOString().split("T")[0],
        open: parseFloat(candle.o),
        high: parseFloat(candle.h),
        low: parseFloat(candle.l),
        close: parseFloat(candle.c),
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
