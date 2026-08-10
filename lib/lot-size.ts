// Position sizing for the signal-card lot size calculator.
//
// Pure math — no React, no I/O. The account currency is always USD, which is
// what makes the quote-currency conversion tractable: for USD-quoted pairs it
// is a no-op, and for USD-based pairs (USD/JPY, USD/CAD, ...) the entry price
// *is* the conversion rate. Only true crosses (EUR/JPY, GBP/AUD) need a rate
// that isn't already on the signal, and those ask the user for it.
//
// Coverage is deliberately limited to forex and metals. Crypto and indices are
// resolved to null so the caller can hide the calculator rather than guess at a
// contract size that varies wildly between brokers.

import { SUPPORTED_PAIRS } from "./supported-pairs";

/** Currencies we know the quoting convention for. Anything else resolves to null. */
const KNOWN_CURRENCIES = new Set([
  "USD",
  "EUR",
  "GBP",
  "JPY",
  "CHF",
  "CAD",
  "AUD",
  "NZD",
]);

/** Base units in one standard lot, and the price move counted as one pip. */
const METAL_SPECS: Record<string, { contractSize: number; pipSize: number }> = {
  // 100 troy oz per lot, quoted to 2dp -> $10 per pip per lot.
  XAU: { contractSize: 100, pipSize: 0.1 },
  // 5,000 troy oz per lot, quoted to 3dp -> $5 per pip per lot.
  XAG: { contractSize: 5000, pipSize: 0.001 },
};

const FOREX_CONTRACT_SIZE = 100_000;
/** JPY is quoted to 2/3dp, so its pip is two orders of magnitude larger. */
const JPY_PIP_SIZE = 0.01;
const DEFAULT_PIP_SIZE = 0.0001;

/** Brokers quote lots in 0.01 increments; anything smaller can't be placed. */
export const MIN_LOT_STEP = 0.01;
/** Risk above this is flagged, not blocked — it's the user's account. */
const HIGH_RISK_PERCENT = 5;

export type InstrumentKind = "forex" | "metal";

export interface InstrumentSpec {
  /** Compact 6-letter symbol, e.g. "EURUSD". */
  symbol: string;
  /** Display form, e.g. "EUR/USD". */
  label: string;
  base: string;
  quote: string;
  /** Units of the base asset in 1.00 standard lot. */
  contractSize: number;
  /** Price movement counted as one pip. */
  pipSize: number;
  kind: InstrumentKind;
}

/**
 * Normalize the many pair shapes that reach the frontend — "EUR/USD" from the
 * API and fixtures, "EURUSD" from chart symbols, "EURUSDT" from the Binance
 * mapping — into one compact symbol. Mirrors the idiom in pair-to-forex-symbol.ts.
 */
function normalizePairSymbol(pair: string): string {
  const compact = pair.replace(/[/\s\-:_]/g, "").toUpperCase();
  const stripped = compact.replace(
    /^(OANDA|FX_IDC|FX|BINANCE|NASDAQ|NYSE)/,
    "",
  );
  // Stablecoin quotes are USD for sizing purposes: BTCUSDT -> BTCUSD.
  return stripped.replace(/USD[TC]$/, "USD");
}

function buildSpec(symbol: string): InstrumentSpec | null {
  if (!/^[A-Z]{6}$/.test(symbol)) return null;

  const base = symbol.slice(0, 3);
  const quote = symbol.slice(3);
  const label = `${base}/${quote}`;

  // Metals are only ever quoted against a currency, never the other way round.
  const metal = METAL_SPECS[base];
  if (metal && KNOWN_CURRENCIES.has(quote)) {
    return { symbol, label, base, quote, kind: "metal", ...metal };
  }

  if (!KNOWN_CURRENCIES.has(base) || !KNOWN_CURRENCIES.has(quote)) return null;
  if (base === quote) return null;

  return {
    symbol,
    label,
    base,
    quote,
    kind: "forex",
    contractSize: FOREX_CONTRACT_SIZE,
    pipSize: quote === "JPY" ? JPY_PIP_SIZE : DEFAULT_PIP_SIZE,
  };
}

/**
 * Contract specs for a signal's pair, or null when we don't know them — crypto,
 * indices, equities and any unrecognised symbol. A null return is the caller's
 * cue to hide the calculator entirely.
 */
export function resolveInstrument(pair: string): InstrumentSpec | null {
  if (!pair) return null;
  return buildSpec(normalizePairSymbol(pair));
}

/**
 * The instrument dropdown's options: the curated chart universe narrowed to the
 * pairs we can size. Crypto entries in SUPPORTED_PAIRS drop out here because
 * buildSpec doesn't recognise BTC/ETH as currencies or metals.
 */
export const CALCULATOR_INSTRUMENTS: InstrumentSpec[] = SUPPORTED_PAIRS.map(
  (pair) => buildSpec(pair.symbol),
).filter((spec): spec is InstrumentSpec => spec !== null);

export type QuoteRateSource =
  /** Quote is already USD — no conversion needed. */
  | "quote-is-usd"
  /** USD-based pair: the entry price is the USD/quote rate, so 1/entry converts. */
  | "derived-from-entry"
  /** Cross pair, rate fetched live from the price feed. */
  | "live"
  /** Cross pair, rate typed by the user after the live lookup failed. */
  | "manual"
  /** Cross pair with no rate available — treated as 1 and warned about. */
  | "assumed";

/** Where a caller-supplied cross rate came from. */
export type QuoteRateOrigin = "live" | "manual";

export interface LotSizeTarget {
  label: string;
  price: number;
  /** Profit in USD at the computed lot size. Negative if the target is the wrong side of entry. */
  profit: number;
  /** Reward as a multiple of the risked amount. */
  rMultiple: number;
}

export interface LotSizeInput {
  instrument: InstrumentSpec;
  accountBalance: number;
  riskPercent: number;
  entryPrice: number;
  stopLoss: number;
  /** Used only to decide which side of entry counts as profit. */
  direction?: "BUY" | "SELL" | "HOLD";
  takeProfit1?: number;
  takeProfit2?: number;
  /** USD per 1 unit of the quote currency. Cross pairs only. */
  quoteRateOverride?: number;
  /** Labels where quoteRateOverride came from. Defaults to "manual". */
  quoteRateOrigin?: QuoteRateOrigin;
}

export interface LotSizeResult {
  /** Set when the inputs can't produce a position size at all. */
  error?: string;
  /** Non-blocking cautions — the numbers are still usable. */
  warnings: string[];
  /** USD the trade is allowed to lose. */
  riskAmount: number;
  /** Distance from entry to stop, in price terms. */
  stopDistance: number;
  stopPips: number;
  /** USD per 1 unit of the quote currency. */
  quoteRate: number;
  quoteRateSource: QuoteRateSource;
  /** USD lost per standard lot if the stop is hit. */
  riskPerLot: number;
  /** Unrounded position size. */
  lots: number;
  /** Position size floored to the 0.01 lot step — never rounds risk upward. */
  roundedLots: number;
  units: number;
  /** USD per pip at roundedLots. */
  valuePerPip: number;
  /** USD actually at risk at roundedLots, i.e. after flooring. */
  actualRisk: number;
  targets: LotSizeTarget[];
}

function failure(error: string, quoteRate = 1): LotSizeResult {
  return {
    error,
    warnings: [],
    riskAmount: 0,
    stopDistance: 0,
    stopPips: 0,
    quoteRate,
    quoteRateSource: "quote-is-usd",
    riskPerLot: 0,
    lots: 0,
    roundedLots: 0,
    units: 0,
    valuePerPip: 0,
    actualRisk: 0,
    targets: [],
  };
}

/** Floor to the 0.01 lot step, guarding against float noise (1.0 * 100 = 100.00000000000001). */
function floorToLotStep(lots: number): number {
  const steps = Math.floor(Number((lots / MIN_LOT_STEP).toFixed(6)));
  return steps * MIN_LOT_STEP;
}

function resolveQuoteRate(
  instrument: InstrumentSpec,
  entryPrice: number,
  quoteRateOverride: number | undefined,
  quoteRateOrigin: QuoteRateOrigin,
): { rate: number; source: QuoteRateSource } {
  if (instrument.quote === "USD") return { rate: 1, source: "quote-is-usd" };

  // USD/JPY at 157.00 means 1 USD = 157 JPY, so 1 JPY = 1/157 USD. The signal's
  // own entry price is the rate — no extra market data required.
  if (instrument.base === "USD") {
    return { rate: 1 / entryPrice, source: "derived-from-entry" };
  }

  if (
    quoteRateOverride !== undefined &&
    Number.isFinite(quoteRateOverride) &&
    quoteRateOverride > 0
  ) {
    return { rate: quoteRateOverride, source: quoteRateOrigin };
  }

  // A cross like EUR/JPY needs the USD/JPY leg, which isn't in the signal. The
  // caller fetches it (lib/quote-rate.ts); this is the it-didn't-arrive path.
  return { rate: 1, source: "assumed" };
}

/**
 * Size a position so that being stopped out costs exactly `riskPercent` of the
 * account.
 *
 *   riskAmount = balance * riskPercent / 100
 *   riskPerLot = |entry - stop| * contractSize * quoteRate
 *   lots       = riskAmount / riskPerLot
 */
export function calculateLotSize(input: LotSizeInput): LotSizeResult {
  const {
    instrument,
    accountBalance,
    riskPercent,
    entryPrice,
    stopLoss,
    direction,
    takeProfit1,
    takeProfit2,
    quoteRateOverride,
    quoteRateOrigin = "manual",
  } = input;

  if (!Number.isFinite(accountBalance) || accountBalance <= 0) {
    return failure("Enter an account balance greater than 0.");
  }
  if (!Number.isFinite(riskPercent) || riskPercent <= 0) {
    return failure("Enter a risk percentage greater than 0.");
  }
  if (riskPercent > 100) {
    return failure("Risk can't exceed 100% of the account.");
  }
  if (!Number.isFinite(entryPrice) || entryPrice <= 0) {
    return failure("Enter an entry price greater than 0.");
  }
  if (!Number.isFinite(stopLoss) || stopLoss <= 0) {
    return failure("Enter a stop loss greater than 0.");
  }

  const stopDistance = Math.abs(entryPrice - stopLoss);
  if (stopDistance === 0) {
    return failure("Stop loss can't equal the entry price.");
  }

  const warnings: string[] = [];
  const { rate: quoteRate, source: quoteRateSource } = resolveQuoteRate(
    instrument,
    entryPrice,
    quoteRateOverride,
    quoteRateOrigin,
  );

  if (quoteRateSource === "assumed") {
    warnings.push(
      `${instrument.label} is a cross pair and the live ${instrument.quote} rate couldn't be loaded. Enter the USD value of 1 ${instrument.quote} — until then the result is unconverted and will be wrong.`,
    );
  }
  if (riskPercent > HIGH_RISK_PERCENT) {
    warnings.push(
      `Risking ${riskPercent}% of the account on one trade is unusually aggressive.`,
    );
  }

  // HOLD carries no side, so infer it from where the stop sits.
  const isSell =
    direction === "SELL" || (direction !== "BUY" && stopLoss > entryPrice);
  const stopIsOnWrongSide = isSell
    ? stopLoss < entryPrice
    : stopLoss > entryPrice;
  if (direction && direction !== "HOLD" && stopIsOnWrongSide) {
    warnings.push(
      `Stop loss is on the wrong side of entry for a ${direction} trade.`,
    );
  }

  const riskAmount = (accountBalance * riskPercent) / 100;
  const riskPerLot = stopDistance * instrument.contractSize * quoteRate;
  const lots = riskAmount / riskPerLot;
  const roundedLots = floorToLotStep(lots);

  if (roundedLots < MIN_LOT_STEP) {
    warnings.push(
      `This works out to ${lots.toFixed(4)} lots — below the ${MIN_LOT_STEP} minimum. Increase the balance or risk %, or tighten the stop.`,
    );
  }

  const targets: LotSizeTarget[] = [];
  const addTarget = (label: string, price: number | undefined) => {
    if (price === undefined || !Number.isFinite(price) || price <= 0) return;
    const favourableMove = isSell ? entryPrice - price : price - entryPrice;
    targets.push({
      label,
      price,
      profit: favourableMove * instrument.contractSize * quoteRate * roundedLots,
      rMultiple: favourableMove / stopDistance,
    });
  };
  addTarget("TP1", takeProfit1);
  addTarget("TP2", takeProfit2);

  return {
    warnings,
    riskAmount,
    stopDistance,
    stopPips: stopDistance / instrument.pipSize,
    quoteRate,
    quoteRateSource,
    riskPerLot,
    lots,
    roundedLots,
    units: roundedLots * instrument.contractSize,
    valuePerPip:
      instrument.pipSize * instrument.contractSize * quoteRate * roundedLots,
    actualRisk: roundedLots * riskPerLot,
    targets,
  };
}
