import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_LOT_SIZE_SETTINGS,
  readLotSizeSettings,
  writeLotSizeSettings,
} from "./lot-size-settings";

// Node 22 exposes its own experimental `localStorage` global, which shadows
// jsdom's and is inert without --localstorage-file. Stub a working in-memory
// Storage so the round trip exercises real read/write behaviour.
beforeEach(() => {
  const store = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, String(value)),
    removeItem: (key: string) => void store.delete(key),
    clear: () => store.clear(),
    key: (index: number) => [...store.keys()][index] ?? null,
    get length() {
      return store.size;
    },
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("lot size settings", () => {
  it("round trips balance, risk and currency so they're typed once per device", () => {
    writeLotSizeSettings({
      accountBalance: 25_000,
      riskPercent: 0.5,
      accountCurrency: "JPY",
      costBufferPercent: 10,
      minimumLotSize: 0.1,
      maximumLotSize: 50,
      lotStep: 0.001,
    });
    expect(readLotSizeSettings()).toEqual({
      accountBalance: 25_000,
      riskPercent: 0.5,
      accountCurrency: "JPY",
      costBufferPercent: 10,
      minimumLotSize: 0.1,
      maximumLotSize: 50,
      lotStep: 0.001,
    });
  });

  it("falls back to defaults when nothing is stored", () => {
    expect(readLotSizeSettings()).toEqual(DEFAULT_LOT_SIZE_SETTINGS);
  });

  it.each([
    ["not json at all"],
    ['{"accountBalance":0,"riskPercent":0}'],
    ['{"accountBalance":"abc","riskPercent":null}'],
    ["null"],
  ])("ignores unusable stored value %s", (raw) => {
    window.localStorage.setItem("signova_lot_size_settings", raw);
    expect(readLotSizeSettings()).toEqual(DEFAULT_LOT_SIZE_SETTINGS);
  });

  it("keeps a valid field when only the other one is unusable", () => {
    window.localStorage.setItem(
      "signova_lot_size_settings",
      '{"accountBalance":25000,"riskPercent":-2}',
    );
    expect(readLotSizeSettings()).toEqual({
      accountBalance: 25_000,
      riskPercent: DEFAULT_LOT_SIZE_SETTINGS.riskPercent,
      accountCurrency: DEFAULT_LOT_SIZE_SETTINGS.accountCurrency,
      costBufferPercent: DEFAULT_LOT_SIZE_SETTINGS.costBufferPercent,
      minimumLotSize: DEFAULT_LOT_SIZE_SETTINGS.minimumLotSize,
      maximumLotSize: DEFAULT_LOT_SIZE_SETTINGS.maximumLotSize,
      lotStep: DEFAULT_LOT_SIZE_SETTINGS.lotStep,
    });
  });

  it("upgrades a payload stored before currencies existed", () => {
    window.localStorage.setItem(
      "signova_lot_size_settings",
      '{"accountBalance":25000,"riskPercent":2}',
    );
    expect(readLotSizeSettings()).toEqual({
      accountBalance: 25_000,
      riskPercent: 2,
      accountCurrency: "USD",
      costBufferPercent: 0,
      minimumLotSize: 0.01,
      maximumLotSize: undefined,
      lotStep: 0.01,
    });
  });

  it.each([
    ['"XAU"', "a currency we can't price"],
    ['"usd"', "the right code in the wrong case"],
    ["42", "a non-string"],
    ["null", "an explicit null"],
  ])("rejects %s as a currency (%s)", (raw) => {
    window.localStorage.setItem(
      "signova_lot_size_settings",
      `{"accountBalance":25000,"riskPercent":2,"accountCurrency":${raw}}`,
    );
    expect(readLotSizeSettings().accountCurrency).toBe("USD");
    // A bad currency must not discard the rest of the payload.
    expect(readLotSizeSettings().accountBalance).toBe(25_000);
  });
});
