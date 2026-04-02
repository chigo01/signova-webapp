"use client";

import type { ComponentProps } from "react";
import { useMemo } from "react";
import { Treemap, ResponsiveContainer } from "recharts";
import type { SectorNode, StockNode } from "@/lib/marketData";
import type { StockRecommendation } from "@/lib/stocks";
import { watchlistToHeatMapSectors } from "@/lib/stocks";

/** Price change gradient when technical signal is neutral */
function getColorByChange(change: number): string {
  if (change > 2) return "#10b981";
  if (change > 1) return "#059669";
  if (change > 0) return "#064e3b";
  if (change > -1) return "#881337";
  if (change > -2) return "#be123c";
  return "#e11d48";
}

/** Prefer API technicalSignal for hue; intensity from changePercent */
function getHeatMapFill(signal: string | undefined, change: number): string {
  const s = (signal ?? "").toLowerCase();
  if (s === "buy") {
    if (change >= 2) return "#10b981";
    if (change >= 0) return "#059669";
    return "#047857";
  }
  if (s === "sell") {
    if (change <= -2) return "#e11d48";
    if (change <= 0) return "#be123c";
    return "#f43f5e";
  }
  return getColorByChange(change);
}

function CustomContent(
  props: {
    x: number;
    y: number;
    width: number;
    height: number;
    name?: string;
    change?: number;
    children?: unknown[];
    payload?: StockNode;
  }
) {
  const { x, y, width, height, name, change, children } = props;
  const payload = props.payload;
  const leafName = payload?.name ?? name;
  const leafChange = payload?.change ?? change ?? 0;
  const signal = payload?.signal;

  if (children && (children as unknown[]).length > 0) return null;

  const color = getHeatMapFill(signal, leafChange);

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
        stroke="#18181b"
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
          {leafName}
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
    <div className={`flex min-h-0 flex-col ${className ?? ""}`}>
      <div className="mb-2 shrink-0 text-sm font-medium text-zinc-300">
        {data.name}
      </div>
      <div className="min-h-[140px] w-full flex-1 overflow-hidden rounded-sm bg-zinc-800">
        <ResponsiveContainer width="100%" height="100%">
          <Treemap
            data={data.children}
            dataKey="size"
            aspectRatio={4 / 3}
            stroke="none"
            isAnimationActive={false}
            content={(p: unknown) => (
              <CustomContent {...(p as ComponentProps<typeof CustomContent>)} />
            )}
          />
        </ResponsiveContainer>
      </div>
    </div>
  );
}

interface HeatMapProps {
  watchlist: StockRecommendation[];
  loading?: boolean;
}

export function HeatMap({ watchlist, loading = false }: HeatMapProps) {
  const sectorData = useMemo(() => {
    if (watchlist.length === 0) return [];
    return watchlistToHeatMapSectors(watchlist);
  }, [watchlist]);

  const hasData = sectorData.length > 0;

  return (
    <div className="flex min-h-[500px] flex-col rounded-lg border border-[#1D1D1D] bg-[#121212] p-4">
      <div className="mb-4 flex shrink-0 items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Heat Map</h2>
        <span className="text-[10px] text-zinc-500">
          By sector · size = market cap · color = technical signal
        </span>
      </div>

      {loading ? (
        <div className="flex flex-1 flex-col gap-3 py-4">
          <div className="h-40 animate-pulse rounded-lg bg-zinc-800" />
          <div className="grid grid-cols-2 gap-3">
            <div className="h-32 animate-pulse rounded-lg bg-zinc-800" />
            <div className="h-32 animate-pulse rounded-lg bg-zinc-800" />
          </div>
        </div>
      ) : !hasData ? (
        <div className="flex flex-1 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950/40 px-4 py-12 text-center text-sm text-zinc-500">
          Load stock recommendations to see sector heat map (market cap and
          signals).
        </div>
      ) : (
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto lg:grid-cols-12">
          {sectorData.length <= 1 ? (
            <div className="h-[min(360px,50vh)] w-full lg:col-span-12">
              {sectorData[0] && (
                <SectorTreemap data={sectorData[0]} className="h-full" />
              )}
            </div>
          ) : (
            <>
              <div className="h-[min(360px,50vh)] w-full lg:col-span-7">
                <SectorTreemap data={sectorData[0]} className="h-full" />
              </div>
              <div className="flex min-h-[360px] flex-col gap-4 lg:col-span-5">
                {sectorData.slice(1, 3).map((sector) => (
                  <SectorTreemap
                    key={sector.name}
                    data={sector}
                    className="min-h-0 flex-1"
                  />
                ))}
              </div>
              {sectorData.length > 3 && (
                <div className="col-span-full grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {sectorData.slice(3).map((sector) => (
                    <SectorTreemap
                      key={sector.name}
                      data={sector}
                      className="min-h-[200px]"
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
