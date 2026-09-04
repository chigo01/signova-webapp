// Live USD conversion rates for the lot size calculator.
//
// Sizing a cross pair (EUR/AUD, GBP/JPY) needs the USD value of its quote
// currency, which the signal itself never carries. Rather than ask the user to
// type it, we read it off the same public /candles endpoint the chart datafeed
// uses — one extra 1-bar request per currency, cached for the session. NGN is
// the exception: it never hits the feed and uses a fixed 1400 NGN per USD.
//
// Pairs whose quote or base *is* the account currency never reach here:
// lib/lot-size.ts resolves those from the entry price alone.
//
// Requests deliberately aren't cancellable. They're shared between callers, so
// one caller aborting would resolve the others to null; instead the request
// always runs to completion and fills the cache, and callers that have moved on
// discard the result themselves.

const ADMIN_API_URL =
  process.env.NEXT_PUBLIC_ADMIN_API_URL ||
  "https://admin-server-syol.onrender.com";

/**
 * Naira accounts are sized at a round 1400 NGN per 1 USD. Nigerian brokers
 * use that fixed figure rather than a live parallel-market quote, and the
 * candle feed has no USDNGN pair anyway.
 */
export const NGN_PER_USD = 1400;

/** USD per 1 unit of a currency that never hits the price feed. */
const STATIC_USD_PER_UNIT: Record<string, number> = {
  NGN: 1 / NGN_PER_USD,
};

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
  const staticRate = STATIC_USD_PER_UNIT[code];
  if (staticRate !== undefined) return staticRate;
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

/**
 * The cached rate if it is still fresh, else null. Never issues a request — it
 * lets a caller take a synchronous path when the rate it needs happens to be
 * warm, which is what keeps switching account currency instant after the first
 * lookup.
 */
export function peekUsdPerUnit(currency: string): number | null {
  const code = currency.toUpperCase();
  if (code === "USD") return 1;
  const staticRate = STATIC_USD_PER_UNIT[code];
  if (staticRate !== undefined) return staticRate;
  const cached = cache.get(code);
  if (!cached || Date.now() - cached.fetchedAt >= CACHE_TTL_MS) return null;
  return cached.rate;
}

/** Which side of a conversion the price feed couldn't price. */
export type MissingRateLeg = "none" | "quote" | "account" | "both";

export interface AccountQuoteRate {
  /** Account currency per 1 unit of the quote currency, or null if unavailable. */
  rate: number | null;
  /** Names the failing leg so the caller can say which currency to fix. */
  missing: MissingRateLeg;
}

/**
 * The rate that converts a trade's P&L into the account currency, composed from
 * the two USD legs: (USD per quote) / (USD per account).
 *
 * Both legs go through fetchUsdPerUnit, so they share its per-currency cache and
 * in-flight dedupe — deliberately no second cache keyed on the pair, which would
 * double the staleness surface and escape resetQuoteRateCache().
 */
export async function fetchAccountPerQuoteUnit(
  quoteCurrency: string,
  accountCurrency: string,
): Promise<AccountQuoteRate> {
  const quote = quoteCurrency.toUpperCase();
  const account = accountCurrency.toUpperCase();

  // Identity is exactly 1. Routing it through two lookups and a division would
  // make it 1 only up to float luck, and would request a pair like USDUSD.
  if (quote === account) return { rate: 1, missing: "none" };

  const [usdPerQuote, usdPerAccount] = await Promise.all([
    fetchUsdPerUnit(quote),
    fetchUsdPerUnit(account),
  ]);

  if (usdPerQuote === null && usdPerAccount === null) {
    return { rate: null, missing: "both" };
  }
  if (usdPerQuote === null) return { rate: null, missing: "quote" };
  if (usdPerAccount === null) return { rate: null, missing: "account" };

  // Divide rather than multiply by a precomputed inverse: for a USD account
  // usdPerAccount is exactly 1, so this is bit-identical to the raw quote leg.
  return { rate: usdPerQuote / usdPerAccount, missing: "none" };
}

/** Test seam — drops cached rates and in-flight requests. */
export function resetQuoteRateCache(): void {
  cache.clear();
  inFlight.clear();
}
