"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { chipClassForColor } from "@/lib/journal-colors";
import type {
  Journal,
  JournalProperty,
  JournalRow,
} from "./journal-types";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function findDateProperty(properties: JournalProperty[]): JournalProperty | null {
  return properties.find((property) => property.type === "date") ?? null;
}

function findPairProperty(properties: JournalProperty[]): JournalProperty | null {
  return (
    properties.find(
      (property) =>
        property.id === "pair" || property.name.toLowerCase() === "pair",
    ) ??
    properties.find((property) => property.type === "text") ??
    null
  );
}

function findBiasProperty(properties: JournalProperty[]): JournalProperty | null {
  return (
    properties.find(
      (property) =>
        property.type === "select" &&
        (property.id === "bias" || property.name.toLowerCase() === "bias"),
    ) ??
    properties.find((property) => property.type === "select") ??
    null
  );
}

function findPoiProperty(properties: JournalProperty[]): JournalProperty | null {
  return (
    properties.find(
      (property) =>
        property.type === "multi-select" &&
        (property.id === "point-of-interest" ||
          property.name.toLowerCase() === "point of interest"),
    ) ??
    properties.find((property) => property.type === "multi-select") ??
    null
  );
}

/** Parses YYYY-MM-DD or an ISO string as a local calendar date. */
function parseRowDate(raw: unknown): Date | null {
  const match = String(raw ?? "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
  );
  return Number.isNaN(date.getTime()) ? null : date;
}

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function valueText(value: unknown): string {
  return Array.isArray(value)
    ? value.map((item) => String(item)).join(", ")
    : String(value ?? "");
}

function formatTradeDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

interface CalendarTrade {
  rowId: string;
  pair: string;
  bias: string;
  date: string;
  pointsOfInterest: Array<{
    id: string;
    label: string;
    color: string | undefined;
  }>;
}

function buildCalendarTrade(
  row: JournalRow,
  rowDate: Date,
  pairProperty: JournalProperty | null,
  biasProperty: JournalProperty | null,
  poiProperty: JournalProperty | null,
): CalendarTrade {
  const pair = pairProperty
    ? valueText(row.cells[pairProperty.id]).trim()
    : "";
  const bias = biasProperty
    ? valueText(row.cells[biasProperty.id]).trim()
    : "";
  const poiValues =
    poiProperty && Array.isArray(row.cells[poiProperty.id])
      ? (row.cells[poiProperty.id] as unknown[]).map((value) => String(value))
      : [];

  return {
    rowId: row.id,
    pair: pair || "Untitled",
    bias,
    date: formatTradeDate(rowDate),
    pointsOfInterest: poiValues.map((value) => {
      const option = poiProperty?.options?.find(
        (candidate) => candidate.id === value || candidate.label === value,
      );
      return {
        id: option?.id ?? value,
        label: option?.label ?? value,
        color: option?.color,
      };
    }),
  };
}

function CalendarTradeDetails({ trade }: { trade: CalendarTrade }) {
  return (
    <div
      data-testid={`calendar-trade-${trade.rowId}`}
      className="min-w-0 space-y-1 text-[10px] leading-tight"
    >
      <p className="truncate font-medium text-zinc-300">{trade.pair}</p>
      {trade.bias ? (
        <p className="truncate text-zinc-500">{trade.bias}</p>
      ) : null}
      <p className="truncate text-zinc-500">{trade.date}</p>
      {trade.pointsOfInterest.length > 0 ? (
        <div className="flex flex-wrap gap-1 pt-0.5">
          {trade.pointsOfInterest.slice(0, 3).map((point) => (
            <span
              key={point.id}
              className={cn(
                "rounded-sm border px-1 py-0.5 text-[9px] font-bold leading-none",
                chipClassForColor(point.color),
              )}
            >
              {point.label}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function JournalCalendar({ journal }: { journal: Journal }) {
  const today = useMemo(() => {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }, []);
  const [cursor, setCursor] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );

  const dateProperty = useMemo(
    () => findDateProperty(journal.properties),
    [journal.properties],
  );
  const pairProperty = useMemo(
    () => findPairProperty(journal.properties),
    [journal.properties],
  );
  const biasProperty = useMemo(
    () => findBiasProperty(journal.properties),
    [journal.properties],
  );
  const poiProperty = useMemo(
    () => findPoiProperty(journal.properties),
    [journal.properties],
  );

  const tradesByDay = useMemo(() => {
    const map = new Map<string, CalendarTrade[]>();
    if (!dateProperty) return map;

    for (const row of journal.rows) {
      const rowDate = parseRowDate(row.cells[dateProperty.id]);
      if (!rowDate) continue;
      const trade = buildCalendarTrade(
        row,
        rowDate,
        pairProperty,
        biasProperty,
        poiProperty,
      );
      const key = dayKey(rowDate);
      const trades = map.get(key);
      if (trades) trades.push(trade);
      else map.set(key, [trade]);
    }
    return map;
  }, [
    journal.rows,
    dateProperty,
    pairProperty,
    biasProperty,
    poiProperty,
  ]);

  // Figma uses Monday as the first day and a stable six-week grid.
  const cells = useMemo(() => {
    const firstOfMonth = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const mondayOffset = (firstOfMonth.getDay() + 6) % 7;
    const gridStart = new Date(firstOfMonth);
    gridStart.setDate(gridStart.getDate() - mondayOffset);
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + index);
      return date;
    });
  }, [cursor]);

  if (!dateProperty) {
    return (
      <section className="mt-7 rounded-lg border border-zinc-900 bg-[#101010] p-8 text-center text-sm text-zinc-500">
        Calendar view needs a date column. Add one to your journal to see rows
        plotted here.
      </section>
    );
  }

  const monthLabel = cursor.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  return (
    <section className="mt-7 w-full">
      <div className="mb-3 flex items-center justify-between gap-4">
        <h2 className="text-base font-semibold text-zinc-100">{monthLabel}</h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Previous month"
            onClick={() =>
              setCursor(
                (previous) =>
                  new Date(
                    previous.getFullYear(),
                    previous.getMonth() - 1,
                    1,
                  ),
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
                (previous) =>
                  new Date(
                    previous.getFullYear(),
                    previous.getMonth() + 1,
                    1,
                  ),
              )
            }
            className="grid h-8 w-8 place-items-center rounded-md text-zinc-400 hover:bg-zinc-900 hover:text-white"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div
        data-testid="journal-calendar-scroll"
        className="overflow-x-auto rounded-lg border border-zinc-900 bg-[#101010]"
      >
        <div className="min-w-[826px]">
          <div className="grid grid-cols-7 border-b border-zinc-900 bg-[#202020] text-[11px] uppercase tracking-wide text-zinc-500">
            {WEEKDAYS.map((day) => (
              <div
                key={day}
                className="border-r border-zinc-900 px-2 py-1.5 text-center last:border-r-0"
              >
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {cells.map((date) => {
              const key = dayKey(date);
              const trades = tradesByDay.get(key) ?? [];
              const inMonth = date.getMonth() === cursor.getMonth();
              const isToday = key === dayKey(today);
              return (
                <div
                  key={key}
                  className={cn(
                    "min-h-[154px] border-b border-r border-zinc-900 p-2 last:border-r-0",
                    !inMonth && "bg-black/40",
                  )}
                >
                  <div
                    className={cn(
                      "mb-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px]",
                      inMonth ? "text-zinc-400" : "text-zinc-700",
                      isToday && "bg-white font-semibold text-black",
                    )}
                  >
                    {date.getDate()}
                  </div>
                  <div className="space-y-2">
                    {trades.slice(0, 1).map((trade) => (
                      <CalendarTradeDetails key={trade.rowId} trade={trade} />
                    ))}
                    {trades.length > 1 ? (
                      <p className="text-[10px] text-zinc-500">
                        +{trades.length - 1} more
                      </p>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
