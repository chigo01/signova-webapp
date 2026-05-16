"use client";

import Link from "next/link";
import { Check, Loader2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { JournalSummary } from "@/components/journal/journal-types";

function journalHref(summary: JournalSummary): string {
  return summary.isDefault
    ? "/dashboard/journal"
    : `/dashboard/journal/${summary._id}`;
}

function journalLabel(summary: JournalSummary): string {
  if (summary.title.trim()) return summary.title;
  return summary.isDefault ? "Default journal" : "Untitled";
}

export function JournalSwitcher({
  journals,
  activeId,
  isCreating,
  onCreate,
}: {
  journals: JournalSummary[];
  activeId: string | null;
  isCreating: boolean;
  onCreate: () => void;
}) {
  return (
    <div className="absolute left-0 top-7 z-40 w-72 rounded-lg border border-zinc-800 bg-[#171717] p-2 shadow-2xl shadow-black/60">
      <p className="mb-2 px-2 pt-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
        Your journals
      </p>
      <div className="mb-2 max-h-72 space-y-0.5 overflow-y-auto">
        {journals.length === 0 ? (
          <p className="px-2 py-1.5 text-xs text-zinc-500">No journals yet.</p>
        ) : (
          journals.map((summary) => {
            const isActive = summary._id === activeId;
            return (
              <Link
                key={summary._id}
                href={journalHref(summary)}
                className={cn(
                  "flex items-center justify-between rounded-md px-2 py-1.5 text-[13px] transition-colors hover:bg-zinc-800",
                  isActive ? "text-white" : "text-zinc-300",
                )}
              >
                <span className="truncate">{journalLabel(summary)}</span>
                {isActive ? <Check className="h-3.5 w-3.5 text-zinc-400" /> : null}
              </Link>
            );
          })
        )}
      </div>
      <button
        type="button"
        onClick={onCreate}
        disabled={isCreating}
        className="flex w-full items-center gap-2 rounded-md border-t border-zinc-800 px-2 py-2 text-[13px] font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-progress disabled:opacity-60"
      >
        {isCreating ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Plus className="h-3.5 w-3.5" />
        )}
        New journal
      </button>
    </div>
  );
}
