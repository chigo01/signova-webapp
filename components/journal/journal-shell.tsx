"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  Clock3,
  FileText,
  Import,
  Loader2,
  MessageSquare,
  Plus,
  Search,
  Share2,
  Sparkles,
  Star,
  Table2,
} from "lucide-react";
import {
  createJournal,
  createJournalRow,
  fetchDefaultJournal,
  fetchJournal,
  importSignalPlays,
  listJournals,
  saveJournal,
  updateJournalRow,
} from "@/lib/journal";
import type {
  Journal,
  JournalRow,
  JournalSummary,
} from "@/components/journal/journal-types";
import { cn } from "@/lib/utils";
import { AddViewMenu } from "./journal-popovers";
import { JournalSwitcher } from "./journal-switcher";
import { JournalTable } from "./journal-table";

type PopoverName =
  | "view"
  | "property"
  | "new-property"
  | "edit-property"
  | "switcher";

function makeStarterRows(): JournalRow[] {
  const now = new Date().toISOString();

  return [
    {
      id: `row-${Date.now()}-1`,
      cells: {
        pair: "USDT/GOLD",
        date: "2026-11-30",
        bias: "Daily bullish",
        tags: [],
      },
      createdAt: now,
      updatedAt: now,
    },
    {
      id: `row-${Date.now()}-2`,
      cells: {
        pair: "GBP/USD",
        date: "2026-11-30",
        bias: "Daily bullish",
        tags: [],
      },
      createdAt: now,
      updatedAt: now,
    },
    {
      id: `row-${Date.now()}-3`,
      cells: {
        pair: "GBP/USD",
        date: "2026-11-30",
        bias: "Daily bullish",
        tags: [],
      },
      createdAt: now,
      updatedAt: now,
    },
  ];
}

function JournalTopBar({
  breadcrumbTitle,
  isSwitcherOpen,
  onToggleSwitcher,
  journals,
  activeId,
  isCreatingJournal,
  onCreateJournal,
}: {
  breadcrumbTitle: string;
  isSwitcherOpen: boolean;
  onToggleSwitcher: () => void;
  journals: JournalSummary[];
  activeId: string | null;
  isCreatingJournal: boolean;
  onCreateJournal: () => void;
}) {
  return (
    <header className="flex h-10 items-center justify-between border-b border-zinc-900 px-4 text-xs text-zinc-500">
      <div className="relative flex items-center gap-1">
        <Link
          href="/dashboard/journal"
          className="transition-colors hover:text-zinc-300"
        >
          Trading journal
        </Link>
        <span>/</span>
        <button
          type="button"
          onClick={onToggleSwitcher}
          className="flex items-center gap-1 font-medium text-zinc-300 transition-colors hover:text-white"
          aria-haspopup="menu"
          aria-expanded={isSwitcherOpen}
        >
          {breadcrumbTitle}
          <ChevronDown className="h-3 w-3" />
        </button>
        {isSwitcherOpen ? (
          <JournalSwitcher
            journals={journals}
            activeId={activeId}
            isCreating={isCreatingJournal}
            onCreate={onCreateJournal}
          />
        ) : null}
      </div>
      <div className="flex items-center gap-4">
        <div className="relative hidden sm:block">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
          <input
            aria-label="Search journal"
            placeholder="USDT/GOLD"
            className="h-7 w-48 rounded-md border border-zinc-900 bg-[#121212] pl-8 pr-3 text-xs text-zinc-300 outline-none placeholder:text-zinc-600 focus:border-zinc-700 lg:w-64"
          />
        </div>
        <div className="hidden items-center gap-3 text-zinc-400 md:flex">
          <button className="text-xs transition-colors hover:text-white">
            Share
          </button>
          <MessageSquare className="h-4 w-4" />
          <Star className="h-4 w-4" />
          <Clock3 className="h-4 w-4" />
        </div>
      </div>
    </header>
  );
}

export function JournalShell({ journalId }: { journalId?: string } = {}) {
  const router = useRouter();
  const [journal, setJournal] = useState<Journal | null>(null);
  const [journals, setJournals] = useState<JournalSummary[]>([]);
  const [titleDraft, setTitleDraft] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreatingJournal, setIsCreatingJournal] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isTableMode, setIsTableMode] = useState(false);
  const [openPopover, setOpenPopover] = useState<PopoverName | null>(null);

  const refreshJournals = useCallback(async () => {
    try {
      const list = await listJournals();
      setJournals(list);
    } catch {
      // Switcher list is non-critical; ignore failures silently.
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadJournal() {
      try {
        setIsLoading(true);
        const [data, list] = await Promise.all([
          journalId ? fetchJournal(journalId) : fetchDefaultJournal(),
          listJournals().catch(() => [] as JournalSummary[]),
        ]);
        if (cancelled) return;
        setJournal(data);
        setJournals(list);
        setTitleDraft(data.title);
        setIsTableMode(data.rows.length > 0);
      } catch (loadError) {
        if (cancelled) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load journal",
        );
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadJournal();
    return () => {
      cancelled = true;
    };
  }, [journalId]);

  const visibleTitle = useMemo(() => {
    if (titleDraft.trim()) return titleDraft;
    return isTableMode ? "Trading Journal (testing)" : "New Trading Journal";
  }, [isTableMode, titleDraft]);

  const persistJournal = useCallback(
    async (payload: Parameters<typeof saveJournal>[1]) => {
      if (!journal) return;
      setIsSaving(true);
      setError(null);

      try {
        const updated = await saveJournal(journal._id, payload);
        setJournal(updated);
        setTitleDraft(updated.title);
        setStatus("Saved");
        // Keep the switcher list fresh if title/rows changed.
        void refreshJournals();
      } catch (saveError) {
        setError(
          saveError instanceof Error
            ? saveError.message
            : "Could not save journal",
        );
      } finally {
        setIsSaving(false);
      }
    },
    [journal, refreshJournals],
  );

  const handleCreateJournal = useCallback(async () => {
    setIsCreatingJournal(true);
    setError(null);
    try {
      const created = await createJournal();
      setOpenPopover(null);
      router.push(`/dashboard/journal/${created._id}`);
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Could not create journal",
      );
    } finally {
      setIsCreatingJournal(false);
    }
  }, [router]);

  const handleTitleBlur = () => {
    if (!journal || titleDraft === journal.title) return;
    void persistJournal({ title: titleDraft });
  };

  const handleCreateTable = async () => {
    if (!journal) return;
    setOpenPopover(null);
    setIsTableMode(true);

    if (journal.rows.length > 0) return;

    const title = titleDraft.trim() || "Trading Journal (testing)";
    const rows = makeStarterRows();
    setTitleDraft(title);
    setJournal({ ...journal, title, rows });
    await persistJournal({ title, rows });
  };

  const handleAddRow = async () => {
    if (!journal) return;
    setIsSaving(true);
    try {
      const updated = await createJournalRow(journal._id, {
        pair: "",
        date: new Date().toISOString(),
        bias: "",
        tags: [],
      });
      setJournal(updated);
      setStatus("Row added");
    } catch (addError) {
      setError(addError instanceof Error ? addError.message : "Could not add row");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDraftCell = (rowId: string, propertyId: string, value: string) => {
    if (!journal) return;

    setJournal({
      ...journal,
      rows: journal.rows.map((row) =>
        row.id === rowId
          ? { ...row, cells: { ...row.cells, [propertyId]: value } }
          : row,
      ),
    });
  };

  const handleCommitCell = async (rowId: string) => {
    if (!journal) return;
    const row = journal.rows.find((item) => item.id === rowId);
    if (!row) return;

    // Normalize cells by property type before persisting. Multi-select
    // cells are edited as comma-joined strings; convert back to arrays
    // here so we don't silently corrupt the stored shape.
    const normalizedCells: Record<string, unknown> = { ...row.cells };
    for (const property of journal.properties) {
      if (property.type !== "multi-select") continue;
      const raw = normalizedCells[property.id];
      if (typeof raw === "string") {
        normalizedCells[property.id] = raw
          .split(",")
          .map((token) => token.trim())
          .filter(Boolean);
      } else if (raw === undefined || raw === null) {
        normalizedCells[property.id] = [];
      }
    }

    try {
      const updated = await updateJournalRow(journal._id, rowId, normalizedCells);
      setJournal(updated);
      setStatus("Saved");
    } catch (commitError) {
      setError(
        commitError instanceof Error ? commitError.message : "Could not save row",
      );
    }
  };

  const handleImport = async () => {
    if (!journal) return;
    setIsSaving(true);
    setError(null);

    try {
      const result = await importSignalPlays(journal._id);
      setJournal(result.journal);
      setTitleDraft(result.journal.title);
      setIsTableMode(true);
      setStatus(
        result.importedCount === 1
          ? "Imported 1 signal"
          : `Imported ${result.importedCount} signals`,
      );
    } catch (importError) {
      setError(
        importError instanceof Error
          ? importError.message
          : "Could not import signals",
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <main className="flex min-h-0 flex-1 items-center justify-center bg-black text-zinc-500">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading journal...
      </main>
    );
  }

  if (!journal) {
    return (
      <main className="flex min-h-0 flex-1 items-center justify-center bg-black px-6 text-center text-sm text-zinc-500">
        {error || "Journal could not be loaded."}
      </main>
    );
  }

  const breadcrumbTitle = titleDraft.trim() || "New journal";

  return (
    <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-black text-white">
      <JournalTopBar
        breadcrumbTitle={breadcrumbTitle}
        isSwitcherOpen={openPopover === "switcher"}
        onToggleSwitcher={() =>
          setOpenPopover(openPopover === "switcher" ? null : "switcher")
        }
        journals={journals}
        activeId={journal._id}
        isCreatingJournal={isCreatingJournal}
        onCreateJournal={handleCreateJournal}
      />

      <div
        className="min-h-[calc(100dvh-2.5rem)] px-4 pb-20 pt-5 sm:px-6 lg:px-8 lg:pb-12"
        onClick={() => {
          if (openPopover !== "edit-property") setOpenPopover(null);
        }}
      >
        <div
          className="mx-auto max-w-[1280px]"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="mb-6 flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h1
                className={cn(
                  "mb-4 text-3xl font-bold tracking-tight text-white sm:text-4xl",
                  !isTableMode && "text-xl sm:text-2xl",
                )}
              >
                {isTableMode ? visibleTitle : "New Trading Journal"}
              </h1>

              {!isTableMode ? (
                <input
                  aria-label="Journal title"
                  value={titleDraft}
                  onChange={(event) => setTitleDraft(event.target.value)}
                  onBlur={handleTitleBlur}
                  placeholder="Your Title..."
                  className="mb-2 block w-full bg-transparent text-3xl font-bold text-zinc-200 outline-none placeholder:text-zinc-800 sm:text-4xl"
                />
              ) : null}
            </div>

            <div className="flex items-center gap-2 text-xs text-zinc-500">
              {isSaving ? (
                <span className="flex items-center gap-1">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Saving
                </span>
              ) : status ? (
                <span>{status}</span>
              ) : null}
              <Share2 className="hidden h-4 w-4 sm:block" />
            </div>
          </div>

          {!isTableMode ? (
            <div className="max-w-lg space-y-5">
              <div className="space-y-2 text-sm text-zinc-500">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Empty page
                </div>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-zinc-400" />
                  Write &quot;Trading Journal&quot; with AI
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm text-zinc-500">Add new</p>
                <div className="space-y-2 text-sm text-zinc-500">
                  <button
                    type="button"
                    onClick={handleImport}
                    className="flex items-center gap-2 transition-colors hover:text-white"
                  >
                    <Import className="h-4 w-4" />
                    Import
                  </button>
                  <button
                    type="button"
                    className="flex items-center gap-2 transition-colors hover:text-white"
                  >
                    <RowsIcon />
                    Templates
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateTable}
                    className="flex items-center gap-2 transition-colors hover:text-white"
                  >
                    <Table2 className="h-4 w-4" />
                    Table
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="relative mb-1 flex items-center gap-2">
                <button className="flex items-center gap-2 rounded-md bg-[#202020] px-3 py-2 text-sm font-semibold text-white">
                  <Table2 className="h-4 w-4" />
                  {journal.views[0]?.name || "Table"}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setOpenPopover(openPopover === "view" ? null : "view")
                  }
                  className="grid h-8 w-8 place-items-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-900 hover:text-zinc-200"
                  aria-label="Add view"
                >
                  <Plus className="h-4 w-4" />
                </button>
                {openPopover === "view" ? (
                  <AddViewMenu onCreateTable={handleCreateTable} />
                ) : null}
              </div>

              <JournalTable
                journal={journal}
                openPopover={
                  openPopover === "property" ||
                  openPopover === "new-property" ||
                  openPopover === "edit-property"
                    ? openPopover
                    : null
                }
                onOpenPropertyMenu={() =>
                  setOpenPopover(
                    openPopover === "property" ? null : "property",
                  )
                }
                onOpenNewPropertyMenu={() =>
                  setOpenPopover(
                    openPopover === "new-property" ? null : "new-property",
                  )
                }
                onEditProperty={() => setOpenPopover("edit-property")}
                onDraftCell={handleDraftCell}
                onCommitCell={handleCommitCell}
                onAddRow={handleAddRow}
              />
            </>
          )}

          {error ? (
            <p className="mt-4 rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </main>
  );
}

function RowsIcon() {
  return (
    <span className="grid h-4 w-4 grid-cols-2 gap-0.5">
      <span className="rounded-sm border border-zinc-600" />
      <span className="rounded-sm border border-zinc-600" />
      <span className="rounded-sm border border-zinc-600" />
      <span className="rounded-sm border border-zinc-600" />
    </span>
  );
}
