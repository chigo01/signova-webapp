"use client";

import { WinRateGauge } from "@/components/dashboard/win-rate-gauge";
import { StockOptions } from "@/components/dashboard/stock-options";
import { SignalVaultPreview } from "@/components/dashboard/signal-vault-preview";
import { AutoJournal } from "@/components/dashboard/auto-journal";
import { Search } from "lucide-react";

export default function DashboardPage() {
  return (
    <main className="flex-1 overflow-y-auto overflow-x-hidden bg-black">
      <div className="mx-auto w-full max-w-[1600px] bg-black px-4 pb-6 pt-4 sm:px-6 sm:pb-8 sm:pt-6 lg:px-8">
        <header className="mb-6 hidden items-center justify-between border-b border-zinc-900 pb-3 lg:flex">
          <h3 className="text-xl font-bold">Dashboard</h3>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white" />
              <input
                type="text"
                placeholder="USDT/GOLD"
                className="h-10 w-64 rounded-full bg-zinc-900 pl-10 pr-4 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-700"
              />
            </div>
          </div>
        </header>

        <h1 className="mb-5 text-3xl font-semibold tracking-tight bg-linear-to-r from-white via-[#A3A3A3] to-white bg-clip-text text-transparent sm:mb-6 sm:text-4xl md:mb-8">
          Welcome to SIG<span className="text-[#565656]">NOVA</span>
        </h1>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-4 xl:grid-cols-7 xl:gap-x-4">
          <div className="min-w-0 md:col-span-1 xl:col-span-3">
            <WinRateGauge value={80} />
          </div>
          <div className="min-w-0 md:col-span-1 xl:col-span-4">
            <StockOptions />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3 xl:gap-x-4">
          <div className="min-w-0 xl:col-span-2">
            <SignalVaultPreview />
          </div>
          <div className="min-w-0 xl:col-span-1">
            <AutoJournal />
          </div>
        </div>
      </div>
    </main>
  );
}
