import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import {
  formatElapsedDuration,
  TradeReleaseInfo,
} from "./trade-release-info";

const NOW = new Date("2026-07-16T12:00:00.000Z").getTime();

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeAll(() => {
  vi.stubGlobal("ResizeObserver", ResizeObserverMock);
});

afterAll(() => {
  vi.unstubAllGlobals();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("formatElapsedDuration", () => {
  it.each([
    ["2026-07-16T12:00:00.000Z", "00:00:00"],
    ["2026-07-16T11:59:01.000Z", "00:00:59"],
    ["2026-07-16T10:57:57.000Z", "01:02:03"],
    ["2026-07-14T08:55:54.000Z", "2d 03:04:06"],
  ])("formats %s as %s", (releasedAt, expected) => {
    expect(formatElapsedDuration(releasedAt, NOW)).toBe(expected);
  });

  it("clamps future release times to zero", () => {
    expect(formatElapsedDuration("2026-07-16T13:00:00.000Z", NOW)).toBe(
      "00:00:00",
    );
  });

  it.each(["", "not-a-date"])(
    "returns null for an unavailable release time: %s",
    (releasedAt) => {
      expect(formatElapsedDuration(releasedAt, NOW)).toBeNull();
    },
  );
});

describe("TradeReleaseInfo", () => {
  it("opens with the elapsed time and warning, then updates every second", () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    const clearIntervalSpy = vi.spyOn(window, "clearInterval");
    render(<TradeReleaseInfo releasedAt="2026-07-16T10:57:57.000Z" />);

    const trigger = screen.getByRole("button", {
      name: "View trade release information",
    });
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(trigger);

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("01:02:03")).toBeInTheDocument();
    expect(
      screen.getByText(/The entry price may have changed/),
    ).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    expect(screen.getByText("01:02:04")).toBeInTheDocument();

    fireEvent.click(trigger);
    expect(screen.queryByText("Time since release")).not.toBeInTheDocument();
    expect(clearIntervalSpy).toHaveBeenCalled();
  });

  it("shows a safe fallback when the release time is unavailable", () => {
    render(<TradeReleaseInfo releasedAt="" />);
    fireEvent.click(
      screen.getByRole("button", {
        name: "View trade release information",
      }),
    );

    expect(screen.getByText("Release time unavailable")).toBeInTheDocument();
    expect(
      screen.getByText(/Confirm the current market price before entering/),
    ).toBeInTheDocument();
  });

  it("opens from a keyboard-generated trigger click", () => {
    render(<TradeReleaseInfo releasedAt="2026-07-16T10:57:57.000Z" />);
    const trigger = screen.getByRole("button", {
      name: "View trade release information",
    });
    trigger.focus();

    fireEvent.keyDown(trigger, { key: "Enter" });
    fireEvent.click(trigger, { detail: 0 });

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("closes on Escape and restores focus to the trigger", async () => {
    render(<TradeReleaseInfo releasedAt="2026-07-16T10:57:57.000Z" />);
    const trigger = screen.getByRole("button", {
      name: "View trade release information",
    });
    trigger.focus();
    fireEvent.click(trigger);

    fireEvent.keyDown(document, { key: "Escape" });

    await waitFor(() => {
      expect(screen.queryByText("Time since release")).not.toBeInTheDocument();
      expect(trigger).toHaveFocus();
    });
  });

  it("closes when the user interacts outside the popover", async () => {
    render(
      <>
        <TradeReleaseInfo releasedAt="2026-07-16T10:57:57.000Z" />
        <button type="button">Outside</button>
      </>,
    );
    const trigger = screen.getByRole("button", {
      name: "View trade release information",
    });
    fireEvent.click(trigger);
    expect(screen.getByText("Time since release")).toBeInTheDocument();

    const outside = screen.getByRole("button", { name: "Outside" });
    await act(async () => {});
    fireEvent.pointerDown(outside, {
      button: 0,
      ctrlKey: false,
      pointerType: "mouse",
    });
    outside.focus();
    fireEvent.focusIn(outside);
    fireEvent.click(outside);

    await waitFor(() => {
      expect(screen.queryByText("Time since release")).not.toBeInTheDocument();
    });
  });
});
