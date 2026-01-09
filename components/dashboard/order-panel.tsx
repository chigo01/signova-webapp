"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function OrderPanel() {
  const [volume, setVolume] = useState("0.1");
  const [type, setType] = useState<"market" | "limit">("market");

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 text-card-foreground shadow-sm h-full">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <h2 className="text-lg font-semibold">Order Entry</h2>
        <div className="flex gap-1 rounded-md bg-zinc-100 p-1 dark:bg-zinc-800">
          <button
            onClick={() => setType("market")}
            className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
              type === "market"
                ? "bg-white text-black shadow-sm dark:bg-black dark:text-white"
                : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
            }`}
          >
            Market
          </button>
          <button
            onClick={() => setType("limit")}
            className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
              type === "limit"
                ? "bg-white text-black shadow-sm dark:bg-black dark:text-white"
                : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
            }`}
          >
            Limit
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="volume">Volume (Lots)</Label>
            <Input
              id="volume"
              type="number"
              step="0.01"
              value={volume}
              onChange={(e) => setVolume(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="leverage">Leverage</Label>
            <div className="flex h-10 items-center rounded-md border border-input px-3 text-sm text-muted-foreground">
              1:500
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-2">
          <div className="flex flex-col items-center justify-center rounded-lg bg-red-50 p-4 dark:bg-red-950/20">
            <span className="text-xs text-red-600 dark:text-red-400">Bid</span>
            <span className="text-2xl font-bold text-red-600 dark:text-red-400">
              1.0924<span className="text-sm align-top">5</span>
            </span>
          </div>
          <div className="flex flex-col items-center justify-center rounded-lg bg-blue-50 p-4 dark:bg-blue-950/20">
            <span className="text-xs text-blue-600 dark:text-blue-400">
              Ask
            </span>
            <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              1.0925<span className="text-sm align-top">8</span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Button
            variant="destructive"
            className="w-full py-6 text-lg font-bold"
          >
            SELL
          </Button>
          <Button className="w-full bg-blue-600 py-6 text-lg font-bold hover:bg-blue-700">
            BUY
          </Button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-y-2 text-sm text-zinc-500 dark:text-zinc-400">
          <span>Margin Required:</span>
          <span className="text-right font-mono text-zinc-900 dark:text-zinc-100">
            $218.50
          </span>
          <span>Spread:</span>
          <span className="text-right font-mono text-zinc-900 dark:text-zinc-100">
            1.3 pips
          </span>
        </div>
      </div>
    </div>
  );
}
