import { Signal } from "@/types/signal";

const API_URL = "http://localhost:9000";

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
