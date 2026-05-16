"use client";

import {
  CalendarDays,
  ChevronDown,
  List,
  MoreHorizontal,
  Plus,
  Rows3,
  Search,
  Sparkles,
  Type,
} from "lucide-react";
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
  return Type;
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
  onEditProperty,
  onDraftCell,
  onCommitCell,
  onAddRow,
}: {
  journal: Journal;
  openPopover: "property" | "new-property" | "edit-property" | null;
  onOpenPropertyMenu: () => void;
  onOpenNewPropertyMenu: () => void;
  onEditProperty: () => void;
  onDraftCell: (rowId: string, propertyId: string, value: string) => void;
  onCommitCell: (rowId: string) => void;
  onAddRow: () => void;
}) {
  const visibleProperties = journal.properties.filter(
    (property) => !property.hidden,
  );
  const rows = journal.rows;

  return (
    <section className="mt-7 w-full">
      <div className="mb-3 flex items-center justify-between gap-4">
        <h2 className="text-base font-semibold text-zinc-100">
          Trading Journal
        </h2>
        <div className="flex items-center gap-3 text-[13px] text-zinc-400">
          <button className="hover:text-white">Filter</button>
          <button className="hover:text-white">Sort</button>
          <button className="hover:text-white">
            <Sparkles className="h-4 w-4" />
          </button>
          <button className="hover:text-white">
            <Search className="h-4 w-4" />
          </button>
          <button className="hover:text-white">
            <Rows3 className="h-4 w-4" />
          </button>
          <button className="hover:text-white">
            <MoreHorizontal className="h-4 w-4" />
          </button>
          <button className="flex items-center gap-1 rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-black hover:bg-zinc-200">
            New
            <ChevronDown className="h-3 w-3" />
          </button>
        </div>
      </div>

      <div className="relative overflow-visible rounded-lg border border-zinc-900 bg-[#101010]">
        <div
          className="grid min-w-[900px] border-b border-zinc-900 bg-[#202020]"
          style={{
            gridTemplateColumns: `${visibleProperties
              .map((property) => `${property.width ?? 260}px`)
              .join(" ")} 1fr`,
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
            {openPopover === "new-property" ? <NewPropertyMenu /> : null}
          </div>
        </div>

        <div className="min-w-[900px]">
          {rows.length === 0 ? (
            <button
              type="button"
              onClick={onAddRow}
              className="flex h-12 w-full items-center border-b border-zinc-900 px-3 text-left text-sm text-zinc-600 hover:bg-zinc-950 hover:text-zinc-400"
            >
              <Plus className="mr-2 h-4 w-4" />
              New row
            </button>
          ) : (
            rows.map((row) => (
              <div
                key={row.id}
                className="grid min-h-9 border-b border-zinc-900 last:border-b-0"
                style={{
                  gridTemplateColumns: `${visibleProperties
                    .map((property) => `${property.width ?? 260}px`)
                    .join(" ")} 1fr`,
                }}
              >
                {visibleProperties.map((property, propertyIndex) => (
                  <div
                    key={`${row.id}-${property.id}`}
                    className={cn(
                      "flex min-h-9 items-center border-r border-zinc-900 px-2",
                      propertyIndex === 0 && "bg-black/10",
                    )}
                  >
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
                  </div>
                ))}
                <div />
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
