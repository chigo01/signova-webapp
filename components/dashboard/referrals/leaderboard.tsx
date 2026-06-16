import { Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRank, type LeaderboardEntry } from "@/lib/referrals";

interface LeaderboardProps {
  entries: LeaderboardEntry[];
}

const MEDALS = ["🏆", "🥈", "🥉"];

export function Leaderboard({ entries }: LeaderboardProps) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
      <div className="flex items-center gap-2">
        <Trophy className="h-5 w-5 text-amber-400" aria-hidden />
        <h2 className="text-lg font-semibold text-white">Leaderboard</h2>
      </div>
      <p className="mt-1 text-sm text-zinc-500">
        Compete, climb, and get recognized.
      </p>

      <div className="mt-5">
        <div className="flex items-center justify-between border-b border-zinc-800 px-1 pb-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
          <span>Top 10 Affiliates</span>
          <span>Position</span>
        </div>

        {entries.length === 0 ? (
          <p className="py-8 text-center text-sm text-zinc-500">
            No affiliates have earned yet. Be the first.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-900">
            {entries.map((entry) => (
              <li
                key={entry.rank}
                className={cn(
                  "flex items-center justify-between px-1 py-3",
                  entry.isCurrentUser && "rounded-lg bg-emerald-400/5",
                )}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xs font-medium text-zinc-300">
                    {entry.name.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="truncate text-sm font-medium text-white">
                    {entry.name}
                    {entry.isCurrentUser && (
                      <span className="ml-2 text-xs text-emerald-400">You</span>
                    )}
                  </span>
                </div>
                <span className="flex items-center gap-2 text-sm text-zinc-400">
                  {formatRank(entry.rank)}
                  {entry.rank <= 3 && <span>{MEDALS[entry.rank - 1]}</span>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
