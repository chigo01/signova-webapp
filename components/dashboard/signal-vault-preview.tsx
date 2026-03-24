"use client";

import { useEffect, useRef } from "react";
import {
  createChart,
  ColorType,
  LineStyle,
  CandlestickSeries,
} from "lightweight-charts";
import { Button } from "@/components/ui/button";

// Dummy data for the chart — one entry per day, ascending order
const dummyData = Array.from({ length: 100 }, (_, i) => {
  const d = new Date(2025, 0, 1 + i); // starts Jan 1 2025, one per day
  const time = d.toISOString().split("T")[0];
  const basePrice = 300 + Math.sin(i / 10) * 50 + Math.random() * 30;
  return {
    time,
    open: basePrice,
    high: basePrice + Math.random() * 10,
    low: basePrice - Math.random() * 10,
    close: basePrice + (Math.random() - 0.5) * 20,
  };
});

function SignalVaultChart({ data }: { data: typeof dummyData }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 260,
      layout: {
        background: { type: ColorType.Solid, color: "#121212" },
        textColor: "#A0A0A0",
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.04)" },
        horzLines: { color: "rgba(255,255,255,0.04)" },
      },
      crosshair: {
        mode: 1,
        horzLine: {
          color: "rgba(0, 255, 255, 0.3)",
          style: LineStyle.Dotted,
          width: 1,
        },
        vertLine: {
          color: "rgba(0, 255, 255, 0.3)",
          style: LineStyle.Dotted,
          width: 1,
        },
      },
      rightPriceScale: {
        borderColor: "rgba(0,0,0,0)",
      },
      timeScale: {
        borderColor: "rgba(0,0,0,0)",
      },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#0ee8c8",
      downColor: "#ff477a",
      wickUpColor: "#0ee8c8",
      wickDownColor: "#ff477a",
      borderVisible: false,
    });

    candleSeries.setData(data);

    // Optional: the horizontal dotted price line
    candleSeries.createPriceLine({
      price: data[data.length - 1].close,
      color: "#00E5D4",
      lineWidth: 2,
      lineStyle: LineStyle.Dotted,
      axisLabelVisible: true,
      title: "",
    });

    const handleResize = () => {
      chart.applyOptions({
        width: containerRef.current!.clientWidth,
      });
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [data]);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "260px",
      }}
    />
  );
}

export function SignalVaultPreview() {
  return (
    <div className="flex h-full flex-col rounded-lg border border-[#1D1D1D] bg-[#121212] p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-white">Signal vault</h2>
        <Button
          variant="secondary"
          size="sm"
          className="h-8 shrink-0 rounded-full bg-white px-3 text-xs font-medium text-black hover:bg-zinc-200"
        >
          View active signals
        </Button>
      </div>

      <div className="min-h-0 w-full flex-1">
        <SignalVaultChart data={dummyData} />
      </div>

      <div className="mt-2 flex justify-between text-[10px] text-zinc-600">
        <span>Jan</span>
        <span>Feb</span>
        <span>Mar</span>
        <span>Apr</span>
        <span>May</span>
        <span>Jun</span>
      </div>
    </div>
  );
}
