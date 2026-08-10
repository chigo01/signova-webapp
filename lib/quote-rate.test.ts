import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchUsdPerUnit, resetQuoteRateCache } from "./quote-rate";

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
