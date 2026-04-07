/**
 * Map US ticker (e.g. MSFT) to TradingView symbol for the advanced chart widget.
 * Uses exchange prefixes TradingView recognizes for major listings.
 */
const NYSE = new Set([
  "JPM",
  "BAC",
  "WMT",
  "JNJ",
  "UNH",
  "HD",
  "DIS",
  "V",
  "MA",
  /** Uber Technologies — NYSE (not NASDAQ) */
  "UBER",
  /** Salesforce — NYSE */
  "CRM",
]);

/** ETFs / indices often listed on ARCA */
const ARCA = new Set([
  "SPY",
  "QQQ",
  "IWM",
  "DIA",
  "VOO",
  "VTI",
  "XLF",
  "XLE",
]);

export function usTickerToTradingViewSymbol(ticker: string): string {
  const s = ticker.trim().toUpperCase();
  if (!s) return "NASDAQ:AAPL";

  if (ARCA.has(s)) return `AMEX:${s}`;
  if (NYSE.has(s)) return `NYSE:${s}`;
  return `NASDAQ:${s}`;
}
