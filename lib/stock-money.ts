export type StockCurrency = "USD" | "NGN";

export function formatStockPrice(
  price: number,
  currency: StockCurrency = "USD",
): string {
  if (!Number.isFinite(price) || price <= 0) return "—";
  if (currency === "NGN") {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  }
  return `$${price.toFixed(2)}`;
}

/** Finnhub market cap is millions of USD. */
export function formatUsdMarketCapMillions(millions: number): string {
  if (!Number.isFinite(millions) || millions <= 0) return "—";
  if (millions >= 1_000_000) {
    return `$${(millions / 1_000_000).toFixed(2)}T`;
  }
  if (millions >= 1_000) {
    return `$${(millions / 1_000).toFixed(2)}B`;
  }
  return `$${millions.toFixed(0)}M`;
}

/** NGX market cap from the board feed is absolute naira. */
export function formatNgnMarketCap(naira: number): string {
  if (!Number.isFinite(naira) || naira <= 0) return "—";
  if (naira >= 1_000_000_000_000) {
    return `₦${(naira / 1_000_000_000_000).toFixed(2)}T`;
  }
  if (naira >= 1_000_000_000) {
    return `₦${(naira / 1_000_000_000).toFixed(2)}B`;
  }
  if (naira >= 1_000_000) {
    return `₦${(naira / 1_000_000).toFixed(2)}M`;
  }
  return formatStockPrice(naira, "NGN");
}
