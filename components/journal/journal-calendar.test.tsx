import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { JournalCalendar } from "./journal-calendar";
import type { Journal } from "./journal-types";

const journal: Journal = {
  _id: "journal-1",
  userId: "user-1",
  title: "Trading Journal",
  isDefault: true,
  properties: [
    { id: "pair", name: "Pair", type: "text" },
    { id: "date", name: "Date", type: "date" },
    {
      id: "bias",
      name: "Bias",
      type: "select",
      options: [
        {
          id: "daily-bullish",
          label: "Daily bullish",
          color: "emerald",
        },
      ],
    },
    {
      id: "point-of-interest",
      name: "Point of interest",
      type: "multi-select",
      options: [
        { id: "eq", label: "EQ", color: "cyan" },
        { id: "fvg", label: "FVG", color: "amber" },
      ],
    },
  ],
  views: [{ id: "calendar", name: "Calendar", type: "calendar" }],
  rows: [
    {
      id: "row-1",
      cells: {
        pair: "GBP/USD",
        date: "2026-11-14T20:17:00.000Z",
        bias: "Daily bullish",
        "point-of-interest": ["EQ", "FVG"],
      },
      createdAt: "2026-11-14T20:17:00.000Z",
      updatedAt: "2026-11-14T20:17:00.000Z",
    },
  ],
  createdAt: "2026-11-01T00:00:00.000Z",
  updatedAt: "2026-11-14T20:17:00.000Z",
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 10, 20, 12));
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("JournalCalendar", () => {
  it("uses the Figma Monday-first calendar layout", () => {
    render(<JournalCalendar journal={journal} />);

    const headings = screen
      .getByTestId("journal-calendar-scroll")
      .querySelectorAll(".grid-cols-7:first-child > div");
    expect(Array.from(headings).map((heading) => heading.textContent)).toEqual([
      "Mon",
      "Tue",
      "Wed",
      "Thu",
      "Fri",
      "Sat",
      "Sun",
    ]);
  });

  it("renders pair, bias, full date, and point-of-interest tags", () => {
    render(<JournalCalendar journal={journal} />);

    const trade = screen.getByTestId("calendar-trade-row-1");
    expect(trade).toHaveTextContent("GBP/USD");
    expect(trade).toHaveTextContent("Daily bullish");
    expect(trade).toHaveTextContent("November 14, 2026");
    expect(trade).toHaveTextContent("EQ");
    expect(trade).toHaveTextContent("FVG");
  });
});
