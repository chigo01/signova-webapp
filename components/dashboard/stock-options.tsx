"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const tabs = ["Top News", "Global Markets", "Heat Map", "Top Gainers"];

const stockData = [
  {
    name: "S&P 500 ETF",
    price: "509.90",
    change: "-3.05",
    percent: "-0.40%",
    isPositive: false,
    color: "bg-red-500",
  },
  {
    name: "Dow Jones ETF",
    price: "30.000",
    change: "-3.05",
    percent: "+0.56%",
    isPositive: true,
    color: "bg-green-500", // The bar color
  },
  {
    name: "NASDAQ",
    price: "452.90",
    change: "-3.05",
    percent: "-0.96%",
    isPositive: false,
    color: "bg-[#FFAA2B]",
  },
  {
    name: "S&P 500 ETF",
    price: "509.90",
    change: "-3.05",
    percent: "-0.40%",
    isPositive: false,
    color: "bg-red-500",
  },
  {
    name: "Dow Jones ETF",
    price: "30.000",
    change: "-3.05",
    percent: "+0.56%",
    isPositive: true,
    color: "bg-green-500",
  },
  {
    name: "NASDAQ",
    price: "452.90",
    change: "-3.05",
    percent: "-0.96%",
    isPositive: false,
    color: "bg-[#FFAA2B]",
  },
];

export function StockOptions() {
  const [activeTab, setActiveTab] = useState("Top News");

  return (
    <div className="flex h-full flex-col rounded-lg border border-[#1D1D1D] bg-[#121212] p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-white">Stock options</h2>
        <Button
          variant="secondary"
          size="sm"
          className="h-8 shrink-0 rounded-full bg-white px-3 text-xs font-medium text-black hover:bg-zinc-200"
        >
          View all
        </Button>
      </div>

      <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={cn(
              "inline-flex items-center justify-center whitespace-nowrap rounded-lg border border-[#2F2F2F] bg-[#1E1E1E] px-[10px] py-[7px] text-[11px] font-medium transition-colors",
              activeTab === tab
                ? "border-[#2F2F2F] bg-[#2F2F2F] text-white"
                : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 lg:grid-cols-3">
        {stockData.map((stock, i) => (
          <div
            key={i}
            className="flex items-start gap-2 rounded-[4px] bg-[#1E1E1E] p-[10px]"
          >
            <div className={cn("mt-0.5 h-7 w-1 shrink-0 rounded-full", stock.color)} />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <span className="text-[12px] font-medium leading-tight text-zinc-300">
                  {stock.name}
                </span>
                <span className="shrink-0 text-[12px] text-zinc-400">{stock.price}</span>
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-[11px]">
                <span
                  className={
                    stock.isPositive ? "text-[#2DD4BF]" : "text-red-500"
                  }
                >
                  {stock.change}
                </span>
                <span
                  className={
                    stock.isPositive ? "text-[#2DD4BF]" : "text-red-500"
                  }
                >
                  {stock.percent}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
