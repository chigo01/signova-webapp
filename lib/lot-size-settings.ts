// Account balance and risk % for the lot size calculator, persisted locally.
//
// These two values are identical for every signal, so making the user retype
// them on each card would be the whole feature's friction. There's no server-side
// notion of a trading account balance (lib/auth-user.ts has no such field, and
// lib/payments.ts "balance" is subscription credit), so this is device-local.

const STORAGE_KEY = "signova_lot_size_settings";

export interface LotSizeSettings {
  accountBalance: number;
  riskPercent: number;
}

export const DEFAULT_LOT_SIZE_SETTINGS: LotSizeSettings = {
  accountBalance: 10000,
  riskPercent: 1,
};

export function readLotSizeSettings(): LotSizeSettings {
  if (typeof window === "undefined") return DEFAULT_LOT_SIZE_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_LOT_SIZE_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<LotSizeSettings> | null;
    const accountBalance = Number(parsed?.accountBalance);
    const riskPercent = Number(parsed?.riskPercent);
    return {
      accountBalance:
        Number.isFinite(accountBalance) && accountBalance > 0
          ? accountBalance
          : DEFAULT_LOT_SIZE_SETTINGS.accountBalance,
      riskPercent:
        Number.isFinite(riskPercent) && riskPercent > 0
          ? riskPercent
          : DEFAULT_LOT_SIZE_SETTINGS.riskPercent,
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
