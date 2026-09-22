/**
 * Symbols on the curated Korea Exchange board.
 * Must match signova_server/src/config/krxBoard.ts.
 */
export const KRX_SYMBOLS = [
  "005930",
  "000660",
  "402340",
  "009150",
  "005380",
  "373220",
  "207940",
  "105560",
  "028260",
  "012450",
  "034020",
  "032830",
  "055550",
  "329180",
  "000270",
  "006400",
  "068270",
  "086790",
  "066570",
  "012330",
  "034730",
  "010120",
  "035420",
  "298040",
  "316140",
  "267260",
  "000810",
  "042660",
  "009540",
  "005490",
] as const;

const KRX_SYMBOL_SET = new Set<string>(KRX_SYMBOLS);

export function isKrxTicker(symbol: string): boolean {
  return KRX_SYMBOL_SET.has(symbol.trim().toUpperCase());
}
