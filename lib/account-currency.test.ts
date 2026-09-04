import { describe, expect, it } from "vitest";
import {
  ACCOUNT_CURRENCIES,
  balanceDecimals,
  currencySymbol,
  formatMoney,
  isAccountCurrency,
} from "./account-currency";

/** The pre-currency formatter, kept here to prove USD output didn't shift. */
function legacyFormatUsd(value: number): string {
  const formatted = Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${value < 0 ? "-" : ""}$${formatted}`;
}

describe("formatMoney", () => {
  it.each([0, 3.3, 99, 198, 10_000, -99, -3.3, -0.001])(
    "matches the old USD formatter for %d",
    (value) => {
      expect(formatMoney(value, "USD")).toBe(legacyFormatUsd(value));
    },
  );

  it("renders -0 without a sign, as the old formatter did", () => {
    // targets[].profit is -0 whenever roundedLots is 0 and the target sits on
    // the wrong side of entry; Intl would otherwise print "-$0.00".
    expect(formatMoney(-0, "USD")).toBe("$0.00");
    expect(formatMoney(-0, "USD")).toBe(legacyFormatUsd(-0));
    // A real negative, however small, keeps its sign.
    expect(formatMoney(-0.001, "USD")).toBe("-$0.00");
  });

  // Currencies rendered as a code rather than a glyph get a non-breaking space
  // before the number, which is what keeps "AED" from wrapping away from it.
  const NBSP = " ";

  it.each([
    ["GBP", "£10,000.00"],
    ["AUD", "A$10,000.00"],
    ["CAD", "CA$10,000.00"],
    ["NZD", "NZ$10,000.00"],
    ["HKD", "HK$10,000.00"],
    ["EUR", "€10,000.00"],
    ["AED", `AED${NBSP}10,000.00`],
    ["SGD", `SGD${NBSP}10,000.00`],
    ["NGN", `NGN${NBSP}10,000.00`],
  ])("formats %s", (code, expected) => {
    expect(formatMoney(10_000, code)).toBe(expected);
  });

  it("drops decimals for JPY, which has no minor unit", () => {
    expect(formatMoney(10_000, "JPY")).toBe("¥10,000");
    expect(formatMoney(1592.6, "JPY")).toBe("¥1,593");
  });

  it.each([["BTC"], ["ETH"]])(
    "keeps %s precise enough to show a small risk amount",
    (code) => {
      // At Intl's default 2dp this would render as "0.00" and tell the user nothing.
      expect(formatMoney(0.0025, code)).toBe(`${code} 0.0025`);
      expect(formatMoney(0.25, code)).toBe(`${code} 0.25`);
      expect(formatMoney(0.00000004, code)).toBe(`${code} 0.00000004`);
    },
  );
});

describe("currencySymbol", () => {
  it.each([
    ["USD", "$"],
    ["GBP", "£"],
    ["EUR", "€"],
    ["JPY", "¥"],
    ["AUD", "A$"],
    ["CAD", "CA$"],
    ["NZD", "NZ$"],
    ["HKD", "HK$"],
    ["AED", "AED"],
    ["SGD", "SGD"],
    ["NGN", "NGN"],
    ["BTC", "BTC"],
    ["ETH", "ETH"],
  ])("gives %s the symbol %s", (code, expected) => {
    expect(currencySymbol(code)).toBe(expected);
  });

  it("stays short enough to sit inside the input", () => {
    for (const { code } of ACCOUNT_CURRENCIES) {
      expect(currencySymbol(code).length).toBeLessThanOrEqual(3);
    }
  });
});

describe("isAccountCurrency", () => {
  it.each([["USD"], ["JPY"], ["NGN"], ["BTC"]])("accepts %s", (code) => {
    expect(isAccountCurrency(code)).toBe(true);
  });

  it.each([["usd"], ["CHF"], ["XAU"], [""], [null], [undefined], [42]])(
    "rejects %s",
    (value) => {
      expect(isAccountCurrency(value)).toBe(false);
    },
  );
});

describe("balanceDecimals", () => {
  it("matches the precision each currency is displayed at", () => {
    expect(balanceDecimals("USD")).toBe(2);
    expect(balanceDecimals("AED")).toBe(2);
    expect(balanceDecimals("JPY")).toBe(0);
    expect(balanceDecimals("BTC")).toBe(8);
    expect(balanceDecimals("ETH")).toBe(8);
  });
});
