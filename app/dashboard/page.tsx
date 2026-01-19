"use client";

import { ChartComponent } from "@/components/charts/chart";
import { SignalsPanel } from "@/components/dashboard/signals-panel";
import { Button } from "@/components/ui/button";
import { fetchApprovedSignals, fetchPairSignals, ChartDataPoint } from "@/lib/signals";
import { Signal } from "@/types/signal";
import { ArrowLeft, Bell, Settings } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

export default function TraderFocusedPage() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loadingChart, setLoadingChart] = useState(false);
  const [currentPair, setCurrentPair] = useState<string>("");
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>("1h");

  const loadChartData = useCallback(async (pair: string, timeframe?: string) => {
    const period = timeframe || selectedTimeframe;
    try {
      setLoadingChart(true);
      setCurrentPair(pair);
      const data = await fetchPairSignals(pair, period, 100);
      setChartData(data);
    } catch (error) {
      console.error("Failed to load chart data for", pair, error);
      setChartData([]);
    } finally {
      setLoadingChart(false);
    }
  }, [selectedTimeframe]);

  const handleTimeframeChange = useCallback((timeframe: string) => {
    setSelectedTimeframe(timeframe);
    if (currentPair) {
      loadChartData(currentPair, timeframe);
    }
  }, [currentPair, loadChartData]);

  const loadSignals = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await fetchApprovedSignals();
      console.log("Fetched signals:", data); // Debug log
      setSignals(data);
      
      // Load chart data for the first signal if available
      if (data.length > 0) {
        console.log("Loading chart for first signal:", data[0].pair);
        const firstPair = data[0].pair;
        setCurrentPair(firstPair);
        setLoadingChart(true);
        try {
          const chartData = await fetchPairSignals(firstPair);
          setChartData(chartData);
        } catch (chartError) {
          console.error("Failed to load chart data for", firstPair, chartError);
          setChartData([]);
        } finally {
          setLoadingChart(false);
        }
      }
    } catch (error) {
      console.error("Failed to load signals", error);
      setSignals([]);
    } finally {
      setIsLoading(false);
    }
  }, []); // Remove loadChartData dependency to avoid circular dependency

  useEffect(() => {
    loadSignals();
  }, []); // Empty dependency array - only run once on mount

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Header */}
      <header className="flex h-16 items-center justify-between border-b border-border px-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold">{currentPair || "Select a pair"}</h1>
            {signals.length > 0 && (
              <span className="rounded bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-500">
                {signals.length} signal{signals.length > 1 ? "s" : ""}
              </span>
            )}
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
                {[
                  { label: "1m", value: "1m" },
                  { label: "5m", value: "5m" },
                  { label: "15m", value: "15m" },
                  { label: "1h", value: "1h" },
                  { label: "4h", value: "4h" },
                  { label: "D", value: "1d" },
                ].map((tf) => (
                  <button
                    key={tf.value}
                    onClick={() => handleTimeframeChange(tf.value)}
                    className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                      selectedTimeframe === tf.value
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    }`}
                  >
                    {tf.label}
                  </button>
                ))}
              </div>
              <div className="flex-1 w-full relative">
                <div className="absolute inset-0">
                  {loadingChart ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-sm text-muted-foreground">
                        Loading chart data...
                      </div>
                    </div>
                  ) : chartData.length > 0 ? (
                    <ChartComponent
                      data={chartData}
                      type="candlestick"
                      colors={{
                        backgroundColor: "transparent",
                        textColor: "#A1A1AA", // zinc-400
                      }}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-sm text-muted-foreground">
                        No chart data available
                      </div>
                    </div>
                  )}
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
            onSignalClick={loadChartData}
          />
        </div>
      </div>
    </div>
  );
}
