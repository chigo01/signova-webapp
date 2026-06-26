"use client";

import { Lock } from "lucide-react";
import { useAuthState } from "@/components/auth/auth-provider";

export function AutoJournal() {
  const { isGuest, promptAuth } = useAuthState();

  return (
    <div className="flex h-full flex-col rounded-lg border border-[#1D1D1D] bg-[#121212] p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-white">Auto Journal</h2>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
          UPCOMING
        </span>
      </div>

      <div className="relative flex-1">
        <div className={isGuest ? "pointer-events-none select-none blur-sm" : undefined}>
          <div className="rounded-xl bg-black/30 p-4">
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

        {isGuest && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-xl bg-black/40 p-4 text-center backdrop-blur-[2px]">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-700 bg-black/60">
              <Lock className="h-4 w-4 text-zinc-300" />
            </div>
            <p className="max-w-[220px] text-sm font-medium text-white">Log in to find out</p>
            <button
              type="button"
              onClick={() => promptAuth("Log in to find out")}
              className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-black transition-colors hover:bg-zinc-200"
            >
              Sign up free
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
