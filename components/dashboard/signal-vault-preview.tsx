"use client";

import Link from "next/link";
import { ClipboardList } from "lucide-react";
import TradingViewWidget from "@/components/signals/tradingview-widget";

export function SignalVaultPreview() {
  return (
    <div className="flex h-full min-h-0 flex-col rounded-lg border border-[#1D1D1D] bg-[#121212] p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-white">Signal vault</h2>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Link
            href="/dashboard/history"
            className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-full border border-zinc-600 bg-transparent px-3 text-xs font-medium text-white transition-colors hover:bg-zinc-800/80"
          >
            <ClipboardList className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Signal history
          </Link>
          <Link
            href="/dashboard/signal-vault"
            className="inline-flex h-8 shrink-0 items-center justify-center rounded-full bg-white px-3 text-xs font-medium text-black transition-colors hover:bg-zinc-200"
          >
            View active signals
          </Link>
        </div>
      </div>

      <div className="min-h-[240px] w-full min-w-0 flex-1 lg:min-h-[280px]">
        <TradingViewWidget symbol="OANDA:GBPUSD" interval="D" />
      </div>
    </div>
  );
}
