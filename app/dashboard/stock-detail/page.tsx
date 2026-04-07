"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { StockDetailView } from "@/components/dashboard/stocks/stock-detail-view";

function StockDetailGate() {
  const searchParams = useSearchParams();
  const ticker = searchParams.get("ticker")?.trim() ?? "";

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
