import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NewPropertyMenu } from "./journal-popovers";

afterEach(cleanup);

describe("NewPropertyMenu", () => {
  it("offers trading risk fields without the removed generic and AI choices", () => {
    render(
      <NewPropertyMenu
        existingProperties={[]}
        onAddProperty={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText("AI summary")).toBeInTheDocument();
    expect(screen.getByText("Entry price")).toBeInTheDocument();
    expect(screen.getByText("Exit price")).toBeInTheDocument();
    expect(screen.getByText("Position size")).toBeInTheDocument();
    expect(screen.getByText("Stop loss")).toBeInTheDocument();
    expect(screen.getByText("Take profit")).toBeInTheDocument();
    expect(screen.getByText("Risk-to-reward ratio")).toBeInTheDocument();
    expect(screen.getByText("Account size")).toBeInTheDocument();
    expect(screen.getByText("Risk per trade (%)")).toBeInTheDocument();

    expect(screen.queryByText("AI key info")).not.toBeInTheDocument();
    expect(screen.queryByText("AI custom autofill")).not.toBeInTheDocument();
    expect(screen.queryByText("AI translation")).not.toBeInTheDocument();
    expect(screen.queryByText("Type")).not.toBeInTheDocument();
    expect(screen.queryByText("Text")).not.toBeInTheDocument();
    expect(screen.queryByText("Number")).not.toBeInTheDocument();
    expect(screen.queryByText("Select")).not.toBeInTheDocument();
    expect(screen.queryByText("Multi-select")).not.toBeInTheDocument();
  });

  it("adds a numeric risk column with the stable signal-import key", () => {
    const onAddProperty = vi.fn();
    const onClose = vi.fn();
    render(
      <NewPropertyMenu
        existingProperties={[]}
        onAddProperty={onAddProperty}
        onClose={onClose}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Stop loss" }));

    expect(onAddProperty).toHaveBeenCalledWith({
      id: "stopLoss",
      name: "Stop loss",
      type: "number",
      width: 150,
    });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("does not suggest a risk field that the journal already has", () => {
    render(
      <NewPropertyMenu
        existingProperties={[
          { id: "stopLoss", name: "Stop loss", type: "number" },
        ]}
        onAddProperty={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.queryByText("Stop loss")).not.toBeInTheDocument();
  });
});
