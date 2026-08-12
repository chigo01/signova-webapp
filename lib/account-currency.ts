// The currency a user's trading account is denominated in, and the money
// formatting that follows from it.
//
// Brokers let you pick this at signup, and it decides what every figure in the
// lot size calculator means: a position sized for a $10,000 account is the wrong
// size for a ¥10,000 one. Everything Intl-related lives here so the rest of the
// app never has to reason about currency codes or fraction digits.

export interface AccountCurrency {
  code: string;
  name: string;
}

/**
 * The currencies a trading account can be held in, in the order brokers
 * conventionally list them. Every fiat entry here resolves on the price feed
 * (lib/quote-rate.ts); BTC and ETH depend on the backend's crypto path and fall
 * back to a typed rate if it's unavailable.
 */
export const ACCOUNT_CURRENCIES: AccountCurrency[] = [
  { code: "USD", name: "US Dollar" },
  { code: "GBP", name: "British Pound" },
  { code: "CAD", name: "Canadian Dollar" },
  { code: "AUD", name: "Australian Dollar" },
  { code: "AED", name: "UAE Dirham" },
  { code: "EUR", name: "Euro" },
  { code: "SGD", name: "Singapore Dollar" },
  { code: "NZD", name: "New Zealand Dollar" },
  { code: "HKD", name: "Hong Kong Dollar" },
  { code: "JPY", name: "Japanese Yen" },
  { code: "BTC", name: "Bitcoin" },
  { code: "ETH", name: "Ethereum" },
];

export const DEFAULT_ACCOUNT_CURRENCY = "USD";

const CODES = new Set(ACCOUNT_CURRENCIES.map((entry) => entry.code));

/** Crypto amounts are orders of magnitude smaller, so 2dp would round them away. */
const CRYPTO_CODES = new Set(["BTC", "ETH"]);

/** Decimals a balance is rounded to when converted into this currency. */
const CRYPTO_DECIMALS = 8;
/** JPY has no minor unit; Intl already knows, and conversion should match. */
const ZERO_DECIMAL_CODES = new Set(["JPY"]);

export function isAccountCurrency(value: unknown): value is string {
  return typeof value === "string" && CODES.has(value);
}

function formatOptions(code: string): Intl.NumberFormatOptions {
  // Left to its own devices Intl gives crypto 2 digits, which renders a 1% risk
  // on a 0.25 BTC account as "BTC 0.00" — true but useless.
  if (CRYPTO_CODES.has(code)) {
    return {
      style: "currency",
      currency: code,
      minimumFractionDigits: 2,
      maximumFractionDigits: CRYPTO_DECIMALS,
    };
  }
  // Everything else takes Intl's own convention, which correctly gives JPY 0dp.
  return { style: "currency", currency: code };
}

// Intl.NumberFormat construction is comparatively expensive and these are hit
// once per rendered row, so keep one formatter per currency.
const formatters = new Map<string, Intl.NumberFormat>();

function formatterFor(code: string): Intl.NumberFormat {
  const cached = formatters.get(code);
  if (cached) return cached;
  const formatter = new Intl.NumberFormat("en-US", formatOptions(code));
  formatters.set(code, formatter);
  return formatter;
}

/**
 * A money amount in the account's currency, e.g. "$1,234.56", "¥1,235",
 * "A$1,234.56", "BTC 0.0025".
 */
export function formatMoney(value: number, code: string): string {
  // A target on the wrong side of a zero-lot position computes to -0, which Intl
  // renders as "-$0.00". Collapse it; a genuinely small negative still keeps its
  // sign, because -0.001 !== 0.
  return formatterFor(code).format(value === 0 ? 0 : value);
}

const symbols = new Map<string, string>();

/**
 * Just the currency's symbol — "$", "A$", "AED", "¥" — for labelling an input
 * that the user types a bare number into.
 */
export function currencySymbol(code: string): string {
  const cached = symbols.get(code);
  if (cached !== undefined) return cached;
  const symbol = formatterFor(code)
    .formatToParts(1)
    .filter((part) => part.type === "currency")
    .map((part) => part.value)
    .join("");
  // Fall back to the code itself rather than rendering an empty adornment.
  const resolved = symbol || code;
  symbols.set(code, resolved);
  return resolved;
}

/** Decimals to round a converted balance to, matching how it will be displayed. */
export function balanceDecimals(code: string): number {
  if (CRYPTO_CODES.has(code)) return CRYPTO_DECIMALS;
  if (ZERO_DECIMAL_CODES.has(code)) return 0;
  return 2;
}
