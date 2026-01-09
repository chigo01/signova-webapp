"use client";

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const POSITIONS = [
  {
    id: 1,
    symbol: "EURUSD",
    type: "BUY",
    volume: 1.0,
    openPrice: 1.085,
    currentPrice: 1.0924,
    profit: 740.0,
  },
  {
    id: 2,
    symbol: "GBPUSD",
    type: "SELL",
    volume: 0.5,
    openPrice: 1.27,
    currentPrice: 1.265,
    profit: 250.0,
  },
  {
    id: 3,
    symbol: "USDJPY",
    type: "BUY",
    volume: 2.0,
    openPrice: 145.0,
    currentPrice: 144.8,
    profit: -400.0,
  }, // Loss
];

export function PositionsTable({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border bg-card shadow-sm",
        className
      )}
    >
      <div className="border-b border-border bg-zinc-50/50 px-4 py-3 dark:bg-zinc-900/50">
        <h3 className="font-semibold text-card-foreground">Open Positions</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-zinc-500 dark:bg-zinc-900/50 dark:text-zinc-400">
            <tr>
              <th className="px-4 py-3 font-medium">Symbol</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Vol</th>
              <th className="px-4 py-3 font-medium">Open</th>
              <th className="px-4 py-3 font-medium text-right">P&L ($)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {POSITIONS.map((pos) => (
              <tr
                key={pos.id}
                className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
              >
                <td className="px-4 py-3 font-medium text-foreground">
                  {pos.symbol}
                </td>
                <td
                  className={cn(
                    "px-4 py-3 font-medium",
                    pos.type === "BUY" ? "text-blue-600" : "text-red-600"
                  )}
                >
                  {pos.type}
                </td>
                <td className="px-4 py-3 text-foreground">{pos.volume}</td>
                <td className="px-4 py-3 text-zinc-500">
                  {pos.openPrice.toFixed(4)}
                </td>
                <td
                  className={cn(
                    "px-4 py-3 text-right font-medium",
                    pos.profit >= 0 ? "text-green-600" : "text-red-600"
                  )}
                >
                  {pos.profit >= 0 ? "+" : ""}
                  {pos.profit.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
