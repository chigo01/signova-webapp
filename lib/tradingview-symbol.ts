/**
 * Map signal `pair` strings (e.g. "EUR/USD", "EURUSD") to TradingView widget symbols.
 * Uses OANDA for spot FX/metals where available; common crypto maps to Binance USDT pairs.
 */
export function pairToTradingViewSymbol(pair: string): string {
  const compact = pair.replace(/[/\s-]/g, "").toUpperCase();

  const map: Record<string, string> = {
    EURUSD: "OANDA:EURUSD",
    GBPUSD: "OANDA:GBPUSD",
    AUDUSD: "OANDA:AUDUSD",
    NZDUSD: "OANDA:NZDUSD",
    USDJPY: "OANDA:USDJPY",
    USDCAD: "OANDA:USDCAD",
    USDCHF: "OANDA:USDCHF",
    EURJPY: "OANDA:EURJPY",
    GBPJPY: "OANDA:GBPJPY",
    XAUUSD: "OANDA:XAUUSD",
    XAGUSD: "OANDA:XAGUSD",
    BTCUSD: "BINANCE:BTCUSDT",
    ETHUSD: "BINANCE:ETHUSDT",
    BTCUSDT: "BINANCE:BTCUSDT",
    ETHUSDT: "BINANCE:ETHUSDT",
  };

  if (map[compact]) return map[compact];

  // Typical 6-letter FX crosses (e.g. EURGBP) — OANDA lists many of these
  if (/^[A-Z]{6}$/.test(compact)) {
    return `OANDA:${compact}`;
  }

  return "OANDA:EURUSD";
}
