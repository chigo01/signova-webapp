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

export function isNgxTicker(symbol: string): boolean {
  return NGX_SYMBOL_SET.has(symbol.trim().toUpperCase());
}
