"use client";

import { Sidebar } from "@/components/dashboard/sidebar";
import { WinRateGauge } from "@/components/dashboard/win-rate-gauge";
import { StockOptions } from "@/components/dashboard/stock-options";
import { SignalVaultPreview } from "@/components/dashboard/signal-vault-preview";
import { AutoJournal } from "@/components/dashboard/auto-journal";
import { Search } from "lucide-react";

export default function DashboardPage() {
  return (
    <main className="ml-64 flex-1 overflow-y-auto">
      <div className="p-8">
        {/* Header */}
        <header className="mb-8 flex items-center justify-between border-b border-zinc-800 pb-4">
          <h3 className="text-xl font-bold">Dashboard</h3>
          <div className="flex items-center gap-4">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white" />
              <input
                type="text"
                placeholder="USDT/GOLD"
                className="h-10 w-64 rounded-full bg-zinc-900 pl-10 pr-4 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-700"
              />
            </div>
          </div>
        </header>

        <h1 className="text-4xl font-semibold tracking-tight bg-linear-to-r from-white via-[#A3A3A3] to-white bg-clip-text text-transparent">
          Welcome to SIG<span className="text-[#565656]">NOVA</span>
        </h1>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-7">
          {/* Left Column */}
          <div className="lg:col-span-3">
            <WinRateGauge value={80} />
          </div>

          {/* Right Column */}
          <div className="lg:col-span-4">
            <StockOptions />
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <SignalVaultPreview />
          </div>
          <div className="lg:col-span-1">
            <AutoJournal />
          </div>
        </div>
      </div>
    </main>
  );
}
