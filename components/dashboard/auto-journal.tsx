"use client";

import { Button } from "@/components/ui/button";

export function AutoJournal() {
  return (
    <div className="flex h-full flex-col rounded-lg border border-[#1D1D1D] bg-[#121212] p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-white">Auto Journal</h2>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
          UPCOMING
        </span>
      </div>

      <div className="flex-1 rounded-xl bg-black/30 p-4">
        <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
          AI INSIGHTS
        </div>
        <h3 className="mb-3 text-lg font-semibold text-white">
          Pattern Analysis
        </h3>

        <div className="mb-4 space-y-1.5">
          <div className="h-3 w-3/4 rounded bg-zinc-700/50 blur-[2px]" />
          <div className="h-3 w-2/3 rounded bg-zinc-700/50 blur-[2px]" />
          <div className="h-3 w-1/2 rounded bg-zinc-700/50 blur-[2px]" />
        </div>

        <div className="space-y-2">
          <h4 className="text-xs font-medium text-zinc-400">Highlights</h4>
          <ol className="list-decimal space-y-1.5 pl-4 text-sm leading-relaxed text-[#A3A3A3]">
            <li>Stick on your trade for Mondays</li>
            <li>Refine existing strategy for showing trades.</li>
            <li>Refine existing strategy for showing trades.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
