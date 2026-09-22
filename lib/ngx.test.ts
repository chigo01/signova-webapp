import { describe, expect, it } from "vitest";
import { isNgxTicker, stockDetailPath, stockMarketOf } from "./ngx";
import { tickerToTradingViewSymbol } from "./tradingview-us-stock";
import {
  formatNgnMarketCap,
  formatStockPrice,
  formatUsdMarketCapMillions,
} from "./stock-money";

describe("Nigerian listings", () => {
  it("routes curated tickers to the Nigerian Exchange chart", () => {
    expect(isNgxTicker("dangcem")).toBe(true);
    expect(isNgxTicker("AAPL")).toBe(false);
    expect(tickerToTradingViewSymbol("DANGCEM", "NGX")).toBe("NSENG:DANGCEM");
    expect(tickerToTradingViewSymbol("AAPL")).toBe("AAPL");
    expect(tickerToTradingViewSymbol("SPY")).toBe("AMEX:SPY");
    expect(stockMarketOf("DANGCEM", null)).toBe("NGX");
    expect(stockMarketOf("DANGCEM", "us")).toBe("US");
    expect(stockDetailPath("DANGCEM", "NGX")).toBe(
      "/dashboard/stock-detail?ticker=DANGCEM&market=ngx",
    );
  });

  it("formats naira prices and absolute market cap", () => {
    expect(formatStockPrice(1050, "NGN")).toBe("₦1,050.00");
    expect(formatStockPrice(134.1, "NGN")).toBe("₦134.10");
    expect(formatStockPrice(0, "NGN")).toBe("—");
    expect(formatStockPrice(189.5)).toBe("$189.50");
    expect(formatNgnMarketCap(17_414_465_332_031)).toBe("₦17.41T");
    expect(formatUsdMarketCapMillions(1000)).toBe("$1.00B");
  });
});
