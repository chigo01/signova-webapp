"use client";

import { ChartComponent } from "@/components/charts/chart";
import { EducationalTooltip } from "@/components/dashboard/educational-tooltip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const MOCK_DATA = Array.from({ length: 80 }, (_, i) => {
  const date = new Date();
  date.setDate(date.getDate() - (80 - i));
  const time = date.toISOString().split("T")[0];
  const base = 1.08 + Math.sin(i / 10) * 0.05 + i * 0.0005; // General upward trend
  return { time, value: base };
});

export default function BeginnerPage() {
  const [tradeAmount, setTradeAmount] = useState("100");

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center">
      {/* Navbar with Return Home */}
      <nav className="w-full border-b border-border bg-card p-4">
        <div className="mx-auto flex max-w-5xl items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Concepts</span>
          </Link>
          <h1 className="text-xl font-bold ml-4">EUR/USD Practice Mode</h1>
        </div>
      </nav>

      <main className="w-full max-w-5xl p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Main Chart & Context */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-4 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  Euro / US Dollar
                  <span className="text-sm font-normal text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
                    EURUSD
                  </span>
                </h2>
                <p className="text-zinc-500 mt-1">
                  The value of 1 Euro in US Dollars. Currently{" "}
                  <span className="font-bold text-foreground">$1.0924</span>.
                </p>
              </div>
            </div>
            <div className="relative h-[400px] w-full bg-gradient-to-b from-primary/5 to-transparent rounded-lg overflow-hidden border border-border/50">
              <ChartComponent
                data={MOCK_DATA}
                type="area"
                colors={{
                  lineColor: "#2563eb",
                  areaTopColor: "rgba(37, 99, 235, 0.2)",
                  areaBottomColor: "rgba(37, 99, 235, 0.0)",
                }}
              />
            </div>
            <div className="mt-4 flex gap-4 text-sm text-zinc-500 bg-blue-50 dark:bg-blue-900/10 p-4 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-blue-600 flex-shrink-0" />
              <p>
                <strong>Trend Analysis:</strong> The market is currently moving{" "}
                <strong className="text-green-600">UP</strong>. This means the
                Euro is getting stronger against the Dollar.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h3 className="font-semibold mb-3">Key Terms</h3>
            <div className="flex flex-wrap gap-4">
              <EducationalTooltip
                term="Leverage"
                definition="Using borrowed money to increase potential return."
              />
              <EducationalTooltip
                term="Pip"
                definition="The smallest price move a currency can make."
              />
              <EducationalTooltip
                term="Spread"
                definition="The cost to trade (difference between Buy and Sell price)."
              />
              <EducationalTooltip
                term="Stop Loss"
                definition="A safety net to close a trade if it loses too much."
              />
            </div>
          </div>
        </div>

        {/* Right: Simplified Action Panel */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-400 to-blue-500" />

            <h3 className="text-xl font-bold mb-6">Start a Trade</h3>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">I want to invest</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                    $
                  </span>
                  <Input
                    type="number"
                    value={tradeAmount}
                    onChange={(e) => setTradeAmount(e.target.value)}
                    className="pl-6 text-lg font-semibold"
                  />
                </div>
                <p className="text-xs text-zinc-500">
                  Available Balance: <strong>$5,000.00</strong> (Demo)
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-green-100 bg-green-50 p-4 hover:border-green-500 hover:bg-green-100 transition-all dark:bg-green-950/20 dark:border-green-900 dark:hover:border-green-600">
                  <span className="text-green-700 font-bold text-lg dark:text-green-400">
                    Higher
                  </span>
                  <TrendingUp className="h-6 w-6 text-green-600" />
                  <span className="text-xs text-green-700/70">
                    Buy if you think
                    <br />
                    price will go up
                  </span>
                </button>

                <button className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-red-100 bg-red-50 p-4 hover:border-red-500 hover:bg-red-100 transition-all dark:bg-red-950/20 dark:border-red-900 dark:hover:border-red-600">
                  <span className="text-red-700 font-bold text-lg dark:text-red-400">
                    Lower
                  </span>
                  <TrendingDown className="h-6 w-6 text-red-600" />
                  <span className="text-xs text-red-700/70">
                    Sell if you think
                    <br />
                    price will go down
                  </span>
                </button>
              </div>

              <Button className="w-full size-lg text-lg py-6 shadow-xl shadow-primary/20">
                Confirm Trade
              </Button>
            </div>
          </div>

          <div className="rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 p-6 text-white shadow-lg">
            <h4 className="font-bold mb-2">Learning Tip 💡</h4>
            <p className="text-sm opacity-90">
              Always check the trend before placing a trade. Following the trend
              ("The Trend is your Friend") is safer for beginners.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
