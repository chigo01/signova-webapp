import { describe, expect, it } from "vitest";
import { toLockedSignal } from "./signals";

describe("toLockedSignal", () => {
  it("passes the public release timestamp through to guest signal cards", () => {
    const signal = toLockedSignal({
      _id: "signal-1",
      pair: "EUR/USD",
      direction: "BUY",
      timestamp: "2026-07-16T10:00:00.000Z",
      entryPrice: 1.2345,
      takeProfit1: 1.24,
    });

    expect(signal).toMatchObject({
      _id: "signal-1",
      pair: "EUR/USD",
      direction: "BUY",
      timestamp: "2026-07-16T10:00:00.000Z",
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
});
