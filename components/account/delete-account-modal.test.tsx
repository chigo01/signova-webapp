import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DeleteAccountModal } from "./delete-account-modal";

const requestAccountDeletion = vi.fn();

vi.mock("@/lib/account-deletion", async () => {
  const actual = await vi.importActual<typeof import("@/lib/account-deletion")>(
    "@/lib/account-deletion",
  );
  return {
    ...actual,
    requestAccountDeletion: (...args: unknown[]) =>
      requestAccountDeletion(...args),
  };
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderModal(overrides: Partial<React.ComponentProps<typeof DeleteAccountModal>> = {}) {
  const props = {
    open: true,
    onClose: vi.fn(),
    onScheduled: vi.fn(),
    ...overrides,
  };
  render(<DeleteAccountModal {...props} />);
  return props;
}

function confirmInput() {
  return screen.getByLabelText(/type delete to confirm/i);
}

function submitButton() {
  return screen.getByRole("button", { name: /delete my account/i });
}

describe("DeleteAccountModal", () => {
  it("renders nothing while closed", () => {
    renderModal({ open: false });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("keeps the destructive action locked until the phrase is typed", () => {
    renderModal();
    expect(submitButton()).toBeDisabled();

    fireEvent.change(confirmInput(), { target: { value: "delet" } });
    expect(submitButton()).toBeDisabled();

    fireEvent.change(confirmInput(), { target: { value: "DELETE" } });
    expect(submitButton()).toBeEnabled();
  });

  it("accepts the confirmation regardless of case or padding", () => {
    renderModal();
    fireEvent.change(confirmInput(), { target: { value: "  delete " } });
    expect(submitButton()).toBeEnabled();
  });

  it("submits once and reports the schedule back", async () => {
    const pendingDeletion = { scheduledFor: "2026-09-09T00:00:00.000Z" };
    requestAccountDeletion.mockResolvedValue({ pendingDeletion, graceDays: 30 });
    const props = renderModal();

    fireEvent.change(screen.getByLabelText(/why are you leaving/i), {
      target: { value: "Taking a break" },
    });
    fireEvent.change(confirmInput(), { target: { value: "DELETE" } });
    fireEvent.click(submitButton());

    await waitFor(() => {
      expect(props.onScheduled).toHaveBeenCalledWith(pendingDeletion);
    });
    expect(requestAccountDeletion).toHaveBeenCalledTimes(1);
    expect(requestAccountDeletion).toHaveBeenCalledWith("Taking a break");
    expect(props.onClose).toHaveBeenCalled();
  });

  it("omits an empty reason", async () => {
    requestAccountDeletion.mockResolvedValue({ pendingDeletion: null });
    renderModal();

    fireEvent.change(confirmInput(), { target: { value: "DELETE" } });
    fireEvent.click(submitButton());

    await waitFor(() => {
      expect(requestAccountDeletion).toHaveBeenCalledWith(undefined);
    });
  });

  it("shows the failure inline and stays open so the user can retry", async () => {
    requestAccountDeletion.mockRejectedValue(new Error("network down"));
    const props = renderModal();

    fireEvent.change(confirmInput(), { target: { value: "DELETE" } });
    fireEvent.click(submitButton());

    await waitFor(() => {
      expect(screen.getByText(/couldn't schedule the deletion/i)).toBeTruthy();
    });
    expect(props.onClose).not.toHaveBeenCalled();
    expect(props.onScheduled).not.toHaveBeenCalled();
    expect(submitButton()).toBeEnabled();
  });
});
