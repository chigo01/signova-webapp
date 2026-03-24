/**
 * Map UI pair strings (e.g. "EUR/USD") to Binance spot symbols (e.g. "EURUSDT").
 * Falls back to BTCUSDT when no mapping exists — always a valid Binance pair.
 */
export function pairToBinanceSymbol(pair: string): string {
  const compact = pair.replace(/[/\s-]/g, "").toUpperCase();

  const map: Record<string, string> = {
    EURUSD: "EURUSDT",
    GBPUSD: "GBPUSDT",
    AUDUSD: "AUDUSDT",
    BTCUSD: "BTCUSDT",
    ETHUSD: "ETHUSDT",
    XAUUSD: "PAXGUSDT",
    USDTNGN: "USDTNGN",
    BTCUSDT: "BTCUSDT",
    ETHUSDT: "ETHUSDT",
    BNBUSDT: "BNBUSDT",
    SOLUSDT: "SOLUSDT",
  };

  if (map[compact]) return map[compact];
  if (/^[A-Z0-9]{6,}$/.test(compact) && compact.endsWith("USDT")) return compact;

  return "BTCUSDT";
}

/** Map Signal Vault timeframe values to Binance kline intervals */
export function timeframeToBinanceInterval(tf: string): string {
  const m: Record<string, string> = {
    "1m": "1m",
    "5m": "5m",
    "15m": "15m",
    "30m": "30m",
    "1h": "1h",
    "2h": "2h",
    "4h": "4h",
    "1d": "1d",
    "1w": "1w",
    "1M": "1M",
    all: "1d",
  };
  return m[tf] ?? "1h";
}
