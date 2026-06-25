"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, Lock } from "lucide-react";
import { StockDetailView } from "@/components/dashboard/stocks/stock-detail-view";
import { useAuthState } from "@/components/auth/auth-provider";

function StockDetailGate() {
  const searchParams = useSearchParams();
  const { isGuest, promptAuth } = useAuthState();
  const ticker = searchParams.get("ticker")?.trim() ?? "";

  // Viewing a stock's detail is a payoff action — gate it for guests instead of
  // mounting the (authed) detail view.
  if (isGuest) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-black px-4 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-zinc-700 bg-black/60">
          <Lock className="h-5 w-5 text-zinc-300" />
        </div>
        <div>
          <p className="text-base font-semibold text-white">
            Log in to view stock details
          </p>
          <p className="mt-1 max-w-sm text-sm text-zinc-400">
            Create a free account to see live prices, charts, and technical
            analysis for {ticker || "this stock"}.
          </p>
        </div>
        <button
          type="button"
          onClick={() => promptAuth("Log in to view stock details")}
          className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-zinc-200"
        >
          Sign up free
        </button>
        <Link
          href="/dashboard/stocks"
          className="text-xs text-zinc-500 hover:text-zinc-300 hover:underline"
        >
          Back to stock options
        </Link>
      </div>
    );
  }

  if (!ticker) {
    return (
      <div className="min-h-screen bg-black px-4 py-16 text-center text-zinc-400">
        <p className="mb-4 text-sm">No ticker selected.</p>
        <Link
          href="/dashboard/stocks"
          className="text-sm text-blue-400 hover:underline"
        >
          Back to stock options
        </Link>
      </div>
    );
  }

  return <StockDetailView symbol={ticker} />;
}

export default function StockDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-black text-zinc-500">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      }
    >
      <StockDetailGate />
    </Suspense>
  );
}
