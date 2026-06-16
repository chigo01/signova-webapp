/**
 * Map US ticker (e.g. MSFT) to a TradingView symbol for the advanced chart widget.
 *
 * For individual stocks we pass the bare ticker and let TradingView resolve it to the
 * primary listing. Hardcoding an exchange prefix (e.g. NASDAQ:) breaks NYSE-listed names
 * (RBLX, SPOT, F, ...) and goes stale when a stock changes exchange (e.g. PLTR NYSE→NASDAQ).
 * ETFs / indices keep an explicit AMEX prefix where bare resolution is more ambiguous.
 */
const ARCA = new Set([
  "SPY",
  "QQQ",
  "IWM",
  "DIA",
  "VOO",
  "VTI",
  "XLF",
  "XLE",
  "GLD",
  "TLT",
]);

export function usTickerToTradingViewSymbol(ticker: string): string {
  const s = ticker.trim().toUpperCase();
  if (!s) return "AAPL";

  if (ARCA.has(s)) return `AMEX:${s}`;
  return s; // bare symbol; TradingView resolves to the primary listing
}
