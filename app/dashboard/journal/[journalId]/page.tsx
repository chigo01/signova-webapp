import { JournalShell } from "@/components/journal/journal-shell";

export default async function JournalByIdPage({
  params,
}: {
  params: Promise<{ journalId: string }>;
}) {
  const { journalId } = await params;
  return <JournalShell journalId={journalId} />;
}
