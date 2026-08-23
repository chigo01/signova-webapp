import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PaymentMethodModal } from "./payment-method-modal";
import type { PaymentMethodsResponse } from "@/lib/payments";

afterEach(() => {
  cleanup();
});

const RAIL_ON = { enabled: true, configured: true, label: "on" };
const RAIL_OFF = { enabled: false, configured: true, label: "off" };

function methods(
  patch: Partial<PaymentMethodsResponse> = {},
): PaymentMethodsResponse {
  return {
    dextopus: RAIL_OFF,
    bachs: RAIL_ON,
    aella: RAIL_ON,
    ...patch,
  };
}

function renderModal(
  overrides: Partial<React.ComponentProps<typeof PaymentMethodModal>> = {},
) {
  const props = {
    planId: "pro" as const,
    onClose: vi.fn(),
    onAella: vi.fn(),
    onBachs: vi.fn(),
    methods: methods(),
    ...overrides,
  };
  render(<PaymentMethodModal {...props} />);
  return props;
}

function optionTitles(): string[] {
  return screen
    .getAllByRole("button")
    .map((button) => (button.textContent ?? "").trim())
    .filter(Boolean);
}

describe("PaymentMethodModal", () => {
  it("shows one NGN option on the first slide, not two", () => {
    renderModal();
    expect(screen.getByText("NGN bank transfer")).toBeInTheDocument();
    expect(screen.queryByText("NGN checkout")).toBeNull();
    expect(screen.getByText("Card")).toBeInTheDocument();
    expect(screen.getByText("Crypto checkout")).toBeInTheDocument();
  });

  it("opens a provider slide with Bachs first, then Aella", () => {
    renderModal();
    fireEvent.click(screen.getByRole("button", { name: /NGN bank transfer/i }));
    expect(screen.getByRole("heading", { name: "Choose a provider" })).toBeInTheDocument();
    expect(optionTitles()[0]).toMatch(/^Bachs/);
    expect(optionTitles()[1]).toMatch(/^Aella/);
  });

  it("starts Bachs bank transfer from the provider slide", () => {
    const props = renderModal();
    fireEvent.click(screen.getByRole("button", { name: /NGN bank transfer/i }));
    fireEvent.click(screen.getByRole("button", { name: /Bachs/ }));
    expect(props.onBachs).toHaveBeenCalledWith("bank_transfer");
    expect(props.onAella).not.toHaveBeenCalled();
  });

  it("starts Aella from the provider slide", () => {
    const props = renderModal();
    fireEvent.click(screen.getByRole("button", { name: /NGN bank transfer/i }));
    fireEvent.click(screen.getByRole("button", { name: /Aella/ }));
    expect(props.onAella).toHaveBeenCalledOnce();
    expect(props.onBachs).not.toHaveBeenCalled();
  });

  it("returns to the method slide from the provider picker", () => {
    renderModal();
    fireEvent.click(screen.getByRole("button", { name: /NGN bank transfer/i }));
    fireEvent.click(
      screen.getByRole("button", { name: "Back to payment methods" }),
    );
    expect(screen.getByRole("heading", { name: "Choose how to pay" })).toBeInTheDocument();
    expect(screen.getByText("NGN bank transfer")).toBeInTheDocument();
  });

  it("starts Bachs immediately when Aella is off", () => {
    const props = renderModal({
      methods: methods({ aella: RAIL_OFF }),
    });
    fireEvent.click(screen.getByRole("button", { name: /NGN bank transfer/i }));
    expect(props.onBachs).toHaveBeenCalledWith("bank_transfer");
    expect(screen.queryByRole("heading", { name: "Choose a provider" })).toBeNull();
  });

  it("starts Aella immediately when Bachs is off", () => {
    const props = renderModal({
      methods: methods({ bachs: RAIL_OFF }),
    });
    fireEvent.click(screen.getByRole("button", { name: /NGN bank transfer/i }));
    expect(props.onAella).toHaveBeenCalledOnce();
    expect(screen.queryByText("Card")).toBeNull();
  });
});
