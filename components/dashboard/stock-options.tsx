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
    <div className="rounded-2xl bg-zinc-900 p-6 shadow-lg">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Stock options</h2>
        <Button
          variant="secondary"
          size="sm"
          className="bg-white text-black hover:bg-zinc-200"
        >
          View all
        </Button>
      </div>

      <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-medium transition-colors",
              activeTab === tab
                ? "bg-zinc-800 text-white"
                : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {stockData.map((stock, i) => (
          <div
            key={i}
            className="flex items-start gap-3 rounded-xl bg-black/40 p-4"
          >
            <div className={cn("h-8 w-1 rounded-full", stock.color)} />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-medium text-zinc-300 text-[13px]">
                  {stock.name}
                </span>
                <span className="text-zinc-400">{stock.price}</span>
              </div>
              <div className="mt-1 flex items-center gap-2 text-xs">
                <span
                  className={
                    stock.isPositive ? "text-green-500" : "text-red-500"
                  }
                >
                  {stock.change}
                </span>
                <span
                  className={
                    stock.isPositive ? "text-green-500" : "text-red-500"
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
