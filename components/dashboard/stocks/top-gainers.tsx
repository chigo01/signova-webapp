"use client";

import { StockRecommendation } from "@/lib/stocks";

interface Props {
  stocks: StockRecommendation[];
}

export function TopGainers({ stocks }: Props) {
  const gainers = stocks
    .filter((s) => s.changePercent > 0)
    .sort((a, b) => b.changePercent - a.changePercent)
    .slice(0, 5);

  return (
    <div className="rounded-2xl bg-zinc-900 p-6">
      <h2 className="mb-4 text-lg font-semibold text-white">Top Gainers</h2>

      <div className="overflow-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-800 text-left text-xs text-zinc-500">
              <th className="pb-3 font-medium">Symbol</th>
              <th className="pb-3 font-medium">Name</th>
              <th className="pb-3 pr-4 text-right font-medium">Price</th>
              <th className="pb-3 text-right font-medium">% Change</th>
            </tr>
          </thead>
          <tbody>
            {gainers.map((stock) => (
              <tr
                key={stock.symbol}
                className="border-b border-zinc-800/50 last:border-0"
              >
                <td className="py-3 text-sm text-white">{stock.symbol}</td>
                <td className="py-3 text-sm text-zinc-400">{stock.name}</td>
                <td className="py-3 pr-4 text-right text-sm text-white">
                  ${stock.price.toFixed(2)}
                </td>
                <td className="py-3 text-right text-sm text-green-500">
                  +{stock.changePercent.toFixed(2)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
