// Position sizing for the signal-card lot size calculator.
//
// Pure math — no React, no I/O. A trade's profit and loss lands in the pair's
// quote currency, so sizing it against an account balance means converting one
// into the other. Two cases need no conversion data at all: when the account is
// held in the quote currency it's a no-op, and when it's held in the base
// currency the entry price *is* the rate. Everything else needs a rate the
// signal doesn't carry, which the caller fetches (lib/quote-rate.ts) or asks
// the user for.
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
  /** The pair is quoted in the account's own currency — no conversion needed. */
  | "quote-is-account"
  /** The account currency is the pair's base, so the entry price is the rate. */
  | "derived-from-entry"
  /** Rate fetched live from the price feed. */
  | "live"
  /** Rate typed by the user after the live lookup failed. */
  | "manual"
  /** No rate available. Always an error — see calculateLotSize. */
  | "assumed";

/** Where a caller-supplied conversion rate came from. */
export type QuoteRateOrigin = "live" | "manual";

/** Account currency assumed when the caller doesn't name one. */
export const DEFAULT_ACCOUNT_CURRENCY = "USD";

export interface LotSizeTarget {
  label: string;
  price: number;
  /** Profit in the account currency. Negative if the target is the wrong side of entry. */
  profit: number;
  /** Reward as a multiple of the risked amount. */
  rMultiple: number;
}

export interface LotSizeInput {
  instrument: InstrumentSpec;
  /** ISO code the balance is denominated in. Defaults to USD. */
  accountCurrency?: string;
  accountBalance: number;
  riskPercent: number;
  entryPrice: number;
  stopLoss: number;
  /** Used only to decide which side of entry counts as profit. */
  direction?: "BUY" | "SELL" | "HOLD";
  takeProfit1?: number;
  takeProfit2?: number;
  /** Account currency per 1 unit of the quote currency. */
  quoteRateOverride?: number;
  /** Labels where quoteRateOverride came from. Defaults to "manual". */
  quoteRateOrigin?: QuoteRateOrigin;
  /** Broker-specific overrides. Defaults retain the standard instrument spec. */
  contractSizeOverride?: number;
  pipSizeOverride?: number;
  minimumLotSize?: number;
  maximumLotSize?: number;
  lotStep?: number;
  /** Percentage of the risk amount reserved for spread/commission/slippage. */
  costBufferPercent?: number;
}

export interface LotSizeResult {
  /** Set when the inputs can't produce a position size at all. */
  error?: string;
  /** Non-blocking cautions — the numbers are still usable. */
  warnings: string[];
  /** Account currency the trade is allowed to lose. */
  riskAmount: number;
  /** Distance from entry to stop, in price terms. */
  stopDistance: number;
  stopPips: number;
  /** Account currency per 1 unit of the quote currency. */
  quoteRate: number;
  quoteRateSource: QuoteRateSource;
  /** Account currency lost per standard lot if the stop is hit. */
  riskPerLot: number;
  /** Unrounded position size. */
  lots: number;
  /** Position size capped to broker limits and floored to the lot step. */
  roundedLots: number;
  units: number;
  /** Account currency per pip at roundedLots. */
  valuePerPip: number;
  /** Account currency actually at risk at roundedLots, i.e. after flooring. */
  actualRisk: number;
  tradeRiskBudget: number;
  costAllowance: number;
  contractSize: number;
  pipSize: number;
  minimumLotSize: number;
  maximumLotSize?: number;
  lotStep: number;
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
    // Placeholder: on the error path quoteRate is a meaningless 1.
    quoteRateSource: "quote-is-account",
    riskPerLot: 0,
    lots: 0,
    roundedLots: 0,
    units: 0,
    valuePerPip: 0,
    actualRisk: 0,
    tradeRiskBudget: 0,
    costAllowance: 0,
    contractSize: 0,
    pipSize: 0,
    minimumLotSize: 0,
    maximumLotSize: undefined,
    lotStep: 0,
    targets: [],
  };
}

/** Floor to the 0.01 lot step, guarding against float noise (1.0 * 100 = 100.00000000000001). */
function floorToLotStep(lots: number, lotStep: number): number {
  let steps = Math.floor(lots / lotStep + 1e-12);
  // Strictly downward-only: never let floating-point representation produce a
  // materially rounded size above the raw risk-limited position. The tolerance
  // only restores exact decimal boundaries represented one ULP below them.
  while (
    steps > 0 &&
    steps * lotStep - lots > Math.max(1, Math.abs(lots)) * 1e-12
  ) {
    steps -= 1;
  }
  return steps * lotStep;
}

function resolveQuoteRate(
  instrument: InstrumentSpec,
  accountCurrency: string,
  entryPrice: number,
  quoteRateOverride: number | undefined,
  quoteRateOrigin: QuoteRateOrigin,
): { rate: number; source: QuoteRateSource } {
  // Risk lands in the quote currency, so an account held in it needs no
  // conversion — and gets an exact 1 rather than a float round trip.
  if (instrument.quote === accountCurrency) {
    return { rate: 1, source: "quote-is-account" };
  }

  // GBP/JPY at 195 means 1 GBP = 195 JPY, so a GBP account converts at 1/195.
  // Generalises the old USD/JPY shortcut: the signal already carries the rate.
  // buildSpec rejects base === quote, so this can't collide with the case above.
  if (instrument.base === accountCurrency) {
    return { rate: 1 / entryPrice, source: "derived-from-entry" };
  }

  if (
    quoteRateOverride !== undefined &&
    Number.isFinite(quoteRateOverride) &&
    quoteRateOverride > 0
  ) {
    return { rate: quoteRateOverride, source: quoteRateOrigin };
  }

  // Neither leg is the account currency and no rate arrived. The caller fetches
  // it (lib/quote-rate.ts); this is the it-didn't-arrive path, which
  // calculateLotSize turns into a hard error.
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
    accountCurrency: rawAccountCurrency = DEFAULT_ACCOUNT_CURRENCY,
    accountBalance,
    riskPercent,
    entryPrice,
    stopLoss,
    direction,
    takeProfit1,
    takeProfit2,
    quoteRateOverride,
    quoteRateOrigin = "manual",
    contractSizeOverride,
    pipSizeOverride,
    minimumLotSize = MIN_LOT_STEP,
    maximumLotSize,
    lotStep = MIN_LOT_STEP,
    costBufferPercent = 0,
  } = input;

  const contractSize = contractSizeOverride ?? instrument.contractSize;
  const pipSize = pipSizeOverride ?? instrument.pipSize;

  const accountCurrency = rawAccountCurrency.toUpperCase();

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
  if (!Number.isFinite(contractSize) || contractSize <= 0) {
    return failure("Enter a contract size greater than 0.");
  }
  if (!Number.isFinite(pipSize) || pipSize <= 0) {
    return failure("Enter a pip size greater than 0.");
  }
  if (!Number.isFinite(minimumLotSize) || minimumLotSize <= 0) {
    return failure("Enter a minimum lot size greater than 0.");
  }
  if (
    maximumLotSize !== undefined &&
    (!Number.isFinite(maximumLotSize) || maximumLotSize <= 0)
  ) {
    return failure(
      "Enter a maximum lot size greater than 0, or leave it blank.",
    );
  }
  if (
    maximumLotSize !== undefined &&
    maximumLotSize < minimumLotSize
  ) {
    return failure("Maximum lot size must be at least the minimum lot size.");
  }
  if (!Number.isFinite(lotStep) || lotStep <= 0) {
    return failure("Enter a lot step greater than 0.");
  }
  if (
    !Number.isFinite(costBufferPercent) ||
    costBufferPercent < 0 ||
    costBufferPercent >= 100
  ) {
    return failure("Cost buffer must be from 0% to under 100%.");
  }

  const stopDistance = Math.abs(entryPrice - stopLoss);
  if (stopDistance === 0) {
    return failure("Stop loss can't equal the entry price.");
  }

  const isSell =
    direction === "SELL" || (direction !== "BUY" && stopLoss > entryPrice);
  const stopIsOnWrongSide = isSell
    ? stopLoss < entryPrice
    : stopLoss > entryPrice;
  if (direction && direction !== "HOLD" && stopIsOnWrongSide) {
    return failure(
      `Stop loss is on the wrong side of entry for a ${direction} trade.`,
    );
  }

  const warnings: string[] = [];
  const { rate: quoteRate, source: quoteRateSource } = resolveQuoteRate(
    instrument,
    accountCurrency,
    entryPrice,
    quoteRateOverride,
    quoteRateOrigin,
  );

  // Refuse to size rather than size on rate 1. This used to be a warning, which
  // was survivable only because it could not happen off a USD account: on a
  // cross, rate 1 overstates risk per lot and collapses the position to 0.00 —
  // visibly broken. With an account currency it cuts the other way too. A JPY
  // account on EUR/USD at rate 1 instead of ~159 understates risk per lot by
  // that factor and returns ~53 lots where 0.33 is correct: a plausible-looking
  // number that would blow up the account. The rate input stays on screen, so
  // erroring costs the user nothing.
  if (quoteRateSource === "assumed") {
    return failure(
      `Can't convert ${instrument.label} risk into ${accountCurrency} — the ${instrument.quote}/${accountCurrency} rate couldn't be loaded. Enter how much ${accountCurrency} 1 ${instrument.quote} is worth to size this trade.`,
    );
  }
  if (riskPercent > HIGH_RISK_PERCENT) {
    warnings.push(
      `Risking ${riskPercent}% of the account on one trade is unusually aggressive.`,
    );
  }

  // HOLD carries no side, so infer it from where the stop sits.
  const riskAmount = (accountBalance * riskPercent) / 100;
  const costAllowance = (riskAmount * costBufferPercent) / 100;
  const tradeRiskBudget = riskAmount - costAllowance;
  const riskPerLot = stopDistance * contractSize * quoteRate;
  const lots = tradeRiskBudget / riskPerLot;
  const brokerLimitedLots =
    maximumLotSize === undefined ? lots : Math.min(lots, maximumLotSize);
  let roundedLots = floorToLotStep(brokerLimitedLots, lotStep);

  if (roundedLots < minimumLotSize) {
    roundedLots = 0;
    warnings.push(
      `This works out to ${lots.toFixed(4)} lots — below the broker minimum of ${minimumLotSize}. No position is recommended because using the minimum would exceed your risk limit.`,
    );
  }
  if (maximumLotSize !== undefined && lots > maximumLotSize) {
    warnings.push(
      `The risk-based size is ${lots.toFixed(4)} lots, so it was capped at the broker maximum of ${maximumLotSize}.`,
    );
  }

  const targets: LotSizeTarget[] = [];
  const addTarget = (label: string, price: number | undefined) => {
    if (price === undefined || !Number.isFinite(price) || price <= 0) return;
    const favourableMove = isSell ? entryPrice - price : price - entryPrice;
    targets.push({
      label,
      price,
      profit: favourableMove * contractSize * quoteRate * roundedLots,
      rMultiple: favourableMove / stopDistance,
    });
  };
  addTarget("TP1", takeProfit1);
  addTarget("TP2", takeProfit2);

  return {
    warnings,
    riskAmount,
    stopDistance,
    stopPips: stopDistance / pipSize,
    quoteRate,
    quoteRateSource,
    riskPerLot,
    lots,
    roundedLots,
    units: roundedLots * contractSize,
    valuePerPip:
      pipSize * contractSize * quoteRate * roundedLots,
    actualRisk: Math.min(roundedLots * riskPerLot, tradeRiskBudget),
    tradeRiskBudget,
    costAllowance,
    contractSize,
    pipSize,
    minimumLotSize,
    maximumLotSize,
    lotStep,
    targets,
  };
}
