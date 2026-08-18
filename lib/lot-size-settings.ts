// Account balance, currency and risk % for the lot size calculator, persisted
// locally.
//
// These values are identical for every signal, so making the user retype them on
// each card would be the whole feature's friction. There's no server-side notion
// of a trading account (lib/auth-user.ts has no such field, and lib/payments.ts
// "balance" is subscription credit), so this is device-local.

import {
  DEFAULT_ACCOUNT_CURRENCY,
  isAccountCurrency,
} from "./account-currency";

const STORAGE_KEY = "signova_lot_size_settings";

export interface LotSizeSettings {
  accountBalance: number;
  riskPercent: number;
  /** ISO code from ACCOUNT_CURRENCIES. Unknown or absent reads as USD. */
  accountCurrency: string;
  costBufferPercent: number;
  minimumLotSize: number;
  maximumLotSize?: number;
  lotStep: number;
}

export const DEFAULT_LOT_SIZE_SETTINGS: LotSizeSettings = {
  accountBalance: 10000,
  riskPercent: 1,
  accountCurrency: DEFAULT_ACCOUNT_CURRENCY,
  costBufferPercent: 0,
  minimumLotSize: 0.01,
  maximumLotSize: undefined,
  lotStep: 0.01,
};

export function readLotSizeSettings(): LotSizeSettings {
  if (typeof window === "undefined") return DEFAULT_LOT_SIZE_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_LOT_SIZE_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<LotSizeSettings> | null;
    const accountBalance = Number(parsed?.accountBalance);
    const riskPercent = Number(parsed?.riskPercent);
    const costBufferPercent = Number(parsed?.costBufferPercent);
    const minimumLotSize = Number(parsed?.minimumLotSize);
    const maximumLotSize = Number(parsed?.maximumLotSize);
    const lotStep = Number(parsed?.lotStep);
    return {
      accountBalance:
        Number.isFinite(accountBalance) && accountBalance > 0
          ? accountBalance
          : DEFAULT_LOT_SIZE_SETTINGS.accountBalance,
      riskPercent:
        Number.isFinite(riskPercent) && riskPercent > 0
          ? riskPercent
          : DEFAULT_LOT_SIZE_SETTINGS.riskPercent,
      // Checked against the allowlist rather than just typeof: a stale or
      // hand-edited code would otherwise reach Intl.NumberFormat and /candles.
      accountCurrency: isAccountCurrency(parsed?.accountCurrency)
        ? parsed.accountCurrency
        : DEFAULT_LOT_SIZE_SETTINGS.accountCurrency,
      costBufferPercent:
        Number.isFinite(costBufferPercent) &&
        costBufferPercent >= 0 &&
        costBufferPercent < 100
          ? costBufferPercent
          : DEFAULT_LOT_SIZE_SETTINGS.costBufferPercent,
      minimumLotSize:
        Number.isFinite(minimumLotSize) && minimumLotSize > 0
          ? minimumLotSize
          : DEFAULT_LOT_SIZE_SETTINGS.minimumLotSize,
      maximumLotSize:
        parsed?.maximumLotSize !== undefined &&
        Number.isFinite(maximumLotSize) &&
        maximumLotSize > 0
          ? maximumLotSize
          : DEFAULT_LOT_SIZE_SETTINGS.maximumLotSize,
      lotStep:
        Number.isFinite(lotStep) && lotStep > 0
          ? lotStep
          : DEFAULT_LOT_SIZE_SETTINGS.lotStep,
    };
  } catch {
    return DEFAULT_LOT_SIZE_SETTINGS;
  }
}

export function writeLotSizeSettings(settings: LotSizeSettings): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    /* localStorage may be unavailable (private mode, quota) — ignore. */
  }
}
