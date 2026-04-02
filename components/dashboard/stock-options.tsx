"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  fetchStockRecommendations,
  type StockRecommendation,
} from "@/lib/stocks";

const tabs = ["Top News", "Global Markets", "Heat Map", "Top Gainers"];

function barColor(signal: string, changePercent: number): string {
  const s = signal.toLowerCase();
  if (s === "buy") return "bg-emerald-500";
  if (s === "sell") return "bg-red-500";
  return changePercent >= 0 ? "bg-emerald-500" : "bg-red-500";
}

export function StockOptions() {
  const [activeTab, setActiveTab] = useState("Top News");
  const [stocks, setStocks] = useState<StockRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const isHoveringRef = useRef(false);

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        const data = await fetchStockRecommendations();
        setStocks(data.watchlist ?? []);
      } catch (error) {
        console.error("Failed to load stock options:", error);
        setStocks([]);
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, []);

  const autoScrollItems = useMemo(() => {
    if (stocks.length <= 6) return stocks;
    // Duplicate for seamless loop while scrollLeft is reset.
    return [...stocks, ...stocks];
  }, [stocks]);

  useEffect(() => {
    const el = trackRef.current;
    if (!el || stocks.length <= 6) return;

    const speedPxPerFrame = 0.35;
    let rafId = 0;
    let current = el.scrollLeft;

    const tick = () => {
      if (!isHoveringRef.current) {
        current += speedPxPerFrame;
        if (current >= el.scrollWidth / 2) {
          current = 0;
        }
        el.scrollLeft = current;
      }
      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [stocks.length]);

  return (
    <div className="flex h-full flex-col rounded-lg border border-[#1D1D1D] bg-[#121212] p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-white">Stock options</h2>
        <Link href="/dashboard/stocks">
          <Button
            variant="secondary"
            size="sm"
            className="h-8 shrink-0 rounded-full bg-white px-3 text-xs font-medium text-black hover:bg-zinc-200"
          >
            View all
          </Button>
        </Link>
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

      <div
        ref={trackRef}
        onMouseEnter={() => {
          isHoveringRef.current = true;
        }}
        onMouseLeave={() => {
          isHoveringRef.current = false;
        }}
        className="overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        <div className="grid grid-flow-col grid-rows-2 auto-cols-[210px] gap-2.5">
          {(stocks.length > 6 ? autoScrollItems : stocks).map((stock, i) => {
            const isPositive = stock.changePercent >= 0;
            const percentText = `${isPositive ? "+" : ""}${stock.changePercent.toFixed(2)}%`;
            const changeText = `${isPositive ? "+" : ""}${stock.change.toFixed(2)}`;
            return (
              <div
                key={`${stock.symbol}-${i}`}
                className="w-[210px] shrink-0 rounded-[4px] bg-[#1E1E1E] p-[10px]"
              >
                <div className="flex items-start gap-2">
                  <div
                    className={cn(
                      "mt-0.5 h-7 w-1 shrink-0 rounded-full",
                      barColor(stock.technicalSignal, stock.changePercent)
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <span className="truncate text-[12px] font-medium leading-tight text-zinc-300">
                        {stock.symbol}
                      </span>
                      <span className="shrink-0 text-[12px] text-zinc-400">
                        ${stock.price.toFixed(2)}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-[11px]">
                      <span className={isPositive ? "text-[#2DD4BF]" : "text-red-500"}>
                        {changeText}
                      </span>
                      <span className={isPositive ? "text-[#2DD4BF]" : "text-red-500"}>
                        {percentText}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {!isLoading && stocks.length === 0 && (
            <div className="rounded-[4px] bg-[#1E1E1E] px-4 py-3 text-xs text-zinc-500">
              No stock options available.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
