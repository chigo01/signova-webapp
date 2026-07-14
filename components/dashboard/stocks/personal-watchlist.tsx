"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Bell, BellOff, Loader2, Trash2 } from "lucide-react";
import {
  fetchPersonalWatchlist,
  removePersonalWatchlistStock,
  setActivePersonalWatchlistStocks,
  type WatchlistResponse,
} from "@/lib/stocks";
import { getAuthToken } from "@/lib/cookies";

export function PersonalWatchlist() {
  const [data, setData] = useState<WatchlistResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingSymbol, setSavingSymbol] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!getAuthToken()) {
      setLoading(false);
      return;
    }
    try {
      setError(null);
      setData(await fetchPersonalWatchlist());
    } catch (loadError) {
      console.error(loadError);
      setError("Couldn’t load your watchlist.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (!getAuthToken()) return null;

  const remove = async (symbol: string) => {
    setSavingSymbol(symbol);
    setError(null);
    try {
      await removePersonalWatchlistStock(symbol);
      await load();
    } catch (removeError) {
      setError(
        removeError instanceof Error
          ? removeError.message
          : "Couldn’t remove this stock.",
      );
    } finally {
      setSavingSymbol(null);
    }
  };

  const toggleActive = async (symbol: string) => {
    if (!data) return;
    const active = data.items
      .filter((item) => item.status === "active")
      .map((item) => item.symbol);
    const isActive = active.includes(symbol);
    const next = isActive
      ? active.filter((item) => item !== symbol)
      : [...active, symbol];
    if (!isActive && data.limit != null && next.length > data.limit) {
      setError(`Choose up to ${data.limit} active stocks.`);
      return;
    }
    setSavingSymbol(symbol);
    setError(null);
    try {
      setData(await setActivePersonalWatchlistStocks(next));
    } catch (toggleError) {
      setError(
        toggleError instanceof Error
          ? toggleError.message
          : "Couldn’t update active stocks.",
      );
    } finally {
      setSavingSymbol(null);
    }
  };

  return (
    <section className="mb-8 rounded-xl border border-zinc-800 bg-zinc-950/40 p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-white">My Watchlist</h2>
          <p className="mt-1 text-xs text-zinc-500">
            {data?.effectivePlan === "free"
              ? `${data.items.length}/${data.limit ?? 3} free stocks saved`
              : `${data?.items.length ?? 0} stocks saved · Pro`}
          </p>
        </div>
        {data && (
          <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-400">
            {data.preferences.delivery === "daily"
              ? `Daily at 8 AM · ${data.preferences.timezone}`
              : data.preferences.delivery === "immediate"
                ? "Immediate news alerts"
                : "News emails off"}
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex h-20 items-center justify-center text-zinc-500">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : data && data.items.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {data.items.map((item) => {
            const paused = item.status === "plan_paused";
            return (
              <div
                key={item.symbol}
                className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-black/50 p-3"
              >
                <Link
                  href={`/dashboard/stock-detail?ticker=${encodeURIComponent(item.symbol)}`}
                  className="min-w-0 flex-1"
                >
                  <span className="block font-semibold text-white">{item.symbol}</span>
                  <span className="block truncate text-xs text-zinc-500">
                    {item.companyName || "Saved stock"}
                  </span>
                  {paused && (
                    <span className="mt-1 block text-[11px] text-amber-400">
                      Alerts paused by free limit
                    </span>
                  )}
                </Link>
                <div className="flex items-center gap-1">
                  {data.effectivePlan === "free" && data.items.length > 3 && (
                    <button
                      type="button"
                      onClick={() => void toggleActive(item.symbol)}
                      disabled={savingSymbol !== null}
                      className="rounded-md p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white disabled:opacity-50"
                      aria-label={paused ? `Enable ${item.symbol} alerts` : `Pause ${item.symbol} alerts`}
                    >
                      {paused ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void remove(item.symbol)}
                    disabled={savingSymbol !== null}
                    className="rounded-md p-2 text-zinc-500 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
                    aria-label={`Remove ${item.symbol} from watchlist`}
                  >
                    {savingSymbol === item.symbol ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-zinc-800 px-4 py-8 text-center text-sm text-zinc-500">
          Open any stock and choose “Add to watchlist” to start tracking it.
        </p>
      )}
      {error && <p className="mt-3 text-sm text-red-400" role="alert">{error}</p>}
    </section>
  );
}
