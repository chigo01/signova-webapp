import { describe, expect, it } from "vitest";
import {
  chainLabel,
  checkoutIdFromSearch,
  upgradePaymentFromStatus,
  type TransactionStatusResponse,
} from "./payments";
import { paymentModalStatusFromTransaction } from "@/components/settings/payment-modal";

describe("chainLabel", () => {
  it("title-cases a blockchain name", () => {
    expect(chainLabel("ethereum")).toBe("Ethereum");
    expect(chainLabel("bnb-chain")).toBe("Bnb Chain");
  });

  it("leaves generated chain ids readable", () => {
    expect(chainLabel("chain-8453")).toBe("chain-8453");
  });
});

describe("checkout return URL", () => {
  it("reads Bachs checkout_id from the pricing return URL", () => {
    expect(
      checkoutIdFromSearch(
        "?checkout_id=chk_merWKkn4vfMiNwvy",
      ),
    ).toBe("chk_merWKkn4vfMiNwvy");
    expect(checkoutIdFromSearch("")).toBeNull();
  });

  it("rebuilds checkout state from a transaction status", () => {
    const status: TransactionStatusResponse = {
      id: "tx-1",
      status: "success",
      planId: "pro",
      monthsCount: 1,
      provider: "bachs",
      bachsPaymentMethod: "bank_transfer",
      amount: 39.99,
      displayUsd: 39.99,
      authorizationUrl: "https://checkout.bachs.io/chk_1",
      reference: "signova_bachs_1",
      expiresAt: "2026-08-23T12:00:00.000Z",
      createdAt: "2026-08-23T11:00:00.000Z",
      user: { plan: "pro", proPlanExpiry: "2027-01-20T00:00:00.000Z" },
    };
    expect(upgradePaymentFromStatus(status)).toMatchObject({
      transactionId: "tx-1",
      planId: "pro",
      provider: "bachs",
      bachsPaymentMethod: "bank_transfer",
    });
    expect(paymentModalStatusFromTransaction(status)).toBe("success");
    expect(paymentModalStatusFromTransaction({ ...status, status: "pending" })).toBe(
      "confirming",
    );
  });
});
