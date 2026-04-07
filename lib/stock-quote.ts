import { API_URL } from "@/lib/config";
import { getAuthToken } from "@/lib/cookies";

export type StockQuoteResult = {
  price: number;
  change?: number;
  changePercent?: number;
};

function parseNum(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = parseFloat(v.replace(",", "."));
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

/** Optional backend: GET /stocks/quote/:ticker */
async function tryBackendQuote(ticker: string): Promise<StockQuoteResult | null> {
  try {
    const token = getAuthToken();
    const res = await fetch(
      `${API_URL}/stocks/quote/${encodeURIComponent(ticker)}`,
      {
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      }
    );
    if (!res.ok) return null;
    const j = (await res.json()) as Record<string, unknown>;
    const price = parseNum(j.price);
    if (price === undefined || price <= 0) return null;
    return {
      price,
      change: parseNum(j.change),
      changePercent: parseNum(j.changePercent),
    };
  } catch {
    return null;
  }
}

/** Finnhub (browser-friendly; set NEXT_PUBLIC_FINNHUB_API_KEY). */
async function tryFinnhub(ticker: string): Promise<StockQuoteResult | null> {
  const token = process.env.NEXT_PUBLIC_FINNHUB_API_KEY;
  if (!token) return null;
  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(ticker)}&token=${token}`
    );
    if (!res.ok) return null;
    const j = (await res.json()) as Record<string, unknown>;
    const price = parseNum(j.c);
    if (price === undefined || price <= 0) return null;
    return {
      price,
      change: parseNum(j.d),
      changePercent: parseNum(j.dp),
    };
  } catch {
    return null;
  }
}

/** Stooq JSON (no key; may be delayed). */
async function tryStooq(ticker: string): Promise<StockQuoteResult | null> {
  try {
    const s = `${ticker.toLowerCase()}.us`;
    const res = await fetch(
      `https://stooq.com/q/l/?s=${encodeURIComponent(s)}&f=sd2t2ohlcv&h&e=json`
    );
    if (!res.ok) return null;
    const j = (await res.json()) as {
      symbols?: Array<Record<string, unknown>>;
    };
    const row = j.symbols?.[0];
    if (!row) return null;
    const price =
      parseNum(row.close) ?? parseNum(row.Close) ?? parseNum(row.c);
    if (price === undefined || price <= 0) return null;
    return { price };
  } catch {
    return null;
  }
}

/**
 * Best-effort live US quote for the header price (chart iframe cannot expose data cross-origin).
 */
export async function fetchUsStockQuote(
  ticker: string
): Promise<StockQuoteResult | null> {
  const t = ticker.trim().toUpperCase();
  if (!t) return null;

  return (
    (await tryBackendQuote(t)) ??
    (await tryFinnhub(t)) ??
    (await tryStooq(t))
  );
}
