"use client";

import { HistoryTable } from "@/components/dashboard/history-table";
import { Button } from "@/components/ui/button";
import { fetchSignalHistory } from "@/lib/signals";
import { SignalPlay } from "@/types/signal";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

export default function HistoryPage() {
  const [history, setHistory] = useState<SignalPlay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const LIMIT = 20;

  const loadHistory = useCallback(async (page: number) => {
    try {
      setIsLoading(true);
      const res = await fetchSignalHistory(page, LIMIT);
      setHistory(res.data);
      setTotalPages(res.pagination.totalPages);
      setCurrentPage(res.pagination.page);
    } catch (error) {
      console.error("Failed to load history:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory(currentPage);
  }, [loadHistory, currentPage]);

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Header */}
      <header className="flex h-16 items-center border-b border-border px-6">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm font-medium">Back to Trade</span>
        </Link>
        <div className="ml-4 h-6 w-px bg-border" />
        <h1 className="ml-4 text-lg font-bold">Signal History</h1>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6">
        <div className="mx-auto max-w-5xl space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Your recent trading activity and signal plays
            </p>
          </div>

          <HistoryTable data={history} isLoading={isLoading} />

          {/* Pagination */}
          {!isLoading && history.length > 0 && (
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevPage}
                disabled={currentPage <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <div className="text-sm font-medium">
                Page {currentPage} of {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={currentPage >= totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
