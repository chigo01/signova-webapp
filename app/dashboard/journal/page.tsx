"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { JournalShell } from "@/components/journal/journal-shell";

function JournalPageInner() {
  const params = useSearchParams();
  const id = params.get("id") || undefined;
  return <JournalShell journalId={id} />;
}

export default function JournalPage() {
  return (
    <Suspense fallback={null}>
      <JournalPageInner />
    </Suspense>
  );
}
