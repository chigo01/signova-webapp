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
  it("round trips balance and risk so they're typed once per device", () => {
    writeLotSizeSettings({ accountBalance: 25_000, riskPercent: 0.5 });
    expect(readLotSizeSettings()).toEqual({
      accountBalance: 25_000,
      riskPercent: 0.5,
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
    });
  });
});
