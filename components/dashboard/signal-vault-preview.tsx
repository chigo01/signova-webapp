"use client";

import Link from "next/link";
import TradingViewWidget from "@/components/signals/tradingview-widget";

export function SignalVaultPreview() {
  return (
    <div className="flex h-full min-h-0 flex-col rounded-lg border border-[#1D1D1D] bg-[#121212] p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-white">Signal vault</h2>
        <Link
          href="/dashboard/signal-vault"
          className="inline-flex h-8 shrink-0 items-center justify-center rounded-full bg-white px-3 text-xs font-medium text-black transition-colors hover:bg-zinc-200"
        >
          Open signal vault
        </Link>
      </div>

      <div className="min-h-[240px] w-full min-w-0 flex-1 lg:min-h-[280px]">
        <TradingViewWidget symbol="OANDA:GBPUSD" interval="D" />
      </div>
    </div>
  );
}
