"use client";

import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react";

const etfData = [
  {
    name: "S&P 500 ETF",
    price: "509.90",
    change: "-3.05",
    percent: "-0.40%",
    color: "#f472b6", // Pink
  },
  {
    name: "Dow Jones ETF",
    price: "30,000",
    change: "-3.05",
    percent: "+0.56%",
    color: "#2dd4bf", // Teal
  },
  {
    name: "NASDAQ",
    price: "452.90",
    change: "-3.05",
    percent: "-0.96%",
    color: "#fbbf24", // Yellow
  },
];

export function TopNewsChart() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);

    // Clear canvas
    ctx.clearRect(0, 0, rect.width, rect.height);

    // Generate random wavy data for 3 lines
    const generateData = (offset: number, amplitude: number) => {
      const points = [];
      const numPoints = 100;
      for (let i = 0; i <= numPoints; i++) {
        const x = (i / numPoints) * rect.width;
        // Create more organic flowing waves
        const y =
          rect.height * 0.5 +
          Math.sin(i * 0.1 + offset) * amplitude +
          Math.cos(i * 0.05 + offset * 0.5) * (amplitude * 0.6) +
          Math.sin(i * 0.02) * 10;
        points.push({ x, y });
      }
      return points;
    };

    const datasets = [
      { data: generateData(0, 30), color: "#f472b6" },
      { data: generateData(2, 25), color: "#2dd4bf" },
      { data: generateData(4, 35), color: "#fbbf24" },
    ];

    // Draw lines with smoothing
    datasets.forEach((dataset) => {
      ctx.beginPath();
      ctx.strokeStyle = dataset.color;
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      // Draw smooth curve through points
      if (dataset.data.length > 0) {
        ctx.moveTo(dataset.data[0].x, dataset.data[0].y);

        for (let i = 0; i < dataset.data.length - 1; i++) {
          const p0 = dataset.data[i];
          const p1 = dataset.data[i + 1];
          const midX = (p0.x + p1.x) / 2;
          const midY = (p0.y + p1.y) / 2;

          // Use quadratic curve to midpoint for extra smoothness
          ctx.quadraticCurveTo(p0.x, p0.y, midX, midY);
        }

        // Connect to last point
        const lastPoint = dataset.data[dataset.data.length - 1];
        ctx.lineTo(lastPoint.x, lastPoint.y);
      }

      ctx.stroke();
    });

    // Draw time labels
    ctx.fillStyle = "#71717a"; // zinc-500
    ctx.font = "11px sans-serif";
    ctx.fillText("09:30", 10, rect.height - 5);
    ctx.fillText("16:00", rect.width - 40, rect.height - 5);

    // Draw percentage labels
    ctx.fillText("+1.00", rect.width - 40, 20);
    ctx.fillText("-1.00%", rect.width - 45, rect.height - 20);
  }, []);

  return (
    <div className="rounded-2xl bg-zinc-900 p-6">
      <h2 className="mb-6 text-lg font-semibold text-white">Top News</h2>

      {/* ETF Info */}
      <div className="mb-4 flex items-center gap-6">
        {etfData.map((etf, i) => (
          <div key={i} className="flex items-center gap-2">
            <div
              className="h-8 w-1 rounded-full"
              style={{ backgroundColor: etf.color }}
            />

            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-white">{etf.name}</span>
                <span className="text-sm text-zinc-400">{etf.price}</span>
              </div>
              <div className="flex items-center gap-1 text-xs">
                <span
                  className={
                    etf.percent.startsWith("+")
                      ? "text-green-500"
                      : "text-red-500"
                  }
                >
                  {etf.change}
                </span>
                <span
                  className={
                    etf.percent.startsWith("+")
                      ? "text-green-500"
                      : "text-red-500"
                  }
                >
                  {etf.percent}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="relative h-48">
        <canvas
          ref={canvasRef}
          className="h-full w-full"
          style={{ width: "100%", height: "100%" }}
        />
      </div>
    </div>
  );
}
