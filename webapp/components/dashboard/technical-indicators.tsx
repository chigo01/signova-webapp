"use client";

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function TechnicalIndicators() {
  const indicators = [
    { name: "RSI (14)", value: "64.2", signal: "Buy" },
    { name: "STOCH (9,6)", value: "45.0", signal: "Neutral" },
    { name: "CCI (14)", value: "110.4", signal: "Buy" },
    { name: "MACD (12,26)", value: "-0.002", signal: "Sell" },
    { name: "ADX (14)", value: "34.5", signal: "Buy" },
  ];

  const movingAverages = [
    { period: "MA10", type: "Simple", value: "1.0910", signal: "Buy" },
    { period: "MA20", type: "Simple", value: "1.0905", signal: "Buy" },
    { period: "MA50", type: "Exponential", value: "1.0940", signal: "Sell" },
    { period: "MA200", type: "Exponential", value: "1.0820", signal: "Buy" },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:h-full">
      {/* Oscillators */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <h3 className="mb-4 font-semibold text-card-foreground">Oscillators</h3>
        <div className="space-y-3">
          {indicators.map((ind) => (
            <div
              key={ind.name}
              className="flex items-center justify-between text-sm"
            >
              <span className="text-zinc-500">{ind.name}</span>
              <div className="flex items-center gap-3">
                <span className="font-mono">{ind.value}</span>
                <span
                  className={cn(
                    "w-16 text-right font-medium",
                    ind.signal === "Buy"
                      ? "text-green-600"
                      : ind.signal === "Sell"
                      ? "text-red-600"
                      : "text-zinc-500"
                  )}
                >
                  {ind.signal}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Moving Averages */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <h3 className="mb-4 font-semibold text-card-foreground">
          Moving Averages
        </h3>
        <div className="space-y-3">
          {movingAverages.map((ma) => (
            <div
              key={ma.period}
              className="flex items-center justify-between text-sm"
            >
              <span className="text-zinc-500">
                {ma.period}{" "}
                <span className="text-xs opacity-50">({ma.type})</span>
              </span>
              <div className="flex items-center gap-3">
                <span className="font-mono">{ma.value}</span>
                <span
                  className={cn(
                    "w-16 text-right font-medium",
                    ma.signal === "Buy"
                      ? "text-green-600"
                      : ma.signal === "Sell"
                      ? "text-red-600"
                      : "text-zinc-500"
                  )}
                >
                  {ma.signal}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
