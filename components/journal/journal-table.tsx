"use client";

import { useEffect, useRef, useState } from "react";
import {
  CalendarDays,
  ChevronDown,
  Copy,
  List,
  Loader2,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Rows3,
  Search,
  Send,
  Sparkles,
  Trash2,
  Type,
} from "lucide-react";
import { askJournal } from "@/lib/journal";
import { cn } from "@/lib/utils";
import type {
  Journal,
  JournalProperty,
  JournalRow,
} from "@/components/journal/journal-types";
import {
  EditPropertyPanel,
  NewPropertyMenu,
  PropertyMenu,
} from "./journal-popovers";
import { MultiSelectPillCell, SelectPillCell } from "./journal-pills";
import {
  applyFilters,
  applySearch,
  applySort,
  FilterPopover,
  SearchBar,
  SortPopover,
  type FilterEntry,
  type SortState,
} from "./journal-toolbar";

function valueToText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}

function propertyIcon(property: JournalProperty) {
  if (property.type === "date") return CalendarDays;
  if (property.type === "select" || property.type === "multi-select") {
    return List;
  }
  if (property.type === "ai") return Sparkles;
  return Type;
}

/**
 * Type-driven display width. We ignore any width stored on the property
 * because (a) there's no resize UI yet, and (b) historical defaults were
 * too generous (260px each → table overflowed). Once user-resizable
 * columns ship, return `property.width ?? defaultByType(property.type)`.
 */
function propertyDisplayWidth(property: JournalProperty): number {
  switch (property.type) {
    case "date":
      return 150;
    case "number":
      return 130;
    case "select":
      return 170;
    case "multi-select":
      return 210;
    case "ai":
      return 280;
    case "text":
    default:
      return 200;
  }
}

// Returns the raw editable value for an input. Must round-trip cleanly:
// what is rendered here is what gets written back via onChange. So no
// human-friendly formatting (e.g. "November 30, 2026") — that would
// corrupt the stored value on the next blur.
function cellInputValue(row: JournalRow, property: JournalProperty): string {
  const value = row.cells[property.id];
  if (value === null || value === undefined) return "";

  if (property.type === "date") {
    const text = String(value);
    const isoPrefix = text.match(/^\d{4}-\d{2}-\d{2}/);
    return isoPrefix ? isoPrefix[0] : "";
  }

  return valueToText(value);
}

export function JournalTable({
  journal,
  openPopover,
  onOpenPropertyMenu,
  onOpenNewPropertyMenu,
  onCloseNewPropertyMenu,
  onAddProperty,
  onEditProperty,
  onDraftCell,
  onCommitCell,
  onSetCell,
  onAddRow,
  onGenerateAi,
  generatingCells,
  sort,
  filters,
  search,
  isSortOpen,
  isFilterOpen,
  isSearchOpen,
  onChangeSort,
  onChangeFilters,
  onChangeSearch,
  onToggleSort,
  onToggleFilter,
  onToggleSearch,
  density,
  onToggleDensity,
  onDuplicateJournal,
  onDeleteJournal,
  canDelete,
}: {
  journal: Journal;
  openPopover: "property" | "new-property" | "edit-property" | null;
  onOpenPropertyMenu: () => void;
  onOpenNewPropertyMenu: () => void;
  onCloseNewPropertyMenu: () => void;
  onAddProperty: (property: JournalProperty) => void;
  onEditProperty: () => void;
  onDraftCell: (rowId: string, propertyId: string, value: string) => void;
  onCommitCell: (rowId: string) => void;
  onSetCell: (rowId: string, propertyId: string, value: unknown) => void;
  onAddRow: () => void;
  onGenerateAi: (rowId: string, propertyId: string) => void;
  generatingCells: Set<string>;
  sort: SortState;
  filters: FilterEntry[];
  search: string;
  isSortOpen: boolean;
  isFilterOpen: boolean;
  isSearchOpen: boolean;
  onChangeSort: (next: SortState) => void;
  onChangeFilters: (next: FilterEntry[]) => void;
  onChangeSearch: (next: string) => void;
  onToggleSort: () => void;
  onToggleFilter: () => void;
  onToggleSearch: () => void;
  density: "compact" | "comfortable";
  onToggleDensity: () => void;
  onDuplicateJournal: () => void;
  onDeleteJournal: () => void;
  canDelete: boolean;
}) {
  const [askOpen, setAskOpen] = useState(false);
  const [askQuestion, setAskQuestion] = useState("");
  const [askAnswer, setAskAnswer] = useState<string | null>(null);
  const [askLoading, setAskLoading] = useState(false);
  const [askError, setAskError] = useState<string | null>(null);
  const askRef = useRef<HTMLDivElement | null>(null);

  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement | null>(null);

  // Close popovers when clicking outside.
  useEffect(() => {
    if (!askOpen && !moreOpen) return;
    function onDown(event: MouseEvent) {
      const target = event.target as Node;
      if (askOpen && askRef.current && !askRef.current.contains(target)) {
        setAskOpen(false);
      }
      if (moreOpen && moreRef.current && !moreRef.current.contains(target)) {
        setMoreOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [askOpen, moreOpen]);

  const handleAsk = async () => {
    const question = askQuestion.trim();
    if (!question) return;
    setAskLoading(true);
    setAskError(null);
    setAskAnswer(null);
    try {
      const result = await askJournal(journal._id, question);
      setAskAnswer(result.answer);
    } catch (err) {
      setAskError(
        err instanceof Error ? err.message : "Could not ask the journal",
      );
    } finally {
      setAskLoading(false);
    }
  };

  const visibleProperties = journal.properties.filter(
    (property) => !property.hidden,
  );
  const rows = applySort(
    applyFilters(applySearch(journal.rows, search), filters, journal.properties),
    sort,
    journal.properties,
  );
  const rowMinHeight = density === "compact" ? "min-h-8" : "min-h-9";

  return (
    <section className="mt-7 w-full">
      <div className="mb-3 flex items-center justify-between gap-4">
        <h2 className="text-base font-semibold text-zinc-100">
          Trading Journal
        </h2>
        <div className="relative flex items-center gap-3 text-[13px] text-zinc-400">
          <div className="relative">
            <button
              type="button"
              onClick={onToggleFilter}
              className={cn(
                "hover:text-white",
                (isFilterOpen || filters.length > 0) && "text-white",
              )}
            >
              Filter
              {filters.length > 0 ? (
                <span className="ml-1 rounded bg-zinc-800 px-1 text-[10px]">
                  {filters.length}
                </span>
              ) : null}
            </button>
            {isFilterOpen ? (
              <FilterPopover
                properties={journal.properties}
                filters={filters}
                onChange={onChangeFilters}
                onClose={onToggleFilter}
              />
            ) : null}
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={onToggleSort}
              className={cn(
                "hover:text-white",
                (isSortOpen || sort) && "text-white",
              )}
            >
              Sort
              {sort ? (
                <span className="ml-1 rounded bg-zinc-800 px-1 text-[10px] uppercase">
                  {sort.direction}
                </span>
              ) : null}
            </button>
            {isSortOpen ? (
              <SortPopover
                properties={journal.properties}
                sort={sort}
                onChange={onChangeSort}
                onClose={onToggleSort}
              />
            ) : null}
          </div>
          <div ref={askRef} className="relative">
            <button
              type="button"
              onClick={() => setAskOpen((prev) => !prev)}
              aria-label="Ask AI about this journal"
              className={cn(
                "hover:text-white",
                askOpen && "text-white",
              )}
            >
              <Sparkles className="h-4 w-4" />
            </button>
            {askOpen ? (
              <div className="absolute right-0 top-7 z-40 w-80 rounded-lg border border-zinc-800 bg-[#171717] p-3 shadow-2xl shadow-black/60">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                  Ask this journal
                </p>
                <div className="flex items-start gap-2">
                  <textarea
                    value={askQuestion}
                    onChange={(event) => setAskQuestion(event.target.value)}
                    onKeyDown={(event) => {
                      if (
                        event.key === "Enter" &&
                        (event.metaKey || event.ctrlKey)
                      ) {
                        event.preventDefault();
                        void handleAsk();
                      }
                    }}
                    placeholder="e.g. Which pair appears most?"
                    rows={3}
                    className="min-h-[68px] flex-1 resize-y rounded border border-zinc-800 bg-[#202020] p-2 text-xs text-zinc-200 outline-none placeholder:text-zinc-600 focus:border-zinc-500"
                  />
                  <button
                    type="button"
                    onClick={handleAsk}
                    disabled={askLoading || !askQuestion.trim()}
                    aria-label="Send"
                    className="grid h-8 w-8 place-items-center rounded bg-white text-black hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {askLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
                {askAnswer ? (
                  <div className="mt-3 rounded border border-zinc-800 bg-[#0f0f0f] p-2 text-xs whitespace-pre-line text-zinc-200">
                    {askAnswer}
                  </div>
                ) : null}
                {askError ? (
                  <p className="mt-2 rounded border border-red-500/20 bg-red-500/10 px-2 py-1 text-[11px] text-red-300">
                    {askError}
                  </p>
                ) : null}
                <p className="mt-2 text-[10px] text-zinc-600">
                  Cmd/Ctrl+Enter to send · Answers use up to 100 most-recent rows
                </p>
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onToggleSearch}
            aria-label="Search"
            className={cn(
              "hover:text-white",
              (isSearchOpen || search) && "text-white",
            )}
          >
            <Search className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onToggleDensity}
            aria-label={
              density === "compact" ? "Comfortable rows" : "Compact rows"
            }
            title={
              density === "compact"
                ? "Switch to comfortable rows"
                : "Switch to compact rows"
            }
            className={cn(
              "hover:text-white",
              density === "compact" && "text-white",
            )}
          >
            <Rows3 className="h-4 w-4" />
          </button>
          <div ref={moreRef} className="relative">
            <button
              type="button"
              onClick={() => setMoreOpen((prev) => !prev)}
              aria-label="More"
              className={cn("hover:text-white", moreOpen && "text-white")}
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
            {moreOpen ? (
              <div className="absolute right-0 top-7 z-40 w-48 rounded-lg border border-zinc-800 bg-[#171717] p-1 shadow-2xl shadow-black/60">
                <button
                  type="button"
                  onClick={() => {
                    setMoreOpen(false);
                    onDuplicateJournal();
                  }}
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-zinc-200 hover:bg-zinc-800"
                >
                  <Copy className="h-3.5 w-3.5 text-zinc-500" />
                  Duplicate journal
                </button>
                <button
                  type="button"
                  disabled={!canDelete}
                  onClick={() => {
                    setMoreOpen(false);
                    onDeleteJournal();
                  }}
                  title={
                    canDelete
                      ? "Permanently delete this journal"
                      : "Create another journal first"
                  }
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-rose-300 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:text-zinc-600 disabled:hover:bg-transparent"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete journal
                </button>
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onAddRow}
            className="flex items-center gap-1 rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-black hover:bg-zinc-200"
          >
            New
            <ChevronDown className="h-3 w-3" />
          </button>
        </div>
      </div>
      {isSearchOpen ? (
        <SearchBar
          value={search}
          onChange={onChangeSearch}
          onClose={onToggleSearch}
        />
      ) : null}

      {/*
        overflow-x: auto for horizontal scroll on wide tables.
        overflow-y: clip + overflow-clip-margin lets the column-header
        popovers (PropertyMenu / NewPropertyMenu / EditPropertyPanel) render
        below the wrapper on short / empty tables without being clipped.
        Cell pill dropdowns escape via React portal — see journal-pills.tsx.
      */}
      <div
        className="relative rounded-lg border border-zinc-900 bg-[#101010]"
        style={{
          overflowX: "auto",
          overflowY: "clip",
          overflowClipMargin: "320px 0",
        }}
      >
        <div
          className="grid border-b border-zinc-900 bg-[#202020]"
          style={{
            gridTemplateColumns: `${visibleProperties
              .map((property) => `${propertyDisplayWidth(property)}px`)
              .join(" ")} minmax(40px, 1fr)`,
          }}
        >
          {visibleProperties.map((property, index) => {
            const Icon = propertyIcon(property);
            const menuOpen =
              index === 0 &&
              (openPopover === "property" || openPopover === "edit-property");

            return (
              <div
                key={property.id}
                className="relative flex h-8 items-center border-r border-zinc-900 px-2 text-xs text-zinc-400"
              >
                <button
                  type="button"
                  onClick={index === 0 ? onOpenPropertyMenu : undefined}
                  className="flex w-full items-center gap-2 text-left hover:text-zinc-200"
                >
                  <Icon className="h-3.5 w-3.5" />
                  {property.name}
                </button>
                {menuOpen && openPopover === "property" ? (
                  <PropertyMenu onEdit={onEditProperty} />
                ) : null}
                {menuOpen && openPopover === "edit-property" ? (
                  <EditPropertyPanel />
                ) : null}
              </div>
            );
          })}
          <div className="relative flex h-8 items-center px-2">
            <button
              type="button"
              onClick={onOpenNewPropertyMenu}
              className="grid h-6 w-6 place-items-center rounded text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
              aria-label="Add property"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
            {openPopover === "new-property" ? (
              <NewPropertyMenu
                existingProperties={journal.properties}
                onAddProperty={onAddProperty}
                onClose={onCloseNewPropertyMenu}
              />
            ) : null}
          </div>
        </div>

        <div>
          {journal.rows.length === 0 ? (
            <button
              type="button"
              onClick={onAddRow}
              className="flex h-12 w-full items-center border-b border-zinc-900 px-3 text-left text-sm text-zinc-600 hover:bg-zinc-950 hover:text-zinc-400"
            >
              <Plus className="mr-2 h-4 w-4" />
              New row
            </button>
          ) : rows.length === 0 ? (
            <div className="border-b border-zinc-900 px-3 py-4 text-center text-xs text-zinc-500">
              No rows match the current filters or search.
            </div>
          ) : (
            rows.map((row) => (
              <div
                key={row.id}
                className={cn(
                  "grid border-b border-zinc-900 last:border-b-0",
                  rowMinHeight,
                )}
                style={{
                  gridTemplateColumns: `${visibleProperties
                    .map((property) => `${propertyDisplayWidth(property)}px`)
                    .join(" ")} minmax(40px, 1fr)`,
                }}
              >
                {visibleProperties.map((property, propertyIndex) => {
                  const cellKey = `${row.id}:${property.id}`;
                  const isGenerating = generatingCells.has(cellKey);
                  const rawValue = row.cells[property.id];

                  return (
                    <div
                      key={`${row.id}-${property.id}`}
                      className={cn(
                        "group/cell flex items-center border-r border-zinc-900 px-2",
                        rowMinHeight,
                        propertyIndex === 0 && "bg-black/10",
                      )}
                    >
                      {property.type === "ai" ? (
                        isGenerating ? (
                          <span className="flex items-center gap-1.5 text-xs text-zinc-500">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Generating…
                          </span>
                        ) : valueToText(rawValue) ? (
                          <div className="flex w-full items-center gap-2">
                            <span className="line-clamp-2 flex-1 whitespace-pre-line text-xs text-zinc-300">
                              {valueToText(rawValue)}
                            </span>
                            <button
                              type="button"
                              aria-label="Regenerate"
                              onClick={() =>
                                onGenerateAi(row.id, property.id)
                              }
                              className="hidden h-6 w-6 place-items-center rounded text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200 group-hover/cell:grid"
                            >
                              <RefreshCw className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onGenerateAi(row.id, property.id)}
                            className="flex items-center gap-1.5 rounded px-1.5 py-1 text-xs text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
                          >
                            <Sparkles className="h-3.5 w-3.5" />
                            Generate
                          </button>
                        )
                      ) : property.type === "select" ? (
                        <SelectPillCell
                          property={property}
                          value={typeof rawValue === "string" ? rawValue : ""}
                          onChange={(next) =>
                            onSetCell(row.id, property.id, next)
                          }
                        />
                      ) : property.type === "multi-select" ? (
                        <MultiSelectPillCell
                          property={property}
                          values={
                            Array.isArray(rawValue)
                              ? (rawValue as unknown[]).map((v) => String(v))
                              : typeof rawValue === "string" && rawValue
                                ? [rawValue]
                                : []
                          }
                          onChange={(next) =>
                            onSetCell(row.id, property.id, next)
                          }
                        />
                      ) : (
                        <input
                          aria-label={`${property.name} value`}
                          type={property.type === "date" ? "date" : "text"}
                          value={cellInputValue(row, property)}
                          onChange={(event) =>
                            onDraftCell(row.id, property.id, event.target.value)
                          }
                          onBlur={() => onCommitCell(row.id)}
                          className="h-8 w-full bg-transparent text-xs text-zinc-300 outline-none placeholder:text-zinc-700 focus:text-white"
                          placeholder={property.name}
                        />
                      )}
                    </div>
                  );
                })}
                <div />
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
