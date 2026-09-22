/**
 * Symbols on the curated Nigerian Exchange board.
 * Must match signova_server/src/config/ngxBoard.ts.
 */
export const NGX_SYMBOLS = [
  "AIRTELAFRI",
  "MTNN",
  "DANGCEM",
  "BUAFOODS",
  "BUACEMENT",
  "SEPLAT",
  "FIRSTHOLDCO",
  "ARADEL",
  "HBMNG",
  "ZENITHBANK",
  "GTCO",
  "TRANSCOHOT",
  "STANBIC",
  "NB",
  "PRESCO",
  "NESTLE",
  "GEREGU",
  "UBA",
  "INTBREW",
  "ACCESSCORP",
  "DANGSUGAR",
  "TRANSPOWER",
  "WEMABANK",
  "FIDELITYBK",
  "OKOMUOIL",
  "ETI",
  "GUINNESS",
  "FCMB",
  "UNILEVER",
  "NGXGROUP",
] as const;

const NGX_SYMBOL_SET = new Set<string>(NGX_SYMBOLS);

export type StockMarket = "US" | "NGX";

export function isNgxTicker(symbol: string): boolean {
  return NGX_SYMBOL_SET.has(symbol.trim().toUpperCase());
}

export function stockMarketOf(symbol: string, market?: string | null): StockMarket {
  const requested = market?.trim().toLowerCase();
  if (requested === "ngx") return "NGX";
  if (requested === "us") return "US";
  return isNgxTicker(symbol) ? "NGX" : "US";
}

export function stockDetailPath(symbol: string, market: StockMarket = "US"): string {
  const params = new URLSearchParams({
    ticker: symbol.trim().toUpperCase(),
  });
  if (market === "NGX") params.set("market", "ngx");
  return `/dashboard/stock-detail?${params.toString()}`;
}
