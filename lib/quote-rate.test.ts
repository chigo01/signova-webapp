import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchAccountPerQuoteUnit,
  fetchUsdPerUnit,
  NGN_PER_USD,
  peekUsdPerUnit,
  resetQuoteRateCache,
} from "./quote-rate";

/** Answers like /candles: a known symbol returns a bar, anything else noData. */
function stubCandles(closes: Record<string, number>, ok = true) {
  const fetchMock = vi.fn(async (url: string) => {
    const symbol = new URL(url, "http://localhost").searchParams.get("pair")!;
    const close = closes[symbol];
    return {
      ok,
      json: async () =>
        close === undefined
          ? { bars: [], noData: true }
          : { bars: [{ close }], noData: false },
    } as Response;
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

beforeEach(() => {
  resetQuoteRateCache();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchUsdPerUnit", () => {
  it("reads the direct leg, which already quotes USD per unit", async () => {
    const fetchMock = stubCandles({ AUDUSD: 0.70599 });

    expect(await fetchUsdPerUnit("AUD")).toBe(0.70599);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toContain("pair=AUDUSD");
  });

  it("inverts the other leg for currencies quoted against USD", async () => {
    const fetchMock = stubCandles({ USDJPY: 157 });

    expect(await fetchUsdPerUnit("JPY")).toBeCloseTo(1 / 157, 10);
    // Direct leg first, inverse only as a fallback.
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toContain("pair=JPYUSD");
    expect(fetchMock.mock.calls[1][0]).toContain("pair=USDJPY");
  });

  it("short-circuits USD without a request", async () => {
    const fetchMock = stubCandles({});

    expect(await fetchUsdPerUnit("USD")).toBe(1);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("uses the fixed Naira rate instead of the candle feed", async () => {
    const fetchMock = stubCandles({ USDNGN: 1600, NGNUSD: 0.0007 });

    expect(await fetchUsdPerUnit("NGN")).toBe(1 / NGN_PER_USD);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("caches a resolved rate instead of refetching", async () => {
    const fetchMock = stubCandles({ AUDUSD: 0.70599 });

    await fetchUsdPerUnit("AUD");
    await fetchUsdPerUnit("AUD");

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("shares one in-flight request between concurrent callers", async () => {
    const fetchMock = stubCandles({ AUDUSD: 0.70599 });

    const [a, b] = await Promise.all([
      fetchUsdPerUnit("AUD"),
      fetchUsdPerUnit("AUD"),
    ]);

    expect(a).toBe(0.70599);
    expect(b).toBe(0.70599);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns null when neither leg is priced", async () => {
    stubCandles({});
    expect(await fetchUsdPerUnit("JPY")).toBeNull();
  });

  it("returns null on a network failure rather than throwing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("offline");
      }),
    );

    await expect(fetchUsdPerUnit("AUD")).resolves.toBeNull();
  });

  it("returns null on a non-ok response", async () => {
    stubCandles({ AUDUSD: 0.70599 }, false);
    expect(await fetchUsdPerUnit("AUD")).toBeNull();
  });

  it.each([["", "AU", "AUDX", "12A"]].flat())(
    "rejects %s without a request",
    async (code) => {
      const fetchMock = stubCandles({});

      expect(await fetchUsdPerUnit(code)).toBeNull();
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it("does not cache a failed lookup", async () => {
    stubCandles({});
    expect(await fetchUsdPerUnit("AUD")).toBeNull();

    stubCandles({ AUDUSD: 0.70599 });
    expect(await fetchUsdPerUnit("AUD")).toBe(0.70599);
  });
});

describe("peekUsdPerUnit", () => {
  it("answers USD without a request", () => {
    const fetchMock = stubCandles({});
    expect(peekUsdPerUnit("USD")).toBe(1);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("answers NGN from the fixed rate without a request or a warm cache", () => {
    const fetchMock = stubCandles({});
    expect(peekUsdPerUnit("NGN")).toBe(1 / NGN_PER_USD);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns null for a cold currency, never fetching", () => {
    const fetchMock = stubCandles({ AUDUSD: 0.70599 });
    expect(peekUsdPerUnit("AUD")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns a warmed rate, and forgets it after a reset", async () => {
    stubCandles({ AUDUSD: 0.70599 });
    await fetchUsdPerUnit("AUD");

    expect(peekUsdPerUnit("AUD")).toBe(0.70599);

    resetQuoteRateCache();
    expect(peekUsdPerUnit("AUD")).toBeNull();
  });
});

describe("fetchAccountPerQuoteUnit", () => {
  it.each([["USD"], ["JPY"], ["BTC"]])(
    "is exactly 1 with no request when the account is held in %s and the pair is quoted in it",
    async (code) => {
      const fetchMock = stubCandles({});

      expect(await fetchAccountPerQuoteUnit(code, code)).toEqual({
        rate: 1,
        missing: "none",
      });
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it("converts USD into Naira at the fixed 1400 without a request", async () => {
    const fetchMock = stubCandles({});

    expect(await fetchAccountPerQuoteUnit("USD", "NGN")).toEqual({
      rate: NGN_PER_USD,
      missing: "none",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("leaves a USD account's rate bit-identical to the raw quote leg", async () => {
    stubCandles({ JPYUSD: 0.0063694 });

    const composed = await fetchAccountPerQuoteUnit("JPY", "USD");

    // Dividing by an exact 1 must not perturb the value — the modal renders
    // this to six significant figures and the string has to stay stable.
    expect(composed.rate).toBe(0.0063694);
    expect(composed.missing).toBe("none");
  });

  it("inverts when the account currency is the quoted one", async () => {
    stubCandles({ AUDUSD: 0.70559 });

    const { rate } = await fetchAccountPerQuoteUnit("USD", "AUD");

    expect(rate).toBeCloseTo(1 / 0.70559, 10);
  });

  it("composes two non-USD legs", async () => {
    stubCandles({ JPYUSD: 0.0063694, AUDUSD: 0.70559 });

    const { rate } = await fetchAccountPerQuoteUnit("JPY", "AUD");

    expect(rate).toBeCloseTo(0.0063694 / 0.70559, 12);
  });

  it.each([
    // Only the account leg (AUD) prices, so the quote leg is what's missing.
    [{ AUDUSD: 0.70559 }, "quote" as const],
    // Only the quote leg (JPY) prices, so the account leg is what's missing.
    [{ JPYUSD: 0.0063694 }, "account" as const],
    [{}, "both" as const],
  ])("names the unpriced leg: %o -> %s", async (closes, missing) => {
    stubCandles(closes);

    // Quote JPY, account AUD: whichever of the two the stub omits is the one
    // reported, so the caller can say which currency needs a manual rate.
    expect(await fetchAccountPerQuoteUnit("JPY", "AUD")).toEqual({
      rate: null,
      missing,
    });
  });

  it("reports the account leg when a crypto account can't be priced", async () => {
    stubCandles({ JPYUSD: 0.0063694 });

    expect(await fetchAccountPerQuoteUnit("JPY", "BTC")).toEqual({
      rate: null,
      missing: "account",
    });
  });

  it("prices a crypto account when the feed carries it", async () => {
    stubCandles({ BTCUSD: 95_000 });

    const { rate } = await fetchAccountPerQuoteUnit("USD", "BTC");

    expect(rate).toBeCloseTo(1 / 95_000, 12);
  });

  it("rides the existing dedupe rather than adding a second cache", async () => {
    const fetchMock = stubCandles({ JPYUSD: 0.0063694, AUDUSD: 0.70559 });

    await Promise.all([
      fetchAccountPerQuoteUnit("JPY", "AUD"),
      fetchAccountPerQuoteUnit("JPY", "AUD"),
    ]);

    // One request per leg, not per call.
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
