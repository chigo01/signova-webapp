"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { JournalProperty } from "./journal-types";

export type SortState =
  | { propertyId: string; direction: "asc" | "desc" }
  | null;

export interface FilterEntry {
  id: string;
  propertyId: string;
  value: string;
}

/** Visible (non-hidden) properties — toolbars only reason about those. */
function visible(properties: JournalProperty[]) {
  return properties.filter((p) => !p.hidden);
}

/** Close-on-outside-click for any popover that takes a ref. */
function useCloseOnOutsideClick(
  ref: React.RefObject<HTMLElement | null>,
  onClose: () => void,
) {
  useEffect(() => {
    function onDown(event: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(event.target as Node)) onClose();
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [ref, onClose]);
}

export function SortPopover({
  properties,
  sort,
  onChange,
  onClose,
}: {
  properties: JournalProperty[];
  sort: SortState;
  onChange: (next: SortState) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  useCloseOnOutsideClick(ref, onClose);
  const opts = visible(properties);

  return (
    <div
      ref={ref}
      className="absolute right-0 top-9 z-40 w-64 rounded-lg border border-zinc-800 bg-[#171717] p-2 shadow-2xl shadow-black/60"
    >
      <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
        Sort by
      </p>
      <select
        value={sort?.propertyId ?? ""}
        onChange={(event) => {
          const propertyId = event.target.value;
          if (!propertyId) {
            onChange(null);
            return;
          }
          onChange({ propertyId, direction: sort?.direction ?? "asc" });
        }}
        className="mb-2 h-8 w-full rounded border border-zinc-800 bg-[#202020] px-2 text-xs text-zinc-200 outline-none focus:border-zinc-500"
      >
        <option value="">— None —</option>
        {opts.map((property) => (
          <option key={property.id} value={property.id}>
            {property.name}
          </option>
        ))}
      </select>
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={!sort}
          onClick={() =>
            sort && onChange({ ...sort, direction: "asc" })
          }
          className={cn(
            "flex flex-1 items-center justify-center gap-1 rounded border border-zinc-800 px-2 py-1.5 text-xs",
            sort?.direction === "asc"
              ? "bg-zinc-800 text-white"
              : "text-zinc-300 hover:bg-zinc-800/60",
            !sort && "cursor-not-allowed opacity-50",
          )}
        >
          <ArrowUp className="h-3.5 w-3.5" />
          Ascending
        </button>
        <button
          type="button"
          disabled={!sort}
          onClick={() =>
            sort && onChange({ ...sort, direction: "desc" })
          }
          className={cn(
            "flex flex-1 items-center justify-center gap-1 rounded border border-zinc-800 px-2 py-1.5 text-xs",
            sort?.direction === "desc"
              ? "bg-zinc-800 text-white"
              : "text-zinc-300 hover:bg-zinc-800/60",
            !sort && "cursor-not-allowed opacity-50",
          )}
        >
          <ArrowDown className="h-3.5 w-3.5" />
          Descending
        </button>
      </div>
      {sort ? (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="mt-2 w-full rounded px-2 py-1 text-[11px] text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
        >
          Clear sort
        </button>
      ) : null}
    </div>
  );
}

export function FilterPopover({
  properties,
  filters,
  onChange,
  onClose,
}: {
  properties: JournalProperty[];
  filters: FilterEntry[];
  onChange: (next: FilterEntry[]) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  useCloseOnOutsideClick(ref, onClose);
  const opts = visible(properties);

  const addFilter = () => {
    const first = opts[0];
    if (!first) return;
    onChange([
      ...filters,
      {
        id: `f-${Date.now().toString(36)}`,
        propertyId: first.id,
        value: "",
      },
    ]);
  };

  const updateFilter = (id: string, patch: Partial<FilterEntry>) => {
    onChange(filters.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  };

  const removeFilter = (id: string) => {
    onChange(filters.filter((f) => f.id !== id));
  };

  return (
    <div
      ref={ref}
      className="absolute right-0 top-9 z-40 w-[340px] rounded-lg border border-zinc-800 bg-[#171717] p-3 shadow-2xl shadow-black/60"
    >
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
        Filters
      </p>
      {filters.length === 0 ? (
        <p className="px-1 py-2 text-[11px] text-zinc-500">
          No filters yet.
        </p>
      ) : (
        <div className="mb-2 space-y-2">
          {filters.map((filter) => {
            const property = opts.find((p) => p.id === filter.propertyId);
            return (
              <div key={filter.id} className="flex items-center gap-1.5">
                <select
                  value={filter.propertyId}
                  onChange={(event) =>
                    updateFilter(filter.id, {
                      propertyId: event.target.value,
                      value: "",
                    })
                  }
                  className="h-8 w-[120px] rounded border border-zinc-800 bg-[#202020] px-1.5 text-xs text-zinc-200 outline-none focus:border-zinc-500"
                >
                  {opts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                {property &&
                (property.type === "select" ||
                  property.type === "multi-select") ? (
                  <select
                    value={filter.value}
                    onChange={(event) =>
                      updateFilter(filter.id, { value: event.target.value })
                    }
                    className="h-8 flex-1 rounded border border-zinc-800 bg-[#202020] px-1.5 text-xs text-zinc-200 outline-none focus:border-zinc-500"
                  >
                    <option value="">— Any —</option>
                    {(property.options ?? []).map((opt) => (
                      <option key={opt.id} value={opt.label}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={property?.type === "date" ? "date" : "text"}
                    value={filter.value}
                    onChange={(event) =>
                      updateFilter(filter.id, { value: event.target.value })
                    }
                    placeholder="contains..."
                    className="h-8 flex-1 rounded border border-zinc-800 bg-[#202020] px-1.5 text-xs text-zinc-200 outline-none placeholder:text-zinc-600 focus:border-zinc-500"
                  />
                )}
                <button
                  type="button"
                  aria-label="Remove filter"
                  onClick={() => removeFilter(filter.id)}
                  className="grid h-6 w-6 place-items-center rounded text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
      <button
        type="button"
        onClick={addFilter}
        disabled={opts.length === 0}
        className="flex w-full items-center gap-1.5 rounded border border-dashed border-zinc-800 px-2 py-1.5 text-xs text-zinc-400 hover:border-zinc-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Plus className="h-3.5 w-3.5" />
        Add filter
      </button>
    </div>
  );
}

export function SearchBar({
  value,
  onChange,
  onClose,
}: {
  value: string;
  onChange: (next: string) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  return (
    <div className="mb-2 flex items-center gap-2 rounded-md border border-zinc-800 bg-[#171717] px-2 py-1.5">
      <input
        ref={ref}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search rows..."
        className="h-7 flex-1 bg-transparent text-xs text-zinc-200 outline-none placeholder:text-zinc-600"
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          className="rounded px-1.5 py-0.5 text-[11px] text-zinc-500 hover:text-zinc-300"
        >
          Clear
        </button>
      ) : null}
      <button
        type="button"
        aria-label="Close search"
        onClick={onClose}
        className="grid h-6 w-6 place-items-center rounded text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Row transforms (pure functions — used by JournalTable)             */
/* ------------------------------------------------------------------ */

import type { JournalRow } from "./journal-types";

function cellToText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.map((v) => String(v)).join(", ");
  return String(value);
}

export function applySearch(rows: JournalRow[], query: string): JournalRow[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return rows;
  return rows.filter((row) =>
    Object.values(row.cells).some((cell) =>
      cellToText(cell).toLowerCase().includes(trimmed),
    ),
  );
}

export function applyFilters(
  rows: JournalRow[],
  filters: FilterEntry[],
  properties: JournalProperty[],
): JournalRow[] {
  const active = filters.filter((f) => f.value.trim() !== "");
  if (active.length === 0) return rows;
  return rows.filter((row) =>
    active.every((filter) => {
      const cell = row.cells[filter.propertyId];
      const property = properties.find((p) => p.id === filter.propertyId);
      const target = filter.value.toLowerCase();
      if (property?.type === "multi-select") {
        const arr = Array.isArray(cell) ? cell : [];
        return arr.some((v) => String(v).toLowerCase() === target);
      }
      if (property?.type === "select") {
        return cellToText(cell).toLowerCase() === target;
      }
      // Text / number / date / ai: substring match.
      return cellToText(cell).toLowerCase().includes(target);
    }),
  );
}

export function applySort(
  rows: JournalRow[],
  sort: SortState,
  properties: JournalProperty[],
): JournalRow[] {
  if (!sort) return rows;
  const property = properties.find((p) => p.id === sort.propertyId);
  if (!property) return rows;
  const dir = sort.direction === "asc" ? 1 : -1;

  return [...rows].sort((a, b) => {
    const av = a.cells[sort.propertyId];
    const bv = b.cells[sort.propertyId];
    // Empty values sort to the bottom regardless of direction.
    const aEmpty = av === undefined || av === null || av === "";
    const bEmpty = bv === undefined || bv === null || bv === "";
    if (aEmpty && bEmpty) return 0;
    if (aEmpty) return 1;
    if (bEmpty) return -1;

    if (property.type === "number") {
      const an = Number(av);
      const bn = Number(bv);
      if (Number.isNaN(an) || Number.isNaN(bn)) {
        return cellToText(av).localeCompare(cellToText(bv)) * dir;
      }
      return (an - bn) * dir;
    }
    if (property.type === "date") {
      const at = Date.parse(cellToText(av));
      const bt = Date.parse(cellToText(bv));
      if (Number.isNaN(at) || Number.isNaN(bt)) {
        return cellToText(av).localeCompare(cellToText(bv)) * dir;
      }
      return (at - bt) * dir;
    }
    return cellToText(av).localeCompare(cellToText(bv)) * dir;
  });
}
