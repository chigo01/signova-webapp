"use client";

import { useState } from "react";
import { Treemap, ResponsiveContainer } from "recharts";
import { sectors } from "@/lib/marketData";
import type { SectorNode } from "@/lib/marketData";

const timeframes = ["D", "W", "M", "Y"];

function getColor(change: number): string {
  if (change > 2) return "#10b981"; // Emerald 500
  if (change > 1) return "#059669"; // Emerald 600
  if (change > 0) return "#064e3b"; // Emerald 900
  if (change > -1) return "#881337"; // Rose 900
  if (change > -2) return "#be123c"; // Rose 700
  return "#e11d48"; // Rose 600
}

interface TreemapContentProps {
  x: number;
  y: number;
  width: number;
  height: number;
  name?: string;
  change?: number;
  children?: unknown[];
}

function CustomContent(props: TreemapContentProps) {
  const { x, y, width, height, name, change, children } = props;

  // Only render leaf nodes (stocks, not sector groups)
  if (children && (children as unknown[]).length > 0) return null;

  const color = getColor(change ?? 0);

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={color}
        rx={0}
        ry={0}
        stroke="#18181b" // zinc-950
        strokeWidth={1}
      />
      {width > 30 && height > 16 && (
        <text
          x={x + width / 2}
          y={y + height / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fill="#ffffff"
          fontSize={Math.min(width / 4, 12)}
          fontWeight={600}
          style={{ pointerEvents: "none" }}
        >
          {name}
        </text>
      )}
    </g>
  );
}

function SectorTreemap({
  data,
  className,
}: {
  data: SectorNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col ${className}`}>
      <div className="mb-2 text-sm font-medium text-zinc-300">{data.name}</div>
      <div className="flex-1 w-full overflow-hidden rounded-sm bg-zinc-800">
        <ResponsiveContainer width="100%" height="100%">
          <Treemap
            data={data.children}
            dataKey="size"
            aspectRatio={4 / 3}
            stroke="none"
            isAnimationActive={false}
            content={<CustomContent x={0} y={0} width={0} height={0} />}
          />
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function HeatMap() {
  const [activeTimeframe, setActiveTimeframe] = useState("D");

  // Group sectors for layout
  const mainSector = sectors[0]; // Information technology
  const rightColumnSectors = sectors.slice(1, 3); // Financials, Consumer staples

  return (
    <div className="flex h-[500px] flex-col rounded-lg border border-[#1D1D1D] bg-[#121212] p-4">
      <div className="mb-4 flex items-center justify-between shrink-0">
        <h2 className="text-lg font-semibold text-white">Heat Map</h2>
      </div>

      {/* Timeframe selector */}
      <div className="mb-4 shrink-0">
        <div className="mb-2 text-xs text-zinc-400">Time frame</div>
        <div className="flex gap-2">
          {timeframes.map((tf) => (
            <button
              key={tf}
              onClick={() => setActiveTimeframe(tf)}
              className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                activeTimeframe === tf
                  ? "bg-zinc-700 text-white"
                  : "bg-zinc-800 text-zinc-400 hover:text-white"
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* Treemap Grid Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0">
        {/* Left Column (Main Sector) */}
        <div className="lg:col-span-7 h-full">
          <SectorTreemap data={mainSector} className="h-full" />
        </div>

        {/* Right Column (Other Sectors) */}
        <div className="lg:col-span-5 h-full flex flex-col gap-4">
          {rightColumnSectors.map((sector) => (
            <SectorTreemap key={sector.name} data={sector} className="h-1/2" />
          ))}
        </div>
      </div>
    </div>
  );
}
