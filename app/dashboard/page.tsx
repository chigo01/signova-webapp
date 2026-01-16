"use client";

import { ChartComponent } from "@/components/charts/chart";
import { SignalsPanel } from "@/components/dashboard/signals-panel";
import { Button } from "@/components/ui/button";
import { fetchApprovedSignals } from "@/lib/signals";
import { Signal } from "@/types/signal";
import { ArrowLeft, Bell, Settings } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

// Mock data for the chart
const MOCK_DATA = Array.from({ length: 100 }, (_, i) => {
  const date = new Date();
  date.setDate(date.getDate() - (100 - i));
  const time = date.toISOString().split("T")[0];

  // Simple random walk for mock data
  const base = 1.08 + Math.sin(i / 10) * 0.02;
  const vol = Math.random() * 0.005;
  const open = base;
  const close = base + (Math.random() - 0.5) * vol;
  const high = Math.max(open, close) + Math.random() * vol;
  const low = Math.min(open, close) - Math.random() * vol;

  return { time, open, high, low, close };
});

export default function TraderFocusedPage() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadSignals = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await fetchApprovedSignals();
      setSignals(data);
    } catch (error) {
      console.error("Failed to load signals", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSignals();
  }, [loadSignals]);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Header */}
      <header className="flex h-16 items-center justify-between border-b border-border px-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold">USDJPY</h1>
            <span className="rounded bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-500">
              +0.45%
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* <div className="flex flex-col items-end text-sm">
            <span className="text-zinc-500">Equity</span>
            <span className="font-mono font-medium">$12,450.00</span>
          </div> */}
          {/* <div className="h-8 w-px bg-border" />
          <Button variant="ghost" size="icon">
            <Bell className="h-5 w-5" />
          </Button> */}
          <Button variant="ghost" size="icon">
            <Settings className="h-5 w-5" />
          </Button>
          <Link href="/dashboard/history">
            <Button variant="outline" size="sm" className="gap-2">
              History
            </Button>
          </Link>
          <div className="h-8 w-8 rounded-full bg-zinc-200 dark:bg-zinc-800" />
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 grid grid-cols-6 overflow-hidden">
        {/* Left: Chart Area (Flexible) */}
        <div className="col-span-4 flex-1 border-r border-border bg-card/50 p-4 min-h-[500px] lg:min-h-auto flex flex-col">
          {!isLoading && signals.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
              <div className="bg-background p-4 rounded-full shadow-sm">
                <Bell className="h-10 w-10 text-muted-foreground" />
              </div>
              <div className="max-w-[300px]">
                <h3 className="font-semibold text-lg text-foreground mb-2">
                  No signals available
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Try again later to check for new trading opportunities.
                </p>
                <Button
                  onClick={loadSignals}
                  variant="outline"
                  className="gap-2"
                >
                  <ArrowLeft className="h-4 w-4 rotate-[135deg]" />
                  Refresh Signals
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-4 flex items-center gap-2">
                {["1m", "5m", "15m", "1h", "4h", "D"].map((tf) => (
                  <button
                    key={tf}
                    className="rounded px-3 py-1 text-xs font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  >
                    {tf}
                  </button>
                ))}
              </div>
              <div className="flex-1 w-full relative">
                <div className="absolute inset-0">
                  <ChartComponent
                    data={MOCK_DATA}
                    type="candlestick"
                    colors={{
                      backgroundColor: "transparent",
                      textColor: "#A1A1AA", // zinc-400
                    }}
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right: Signals Panel (Fixed Width) */}
        <div className="col-span-2 w-full flex flex-col bg-background border-l border-border h-full">
          <SignalsPanel
            signals={signals}
            isLoading={isLoading}
            onRefresh={loadSignals}
          />
        </div>
      </div>
    </div>
  );
}
