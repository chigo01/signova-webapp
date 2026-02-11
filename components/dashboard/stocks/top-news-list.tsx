"use client";

const news = [
  {
    title: "Retail Sales Slump Takes Toll on...",
    time: "10 min ago",
  },
  {
    title: "Tech Giant's Earnings Soar, Stock...",
    time: "2 min ago",
  },
  {
    title: "High-Profile IPO Falls Short of Ex...",
    time: "12 hrs ago",
  },
  {
    title: "Electric Vehicle Stocks Skyrocketi...",
    time: "22 hrs ago",
  },
  {
    title: "Market Sentiment Turns Bearish i...",
    time: "2 hrs ago",
  },
  {
    title: "Chip Shortage Woes Continue, T...",
    time: "3 days ago",
  },
  {
    title: "Chip Shortage Woes Continue, T...",
    time: "3 days ago",
  },
  {
    title: "Chip Shortage Woes Continue, T...",
    time: "3 days ago",
  },
  {
    title: "Chip Shortage Woes Continue, T...",
    time: "3 days ago",
  },
  {
    title: "Chip Shortage Woes Continue, T...",
    time: "3 days ago",
  },
  {
    title: "Chip Shortage Woes Continue, T...",
    time: "3 days ago",
  },
  {
    title: "Chip Shortage Woes Continue, T...",
    time: "3 days ago",
  },
  {
    title: "Chip Shortage Woes Continue, T...",
    time: "3 days ago",
  },
];

export function TopNewsList() {
  return (
    <div className="rounded-2xl bg-zinc-900 p-6">
      <h2 className="mb-4 text-lg font-semibold text-white">Top News</h2>

      <div className="space-y-3">
        {news.map((item, i) => (
          <div
            key={i}
            className="flex items-center justify-between border-b border-zinc-800 pb-3 last:border-0"
          >
            <span className="text-sm text-zinc-300">{item.title}</span>
            <span className="whitespace-nowrap text-xs text-zinc-500">
              {item.time}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
