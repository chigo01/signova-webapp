import { describe, expect, it } from "vitest";
import { distillUserReasoning, toLockedSignal } from "./signals";

describe("toLockedSignal", () => {
  it("passes the public release timestamp through to guest signal cards", () => {
    const signal = toLockedSignal({
      _id: "signal-1",
      pair: "EUR/USD",
      direction: "BUY",
      timestamp: "2026-07-16T10:00:00.000Z",
      approvedAt: "2026-07-16T14:30:00.000Z",
      entryPrice: 1.2345,
      takeProfit1: 1.24,
    });

    expect(signal).toMatchObject({
      _id: "signal-1",
      pair: "EUR/USD",
      direction: "BUY",
      timestamp: "2026-07-16T10:00:00.000Z",
      approvedAt: "2026-07-16T14:30:00.000Z",
      entryPrice: 1.2345,
      exitTargets: { takeProfit1: 1.24 },
    });
  });

  it("uses an empty timestamp when an older public response omits it", () => {
    expect(
      toLockedSignal({
        _id: "signal-1",
        pair: "EUR/USD",
        direction: "BUY",
      }).timestamp,
    ).toBe("");
  });

  it("leaves approvedAt undefined when the public response omits it", () => {
    expect(
      toLockedSignal({
        _id: "signal-1",
        pair: "EUR/USD",
        direction: "BUY",
        timestamp: "2026-07-16T10:00:00.000Z",
      }).approvedAt,
    ).toBeUndefined();
  });
});

describe("distillUserReasoning", () => {
  const essay = `The best setup here is a BUY on the 1h timeframe, despite the bearish news backdrop, because the 1h indicators are at extreme oversold levels that strongly favor a mean-reversion bounce — but confidence must be tempered by the news headwind. **1h oversold extremes:** RSI at 21.2 (deeply oversold), Stochastic K at 3.0 / D at 2.7 (extreme oversold). These readings on the 1h are rare and historically produce snapback rallies. **4h context supports a bounce:** The 4h MACD is bullish (line 0.000462 > signal 0.000416). **Conflict with news:** Article [2] describes AUD/USD sliding on Iran risk/USD safe-haven demand.`;

  it("turns a Model 4 markdown essay into a handful of short bullets", () => {
    const bullets = distillUserReasoning(essay);
    expect(bullets.length).toBeGreaterThan(1);
    expect(bullets.length).toBeLessThanOrEqual(4);
    expect(bullets.some((line) => line.includes("**"))).toBe(false);
    expect(bullets.every((line) => line.length <= 161)).toBe(true);
    expect(bullets[0]).toMatch(/BUY on the 1h/i);
    expect(bullets.some((line) => /news|article|conflict/i.test(line))).toBe(
      true,
    );
  });

  it("leaves a short existing bullet alone", () => {
    expect(distillUserReasoning("RSI oversold (< 30) - strong buy signal")).toEqual([
      "RSI oversold (< 30) - strong buy signal",
    ]);
  });
});
