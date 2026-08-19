import { describe, expect, it } from "vitest";
import { chainLabel } from "./payments";

describe("chainLabel", () => {
  it("title-cases a blockchain name", () => {
    expect(chainLabel("ethereum")).toBe("Ethereum");
    expect(chainLabel("bnb-chain")).toBe("Bnb Chain");
  });

  it("leaves generated chain ids readable", () => {
    expect(chainLabel("chain-8453")).toBe("chain-8453");
  });
});
