"use client";

import World from "@svg-maps/world";

type Market = {
  name: string;
  subname?: string;
  change?: string;
  coords: [number, number]; // [lng, lat]
  positive: boolean;
};

const markets: Market[] = [
  {
    name: "NASDAQ",
    subname: "-0.96%",
    coords: [-120, 37],
    positive: false,
  },
  {
    name: "S&P 500",
    subname: "ETF",
    change: "-0.40%",
    coords: [-100, 40],
    positive: false,
  },
  {
    name: "Dow Jones",
    subname: "-0.56%",
    coords: [-90, 30],
    positive: false,
  },
  {
    name: "S&P 500",
    subname: "ETF",
    change: "-0.40%",
    coords: [0, 52],
    positive: false,
  },
  {
    name: "FTSE",
    subname: "China",
    change: "-0.58%",
    coords: [80, 35],
    positive: false,
  },
  {
    name: "FTSE",
    subname: "China",
    change: "-0.58%",
    coords: [110, 30],
    positive: false,
  },
  {
    name: "S&P 500",
    subname: "ETF",
    change: "-0.58%",
    coords: [20, 5],
    positive: false,
  },
  {
    name: "S&P 500",
    subname: "ETF",
    change: "+1.18%",
    coords: [10, 65],
    positive: true,
  },
  {
    name: "FTSE",
    subname: "China",
    change: "-0.58%",
    coords: [130, 45],
    positive: false,
  },
  {
    name: "S&P 500",
    subname: "ETF",
    change: "+1.18%",
    coords: [140, -20],
    positive: true,
  },
];

/**
 * Convert [longitude, latitude] to SVG coordinates for the @svg-maps/world viewBox (1010 x 666).
 * The map uses a Miller cylindrical–style projection.
 */
function toSvg(coords: [number, number]): [number, number] {
  const [lng, lat] = coords;
  const x = ((lng + 180) / 360) * 1010;
  // Miller-style Y mapping with slight latitude compression
  const latRad = (lat * Math.PI) / 180;
  const millerY = Math.log(Math.tan(Math.PI / 4 + 0.4 * latRad));
  const maxMillerY = Math.log(Math.tan(Math.PI / 4 + 0.4 * (Math.PI / 2)));
  const y = ((1 - millerY / maxMillerY) / 2) * 666;
  return [x, y];
}

export function GlobalMarkets() {
  return (
    <div className="rounded-lg border border-[#1D1D1D] bg-[#121212] p-4">
      <h2 className="mb-6 text-lg font-semibold text-white">Global Markets</h2>

      <div className="relative overflow-hidden rounded-lg bg-zinc-950">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox={World.viewBox}
          className="h-64 w-full"
          aria-label="World map with market markers"
        >
          {/* Country outlines */}
          <g>
            {World.locations.map(
              (location: { id: string; name: string; path: string }) => (
                <path
                  key={location.id}
                  d={location.path}
                  fill="#18181b"
                  stroke="#3f3f46"
                  strokeWidth={0.3}
                />
              )
            )}
          </g>

          {/* Market markers */}
          {markets.map((market, index) => {
            const color = market.positive ? "#22c55e" : "#ef4444";
            const [cx, cy] = toSvg(market.coords);

            return (
              <g key={index}>
                {/* Glow circle */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={28}
                  fill={color}
                  fillOpacity={0.15}
                  stroke={color}
                  strokeWidth={1.5}
                  strokeOpacity={0.4}
                />

                {/* Name */}
                <text
                  x={cx}
                  y={cy - 4}
                  textAnchor="middle"
                  fill={color}
                  fontSize={8}
                  fontWeight={600}
                  style={{ pointerEvents: "none" }}
                >
                  {market.name}
                </text>

                {/* Subname */}
                {market.subname && (
                  <text
                    x={cx}
                    y={cy + 6}
                    textAnchor="middle"
                    fill={color}
                    fontSize={7}
                    style={{ pointerEvents: "none" }}
                  >
                    {market.subname}
                  </text>
                )}

                {/* Change */}
                {market.change && (
                  <text
                    x={cx}
                    y={cy + 16}
                    textAnchor="middle"
                    fill={color}
                    fontSize={7}
                    style={{ pointerEvents: "none" }}
                  >
                    {market.change}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
