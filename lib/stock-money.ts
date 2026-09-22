export type StockCurrency = "USD" | "NGN" | "KRW";

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
  if (currency === "KRW") {
    return new Intl.NumberFormat("ko-KR", {
      style: "currency",
      currency: "KRW",
      maximumFractionDigits: 0,
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

/** Local board market cap is an absolute amount, not millions. */
export function formatAbsoluteMarketCap(
  value: number,
  currency: "NGN" | "KRW",
): string {
  const mark = currency === "KRW" ? "₩" : "₦";
  if (!Number.isFinite(value) || value <= 0) return "—";
  if (value >= 1_000_000_000_000) {
    return `${mark}${(value / 1_000_000_000_000).toFixed(2)}T`;
  }
  if (value >= 1_000_000_000) {
    return `${mark}${(value / 1_000_000_000).toFixed(2)}B`;
  }
  if (value >= 1_000_000) {
    return `${mark}${(value / 1_000_000).toFixed(2)}M`;
  }
  return formatStockPrice(value, currency);
}

export function formatNgnMarketCap(naira: number): string {
  return formatAbsoluteMarketCap(naira, "NGN");
}
