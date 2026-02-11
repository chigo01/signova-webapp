"use client";

import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TopNewsChart } from "@/components/dashboard/stocks/top-news-chart";
import { GlobalMarkets } from "@/components/dashboard/stocks/global-markets";
import { HeatMap } from "@/components/dashboard/stocks/heat-map";
import { TopNewsList } from "@/components/dashboard/stocks/top-news-list";
import { TopGainers } from "@/components/dashboard/stocks/top-gainers";

export default function StocksPage() {
  return (
    <div className="min-h-screen bg-black p-6 ml-64 flex-1 overflow-y-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-white">Stock options</h1>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <Input
              placeholder="USDT/GOLD"
              className="w-64 border-0 bg-zinc-900 pl-10 text-white placeholder:text-zinc-500"
            />
          </div>
          <Button className="bg-white text-black hover:bg-zinc-200">
            View my stocks
          </Button>
        </div>
      </div>

      {/* Top Row: Top News Chart + Global Markets */}
      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <TopNewsChart />
        <GlobalMarkets />
      </div>

      {/* Bottom Row: Heat Map + Top News + Top Gainers */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <HeatMap />
        </div>
        <div className="lg:col-span-4">
          <TopNewsList />
        </div>
        <div className="lg:col-span-4">
          <TopGainers />
        </div>
      </div>
    </div>
  );
}
