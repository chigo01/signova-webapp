"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { CHIP_CLASS_BY_COLOR, DEFAULT_CHIP } from "@/lib/journal-colors";
import type {
  Journal,
  JournalProperty,
  JournalRow,
} from "./journal-types";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function findDateProperty(properties: JournalProperty[]): JournalProperty | null {
  return properties.find((p) => p.type === "date") ?? null;
}

function findBiasProperty(properties: JournalProperty[]): JournalProperty | null {
  // Prefer a property literally named/ID'd bias; otherwise any select column.
  return (
    properties.find(
      (p) =>
        (p.id === "bias" || p.name.toLowerCase() === "bias") &&
        p.type === "select",
    ) ??
    properties.find((p) => p.type === "select") ??
    null
  );
}

function findPairProperty(properties: JournalProperty[]): JournalProperty | null {
  return (
    properties.find(
      (p) => p.id === "pair" || p.name.toLowerCase() === "pair",
    ) ?? properties.find((p) => p.type === "text") ?? null
  );
}

/** Parses YYYY-MM-DD or any ISO string into a local-date (drops time). Returns null on miss. */
function parseRowDate(raw: unknown): Date | null {
  if (raw == null) return null;
  const text = typeof raw === "string" ? raw : String(raw);
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, month, day);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

interface RowChip {
  rowId: string;
  label: string;
  colorClass: string;
}

function buildChip(
  row: JournalRow,
  pairProp: JournalProperty | null,
  biasProp: JournalProperty | null,
): RowChip {
  const pairValue = pairProp ? String(row.cells[pairProp.id] ?? "") : "";
  const label = pairValue.trim() || "Untitled";

  let colorClass = DEFAULT_CHIP;
  if (biasProp && biasProp.options) {
    const biasValue = String(row.cells[biasProp.id] ?? "");
    const option = biasProp.options.find(
      (opt) => opt.label === biasValue || opt.id === biasValue,
    );
    if (option) {
      colorClass = CHIP_CLASS_BY_COLOR[option.color] ?? DEFAULT_CHIP;
    }
  }

  return { rowId: row.id, label, colorClass };
}

export function JournalCalendar({ journal }: { journal: Journal }) {
  const today = useMemo(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }, []);
  const [cursor, setCursor] = useState<Date>(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );

  const dateProp = useMemo(
    () => findDateProperty(journal.properties),
    [journal.properties],
  );
  const biasProp = useMemo(
    () => findBiasProperty(journal.properties),
    [journal.properties],
  );
  const pairProp = useMemo(
    () => findPairProperty(journal.properties),
    [journal.properties],
  );

  const chipsByDay = useMemo(() => {
    if (!dateProp) return new Map<string, RowChip[]>();
    const map = new Map<string, RowChip[]>();
    for (const row of journal.rows) {
      const date = parseRowDate(row.cells[dateProp.id]);
      if (!date) continue;
      const key = dayKey(date);
      const chip = buildChip(row, pairProp, biasProp);
      const list = map.get(key);
      if (list) {
        list.push(chip);
      } else {
        map.set(key, [chip]);
      }
    }
    return map;
  }, [journal.rows, dateProp, pairProp, biasProp]);

  // Build the 6-row grid (always 42 cells for visual stability).
  const cells = useMemo(() => {
    const firstOfMonth = new Date(
      cursor.getFullYear(),
      cursor.getMonth(),
      1,
    );
    const gridStart = new Date(firstOfMonth);
    gridStart.setDate(gridStart.getDate() - firstOfMonth.getDay());
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      return d;
    });
  }, [cursor]);

  const monthLabel = cursor.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  if (!dateProp) {
    return (
      <section className="mt-7 rounded-lg border border-zinc-900 bg-[#101010] p-8 text-center text-sm text-zinc-500">
        Calendar view needs a date column. Add one to your journal to see rows
        plotted here.
      </section>
    );
  }

  return (
    <section className="mt-7 w-full">
      <div className="mb-3 flex items-center justify-between gap-4">
        <h2 className="text-base font-semibold text-zinc-100">
          {monthLabel}
        </h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Previous month"
            onClick={() =>
              setCursor(
                (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1),
              )
            }
            className="grid h-8 w-8 place-items-center rounded-md text-zinc-400 hover:bg-zinc-900 hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() =>
              setCursor(new Date(today.getFullYear(), today.getMonth(), 1))
            }
            className="rounded-md px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-900 hover:text-white"
          >
            Today
          </button>
          <button
            type="button"
            aria-label="Next month"
            onClick={() =>
              setCursor(
                (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1),
              )
            }
            className="grid h-8 w-8 place-items-center rounded-md text-zinc-400 hover:bg-zinc-900 hover:text-white"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-zinc-900 bg-[#101010]">
        <div className="grid grid-cols-7 border-b border-zinc-900 bg-[#202020] text-[11px] uppercase tracking-wide text-zinc-500">
          {WEEKDAYS.map((day) => (
            <div key={day} className="border-r border-zinc-900 px-2 py-1.5 last:border-r-0">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((date, i) => {
            const inMonth = date.getMonth() === cursor.getMonth();
            const isToday = dayKey(date) === dayKey(today);
            const chips = chipsByDay.get(dayKey(date)) ?? [];
            const visibleChips = chips.slice(0, 3);
            const overflow = chips.length - visibleChips.length;
            return (
              <div
                key={i}
                className={cn(
                  "min-h-[92px] border-b border-r border-zinc-900 p-1.5 last:border-r-0",
                  !inMonth && "bg-black/40",
                )}
              >
                <div
                  className={cn(
                    "mb-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px]",
                    inMonth ? "text-zinc-400" : "text-zinc-700",
                    isToday && "bg-white text-black font-semibold",
                  )}
                >
                  {date.getDate()}
                </div>
                <div className="space-y-1">
                  {visibleChips.map((chip) => (
                    <div
                      key={chip.rowId}
                      title={chip.label}
                      className={cn(
                        "truncate rounded border px-1.5 py-0.5 text-[10px] font-medium",
                        chip.colorClass,
                      )}
                    >
                      {chip.label}
                    </div>
                  ))}
                  {overflow > 0 ? (
                    <div className="px-1.5 text-[10px] text-zinc-500">
                      +{overflow} more
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
