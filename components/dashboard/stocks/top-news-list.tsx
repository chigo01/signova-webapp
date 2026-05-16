"use client";

import type { NewsArticle } from "@/lib/stocks";
import { relativeTime } from "@/lib/time";

interface Props {
  articles: NewsArticle[];
  loading?: boolean;
}

export function TopNewsList({ articles, loading = false }: Props) {
  return (
    <div className="rounded-lg border border-[#1D1D1D] bg-[#121212] p-4">
      <h2 className="mb-4 text-lg font-semibold text-white">Top News</h2>

      {loading && articles.length === 0 ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between border-b border-zinc-800 pb-3 last:border-0"
            >
              <span className="h-4 w-3/4 animate-pulse rounded bg-zinc-800" />
              <span className="h-3 w-12 animate-pulse rounded bg-zinc-800" />
            </div>
          ))}
        </div>
      ) : articles.length === 0 ? (
        <p className="text-sm text-zinc-500">No headlines yet.</p>
      ) : (
        <div className="space-y-3">
          {articles.map((item) => (
            <a
              key={item.id}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-3 border-b border-zinc-800 pb-3 transition-colors last:border-0 hover:text-white"
            >
              <span className="line-clamp-2 text-sm text-zinc-300">
                {item.headline}
              </span>
              <span className="whitespace-nowrap text-xs text-zinc-500">
                {relativeTime(item.datetime * 1000)}
              </span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
