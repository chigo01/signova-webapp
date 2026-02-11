"use client";

const gainers = [
  { symbol: "AAPL", name: "Apple", price: 125, change: 6.36 },
  { symbol: "JPM", name: "JPM Chase", price: 121, change: 21.75 },
  { symbol: "UBER", name: "Uber", price: 80, change: 3.84 },
  { symbol: "NVDA", name: "Nvidia", price: 435, change: 5.65 },
  { symbol: "GOOG", name: "Alphabet", price: 234, change: 6.45 },
  { symbol: "MSFT", name: "Microsoft", price: 436, change: 9.54 },
  { symbol: "TGT", name: "Target", price: 89, change: 11.85 },
  { symbol: "NFLX", name: "Netflix", price: 123, change: 4.90 },
  { symbol: "AMZN", name: "Amazon", price: 467, change: 5.98 },
  { symbol: "META", name: "Meta Apps", price: 123, change: 18.94 },
  { symbol: "META", name: "Meta Apps", price: 123, change: 18.94 },
  { symbol: "META", name: "Meta Apps", price: 123, change: 18.94 },
  { symbol: "META", name: "Meta Apps", price: 123, change: 18.94 },
  { symbol: "META", name: "Meta Apps", price: 123, change: 18.94 },
];

export function TopGainers() {
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
            {gainers.map((stock, i) => (
              <tr
                key={i}
                className="border-b border-zinc-800/50 last:border-0"
              >
                <td className="py-3 text-sm text-white">{stock.symbol}</td>
                <td className="py-3 text-sm text-zinc-400">{stock.name}</td>
                <td className="py-3 pr-4 text-right text-sm text-white">
                  {stock.price}
                </td>
                <td className="py-3 text-right text-sm text-green-500">
                  {stock.change}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
