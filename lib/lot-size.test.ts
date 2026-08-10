import { describe, expect, it } from "vitest";
import {
  CALCULATOR_INSTRUMENTS,
  calculateLotSize,
  resolveInstrument,
  type InstrumentSpec,
} from "./lot-size";

function instrument(pair: string): InstrumentSpec {
  const spec = resolveInstrument(pair);
  if (!spec) throw new Error(`expected ${pair} to resolve`);
  return spec;
}

describe("resolveInstrument", () => {
  it.each([
    ["EUR/USD", "EURUSD", 100_000, 0.0001],
    ["EURUSD", "EURUSD", 100_000, 0.0001],
    ["eur/usd", "EURUSD", 100_000, 0.0001],
    ["OANDA:EURUSD", "EURUSD", 100_000, 0.0001],
    // The Binance mapping hands back USDT-quoted symbols; USDT is USD for sizing.
    ["EURUSDT", "EURUSD", 100_000, 0.0001],
    // JPY is quoted two orders of magnitude coarser, so its pip is 0.01.
    ["USD/JPY", "USDJPY", 100_000, 0.01],
    ["GBP/JPY", "GBPJPY", 100_000, 0.01],
    // Metals carry their own contract sizes, not the 100k forex lot.
    ["XAU/USD", "XAUUSD", 100, 0.1],
    ["XAGUSD", "XAGUSD", 5000, 0.001],
  ])("resolves %s to %s", (pair, symbol, contractSize, pipSize) => {
    expect(resolveInstrument(pair)).toMatchObject({
      symbol,
      contractSize,
      pipSize,
    });
  });

  it.each([
    ["BTCUSD"],
    ["BTC/USD"],
    ["BTCUSDT"],
    ["ETH/USD"],
    ["AAPL"],
    ["US30"],
    ["USDUSD"],
    [""],
  ])("returns null for %s so the calculator stays hidden", (pair) => {
    expect(resolveInstrument(pair)).toBeNull();
  });

  it("offers every supported forex and metal pair, and no crypto", () => {
    expect(CALCULATOR_INSTRUMENTS).toHaveLength(28);
    expect(CALCULATOR_INSTRUMENTS.map((i) => i.symbol)).toEqual(
      expect.arrayContaining(["EURUSD", "USDJPY", "XAUUSD", "XAGUSD"]),
    );
    expect(CALCULATOR_INSTRUMENTS.map((i) => i.symbol)).not.toContain("BTCUSD");
  });
});

describe("calculateLotSize", () => {
  it("sizes a USD-quoted pair off the raw stop distance", () => {
    // 30 pip stop, $100 of risk: $300 lost per lot, so 0.333 -> 0.33 lots.
    const result = calculateLotSize({
      instrument: instrument("EUR/USD"),
      accountBalance: 10_000,
      riskPercent: 1,
      entryPrice: 1.0842,
      stopLoss: 1.0812,
      direction: "BUY",
    });

    expect(result.error).toBeUndefined();
    expect(result.warnings).toEqual([]);
    expect(result.quoteRateSource).toBe("quote-is-usd");
    expect(result.quoteRate).toBe(1);
    expect(result.riskAmount).toBeCloseTo(100, 6);
    expect(result.stopPips).toBeCloseTo(30, 6);
    expect(result.riskPerLot).toBeCloseTo(300, 6);
    expect(result.lots).toBeCloseTo(0.3333, 4);
    expect(result.roundedLots).toBeCloseTo(0.33, 6);
    expect(result.units).toBeCloseTo(33_000, 6);
    expect(result.valuePerPip).toBeCloseTo(3.3, 6);
    // Flooring to the lot step leaves slightly less than the full risk budget.
    expect(result.actualRisk).toBeCloseTo(99, 6);
  });

  it("converts a USD-based pair using the entry price as the rate", () => {
    // USD/JPY at 157 means risk is earned in JPY: 50000 JPY / 157 = $318.47 per lot.
    const result = calculateLotSize({
      instrument: instrument("USD/JPY"),
      accountBalance: 10_000,
      riskPercent: 1,
      entryPrice: 157,
      stopLoss: 156.5,
      direction: "BUY",
    });

    expect(result.quoteRateSource).toBe("derived-from-entry");
    expect(result.quoteRate).toBeCloseTo(1 / 157, 10);
    expect(result.stopPips).toBeCloseTo(50, 6);
    expect(result.riskPerLot).toBeCloseTo(318.4713, 4);
    expect(result.lots).toBeCloseTo(0.314, 6);
    expect(result.roundedLots).toBeCloseTo(0.31, 6);
    expect(result.valuePerPip).toBeCloseTo(1.9745, 4);
  });

  it("uses the metal contract size for gold", () => {
    // 100 oz per lot over a $10 stop = $1,000 per lot, so 2% of $50k is exactly 1 lot.
    const result = calculateLotSize({
      instrument: instrument("XAU/USD"),
      accountBalance: 50_000,
      riskPercent: 2,
      entryPrice: 2350,
      stopLoss: 2340,
      direction: "BUY",
    });

    expect(result.stopPips).toBeCloseTo(100, 6);
    expect(result.riskPerLot).toBeCloseTo(1000, 6);
    expect(result.roundedLots).toBeCloseTo(1, 6);
    expect(result.units).toBeCloseTo(100, 6);
    expect(result.valuePerPip).toBeCloseTo(10, 6);
    expect(result.actualRisk).toBeCloseTo(1000, 6);
  });

  it("warns and leaves a cross pair unconverted when no rate is supplied", () => {
    const result = calculateLotSize({
      instrument: instrument("EUR/JPY"),
      accountBalance: 10_000,
      riskPercent: 1,
      entryPrice: 170,
      stopLoss: 169,
      direction: "BUY",
    });

    expect(result.error).toBeUndefined();
    expect(result.quoteRateSource).toBe("assumed");
    expect(result.quoteRate).toBe(1);
    expect(result.warnings[0]).toContain("cross pair");
    expect(result.warnings[0]).toContain("1 JPY");
    // Treating JPY as USD makes the stop look ~157x more expensive than it is,
    // which sizes the position into nothing — a second, corroborating warning.
    expect(result.roundedLots).toBe(0);
    expect(result.warnings.join(" ")).toContain("below the 0.01 minimum");
  });

  it.each([
    ["live" as const],
    ["manual" as const],
  ])("converts a cross pair with a %s quote rate", (origin) => {
    // 100 pip stop on 100k units of JPY exposure = 100,000 JPY = $636.94 per lot.
    const result = calculateLotSize({
      instrument: instrument("EUR/JPY"),
      accountBalance: 10_000,
      riskPercent: 1,
      entryPrice: 170,
      stopLoss: 169,
      direction: "BUY",
      quoteRateOverride: 1 / 157,
      quoteRateOrigin: origin,
    });

    // The rate does the same work either way; only its provenance differs.
    expect(result.quoteRateSource).toBe(origin);
    expect(result.warnings).toEqual([]);
    expect(result.riskPerLot).toBeCloseTo(636.9427, 4);
    expect(result.roundedLots).toBeCloseTo(0.15, 6);
  });

  it("treats an override as manual when no origin is given", () => {
    const result = calculateLotSize({
      instrument: instrument("EUR/JPY"),
      accountBalance: 10_000,
      riskPercent: 1,
      entryPrice: 170,
      stopLoss: 169,
      direction: "BUY",
      quoteRateOverride: 1 / 157,
    });

    expect(result.quoteRateSource).toBe("manual");
  });

  it("reports reward targets as R multiples of the risk", () => {
    const result = calculateLotSize({
      instrument: instrument("EUR/USD"),
      accountBalance: 10_000,
      riskPercent: 1,
      entryPrice: 1.1,
      stopLoss: 1.095,
      direction: "BUY",
      takeProfit1: 1.105,
      takeProfit2: 1.115,
    });

    expect(result.targets).toHaveLength(2);
    expect(result.targets[0]).toMatchObject({ label: "TP1", price: 1.105 });
    expect(result.targets[0].rMultiple).toBeCloseTo(1, 6);
    expect(result.targets[1].rMultiple).toBeCloseTo(3, 6);
    // 0.2 lots at 50 pips risks $100; TP2 at 3R returns triple that.
    expect(result.targets[0].profit).toBeCloseTo(result.actualRisk, 6);
    expect(result.targets[1].profit).toBeCloseTo(result.actualRisk * 3, 6);
  });

  it("counts a downward move as profit on a SELL", () => {
    const result = calculateLotSize({
      instrument: instrument("EUR/USD"),
      accountBalance: 10_000,
      riskPercent: 1,
      entryPrice: 1.1,
      stopLoss: 1.105,
      direction: "SELL",
      takeProfit1: 1.09,
    });

    expect(result.warnings).toEqual([]);
    expect(result.targets[0].rMultiple).toBeCloseTo(2, 6);
    expect(result.targets[0].profit).toBeGreaterThan(0);
  });

  it("infers the side from the stop when the signal is HOLD", () => {
    const result = calculateLotSize({
      instrument: instrument("EUR/USD"),
      accountBalance: 10_000,
      riskPercent: 1,
      entryPrice: 1.1,
      stopLoss: 1.105,
      direction: "HOLD",
      takeProfit1: 1.09,
    });

    expect(result.warnings).toEqual([]);
    expect(result.targets[0].rMultiple).toBeCloseTo(2, 6);
  });

  it("flags a stop loss on the wrong side of entry", () => {
    const result = calculateLotSize({
      instrument: instrument("EUR/USD"),
      accountBalance: 10_000,
      riskPercent: 1,
      entryPrice: 1.1,
      stopLoss: 1.105,
      direction: "BUY",
    });

    expect(result.error).toBeUndefined();
    expect(result.warnings).toContain(
      "Stop loss is on the wrong side of entry for a BUY trade.",
    );
  });

  it("warns when risk exceeds a sane share of the account", () => {
    const result = calculateLotSize({
      instrument: instrument("EUR/USD"),
      accountBalance: 10_000,
      riskPercent: 8,
      entryPrice: 1.1,
      stopLoss: 1.095,
      direction: "BUY",
    });

    expect(result.warnings.join(" ")).toContain("aggressive");
  });

  it("warns when the position rounds below the minimum lot", () => {
    const result = calculateLotSize({
      instrument: instrument("EUR/USD"),
      accountBalance: 100,
      riskPercent: 0.5,
      entryPrice: 1.1,
      stopLoss: 1.09,
      direction: "BUY",
    });

    expect(result.error).toBeUndefined();
    expect(result.roundedLots).toBe(0);
    expect(result.units).toBe(0);
    expect(result.actualRisk).toBe(0);
    expect(result.warnings.join(" ")).toContain("below the 0.01 minimum");
  });

  it.each([
    [{ accountBalance: 0 }, "account balance"],
    [{ accountBalance: Number.NaN }, "account balance"],
    [{ riskPercent: 0 }, "risk percentage"],
    [{ riskPercent: 101 }, "100%"],
    [{ entryPrice: 0 }, "entry price"],
    [{ stopLoss: 0 }, "stop loss"],
    [{ stopLoss: 1.1 }, "equal the entry price"],
  ])("rejects %o", (override, expected) => {
    const result = calculateLotSize({
      instrument: instrument("EUR/USD"),
      accountBalance: 10_000,
      riskPercent: 1,
      entryPrice: 1.1,
      stopLoss: 1.095,
      direction: "BUY",
      ...override,
    });

    expect(result.error).toContain(expected);
    expect(result.roundedLots).toBe(0);
    expect(result.targets).toEqual([]);
  });
});
