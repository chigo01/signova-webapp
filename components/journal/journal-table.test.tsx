import type { ComponentProps } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { JournalTable } from "./journal-table";

const SUMMARY =
  "The current trade is EURNZD with a daily bearish bias. Recent history shows that waiting for confirmation has produced cleaner entries and fewer premature stops.";

afterEach(cleanup);

function renderTable() {
  const onGenerateAi = vi.fn();
  const props: ComponentProps<typeof JournalTable> = {
    journal: {
      _id: "journal-1",
      userId: "user-1",
      title: "Trading Journal",
      isDefault: true,
      properties: [
        {
          id: "summary",
          name: "AI summary",
          type: "ai",
          ai: { kind: "summary", model: "gpt-5.4-mini" },
        },
      ],
      views: [{ id: "table", name: "Table", type: "table" }],
      rows: [
        {
          id: "row-1",
          cells: { summary: SUMMARY },
          createdAt: "2026-07-28T00:00:00.000Z",
          updatedAt: "2026-07-28T00:00:00.000Z",
        },
      ],
      createdAt: "2026-07-28T00:00:00.000Z",
      updatedAt: "2026-07-28T00:00:00.000Z",
    },
    openPopover: null,
    onOpenPropertyMenu: vi.fn(),
    onOpenNewPropertyMenu: vi.fn(),
    onCloseNewPropertyMenu: vi.fn(),
    onAddProperty: vi.fn(),
    onEditProperty: vi.fn(),
    onDraftCell: vi.fn(),
    onCommitCell: vi.fn(),
    onSetCell: vi.fn(),
    onAddRow: vi.fn(),
    onGenerateAi,
    generatingCells: new Set(),
    sort: null,
    filters: [],
    search: "",
    isSortOpen: false,
    isFilterOpen: false,
    isSearchOpen: false,
    onChangeSort: vi.fn(),
    onChangeFilters: vi.fn(),
    onChangeSearch: vi.fn(),
    onToggleSort: vi.fn(),
    onToggleFilter: vi.fn(),
    onToggleSearch: vi.fn(),
    density: "comfortable",
    onToggleDensity: vi.fn(),
    onDuplicateJournal: vi.fn(),
    onDeleteJournal: vi.fn(),
    canDelete: false,
  };

  render(<JournalTable {...props} />);
  return { onGenerateAi };
}

describe("JournalTable AI summaries", () => {
  it("renders the complete summary in a vertically resizable read-only text area", () => {
    renderTable();

    const summary = screen.getByRole("textbox", {
      name: "AI summary value",
    });
    expect(summary).toHaveValue(SUMMARY);
    expect(summary).toHaveAttribute("readonly");
    expect(summary).toHaveClass("resize-y", "overflow-y-auto", "leading-5");
  });

  it("keeps regeneration available beside the readable summary", () => {
    const { onGenerateAi } = renderTable();

    fireEvent.click(screen.getByRole("button", { name: "Regenerate" }));
    expect(onGenerateAi).toHaveBeenCalledWith("row-1", "summary");
  });
});
