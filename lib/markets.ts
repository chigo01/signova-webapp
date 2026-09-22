import { isKrxTicker } from "@/lib/krx";
import { isNgxTicker } from "@/lib/ngx";

export type StockMarket = "US" | "NGX" | "KRX";

export function stockMarketOf(symbol: string, market?: string | null): StockMarket {
  const requested = market?.trim().toLowerCase();
  if (requested === "ngx") return "NGX";
  if (requested === "krx") return "KRX";
  if (requested === "us") return "US";
  if (isKrxTicker(symbol)) return "KRX";
  if (isNgxTicker(symbol)) return "NGX";
  return "US";
}

export function stockDetailPath(symbol: string, market: StockMarket = "US"): string {
  const params = new URLSearchParams({
    ticker: symbol.trim().toUpperCase(),
  });
  if (market === "NGX") params.set("market", "ngx");
  if (market === "KRX") params.set("market", "krx");
  return `/dashboard/stock-detail?${params.toString()}`;
}
