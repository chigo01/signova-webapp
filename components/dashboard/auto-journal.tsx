"use client";

import { Button } from "@/components/ui/button";

export function AutoJournal() {
  return (
    <div className="flex h-full flex-col rounded-2xl bg-zinc-900 p-6 shadow-lg">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Auto Journal</h2>
        <span className="text-xs font-medium text-zinc-500">UPCOMING</span>
      </div>

      <div className="flex-1 rounded-xl bg-zinc-800/50 p-5">
        <div className="mb-2 text-xs font-medium text-zinc-500">
          AI INSIGHTS
        </div>
        <h3 className="mb-4 text-xl font-semibold text-white">
          Pattern Analysis
        </h3>

        <div className="mb-6 space-y-2">
          {/* Blurred content simulation */}
          <div className="h-4 w-3/4 rounded bg-zinc-700/50 blur-[2px]" />
          <div className="h-4 w-2/3 rounded bg-zinc-700/50 blur-[2px]" />
          <div className="h-4 w-1/2 rounded bg-zinc-700/50 blur-[2px]" />
        </div>

        <div className="space-y-3">
          <h4 className="text-sm font-medium text-zinc-400">Highlights</h4>
          <ol className="list-decimal space-y-2 pl-4 text-md text-[#A3A2A1]">
            <li>Stick on your trade for Mondays</li>
            <li>Refine existing strategy for showing trades.</li>
            <li>Refine existing strategy for showing trades.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
