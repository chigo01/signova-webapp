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

    const data: SignalsResponse = await res.json();
    return data.signals || [];
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

export async function fetchPairSignals(pair: string): Promise<ChartDataPoint[]> {
  try {
    const res = await fetch(`${API_URL}/signals/pair/${pair}/signals`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch pair signals: ${res.statusText}`);
    }

    const data: PairSignalResponse = await res.json();
    
    // Transform FCS API response to chart data format
    // Get the first ticker (or you can aggregate all tickers)
    const ticker = data.signals.response[0];
    
    if (!ticker) {
      return [];
    }

    // Create chart data points from active and previous data
    const chartData: ChartDataPoint[] = [
      {
        time: ticker.previous.tm.split(" ")[0], // Extract date
        open: ticker.previous.o,
        high: ticker.previous.h,
        low: ticker.previous.l,
        close: ticker.previous.c,
      },
      {
        time: ticker.active.tm.split(" ")[0], // Extract date
        open: ticker.active.o,
        high: ticker.active.h,
        low: ticker.active.l,
        close: ticker.active.c,
      },
    ];

    return chartData;
  } catch (error) {
    console.error("Error fetching pair signals:", error);
    throw error;
  }
}
