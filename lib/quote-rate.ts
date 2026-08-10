// Live USD conversion rates for the lot size calculator.
//
// Sizing a cross pair (EUR/AUD, GBP/JPY) needs the USD value of its quote
// currency, which the signal itself never carries. Rather than ask the user to
// type it, we read it off the same public /candles endpoint the chart datafeed
// uses — one extra 1-bar request per currency, cached for the session.
//
// USD-quoted and USD-based pairs never reach here: lib/lot-size.ts resolves
// those from the entry price alone.
//
// Requests deliberately aren't cancellable. They're shared between callers, so
// one caller aborting would resolve the others to null; instead the request
// always runs to completion and fills the cache, and callers that have moved on
// discard the result themselves.

const ADMIN_API_URL =
  process.env.NEXT_PUBLIC_ADMIN_API_URL ||
  "https://admin-server-syol.onrender.com";

/**
 * Rates move slowly relative to a calculator session, and a stale-by-minutes
 * rate is far better than a spinner. Re-fetched only after this.
 */
const CACHE_TTL_MS = 5 * 60_000;

const cache = new Map<string, { rate: number; fetchedAt: number }>();
/** Collapses the burst of requests from opening the calculator on several cards. */
const inFlight = new Map<string, Promise<number | null>>();

interface CandleBar {
  close?: unknown;
}

interface CandlesResponse {
  bars?: CandleBar[];
  noData?: boolean;
}

/** Latest close for a 6-letter symbol, or null if the provider has no data. */
async function fetchClose(symbol: string): Promise<number | null> {
  const res = await fetch(
    `${ADMIN_API_URL}/candles?pair=${symbol}&timeframe=1h&count=1`,
  );
  if (!res.ok) return null;

  const json = (await res.json()) as CandlesResponse;
  const close = json.bars?.[json.bars.length - 1]?.close;
  if (typeof close !== "number" || !Number.isFinite(close) || close <= 0) {
    return null;
  }
  return close;
}

async function resolve(currency: string): Promise<number | null> {
  // AUDUSD quotes USD per 1 AUD directly — exactly the number we want.
  const direct = await fetchClose(`${currency}USD`);
  if (direct !== null) return direct;

  // Currencies conventionally quoted the other way (USD/JPY, USD/CHF) may only
  // have the inverse leg, which is one division away from the same answer.
  const inverse = await fetchClose(`USD${currency}`);
  if (inverse !== null) return 1 / inverse;

  return null;
}

/**
 * USD per 1 unit of `currency`, or null when the rate can't be loaded — the
 * caller's cue to fall back to a manual entry rather than size on a guess.
 *
 * USD returns 1 without a request. Results are cached per currency for
 * CACHE_TTL_MS, and concurrent callers share one in-flight request.
 */
export async function fetchUsdPerUnit(
  currency: string,
): Promise<number | null> {
  const code = currency.toUpperCase();
  if (code === "USD") return 1;
  if (!/^[A-Z]{3}$/.test(code)) return null;

  const cached = cache.get(code);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.rate;
  }

  const pending = inFlight.get(code);
  if (pending) return pending;

  const request = resolve(code)
    .then((rate) => {
      if (rate !== null) cache.set(code, { rate, fetchedAt: Date.now() });
      return rate;
    })
    // A failed lookup is a normal outcome here (offline, provider down, an
    // exotic currency); the caller shows the manual field instead.
    .catch(() => null)
    .finally(() => inFlight.delete(code));

  inFlight.set(code, request);
  return request;
}

/** Test seam — drops cached rates and in-flight requests. */
export function resetQuoteRateCache(): void {
  cache.clear();
  inFlight.clear();
}
