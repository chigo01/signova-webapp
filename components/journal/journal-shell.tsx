"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
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
  deleteJournal,
  fetchDefaultJournal,
  fetchJournal,
  generateAiCell,
  importSignalPlays,
  listJournals,
  saveJournal,
  updateJournalRow,
} from "@/lib/journal";
import type {
  Journal,
  JournalProperty,
  JournalRow,
  JournalSummary,
} from "@/components/journal/journal-types";
import { cn } from "@/lib/utils";
import { AddViewMenu } from "./journal-popovers";
import { JournalCalendar } from "./journal-calendar";
import { JournalSwitcher } from "./journal-switcher";
import { JournalTable } from "./journal-table";
import type {
  FilterEntry,
  SortState,
} from "./journal-toolbar";

type PopoverName =
  | "view"
  | "property"
  | "new-property"
  | "edit-property"
  | "switcher"
  | "sort"
  | "filter"
  | "clock";

const STARRED_KEY = "signova:starredJournalIds";

function readStarredIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STARRED_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map((v) => String(v)) : [];
  } catch {
    return [];
  }
}

function writeStarredIds(ids: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STARRED_KEY, JSON.stringify(ids));
  } catch {
    /* localStorage may be unavailable (private mode, quota) — ignore. */
  }
}

function formatRelative(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const sec = Math.round(diffMs / 1000);
  const abs = Math.abs(sec);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  if (abs < 60) return rtf.format(-sec, "second");
  if (abs < 3600) return rtf.format(-Math.round(sec / 60), "minute");
  if (abs < 86400) return rtf.format(-Math.round(sec / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(-Math.round(sec / 86400), "day");
  if (abs < 86400 * 365)
    return rtf.format(-Math.round(sec / (86400 * 30)), "month");
  return rtf.format(-Math.round(sec / (86400 * 365)), "year");
}

/**
 * Build the empty cell map for a new row from the journal's current
 * property list — keeps row shape in sync with whatever columns the
 * user has defined, so adding/renaming a column later doesn't orphan
 * cells on freshly-added rows.
 */
function makeEmptyCells(
  properties: Journal["properties"],
): Record<string, unknown> {
  const cells: Record<string, unknown> = {};
  for (const property of properties) {
    if (property.type === "multi-select") {
      cells[property.id] = [];
    } else if (property.type === "ai") {
      // AI cells start truly empty so the Generate button renders.
      continue;
    } else {
      cells[property.id] = "";
    }
  }
  return cells;
}

function JournalTopBar({
  breadcrumbTitle,
  isSwitcherOpen,
  onToggleSwitcher,
  journals,
  activeId,
  isCreatingJournal,
  onCreateJournal,
  onShare,
  onToggleComments,
  isCommentsOpen,
  onToggleStar,
  isStarred,
  onToggleClock,
  isClockOpen,
  journalCreatedAt,
  journalUpdatedAt,
}: {
  breadcrumbTitle: string;
  isSwitcherOpen: boolean;
  onToggleSwitcher: () => void;
  journals: JournalSummary[];
  activeId: string | null;
  isCreatingJournal: boolean;
  onCreateJournal: () => void;
  onShare: () => void;
  onToggleComments: () => void;
  isCommentsOpen: boolean;
  onToggleStar: () => void;
  isStarred: boolean;
  onToggleClock: () => void;
  isClockOpen: boolean;
  journalCreatedAt: string | null;
  journalUpdatedAt: string | null;
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
          <button
            type="button"
            onClick={onShare}
            className="text-xs transition-colors hover:text-white"
          >
            Share
          </button>
          <button
            type="button"
            onClick={onToggleComments}
            aria-label="Comments"
            className={cn(
              "transition-colors hover:text-white",
              isCommentsOpen && "text-white",
            )}
          >
            <MessageSquare className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onToggleStar}
            aria-label={isStarred ? "Remove from starred" : "Add to starred"}
            className={cn(
              "transition-colors hover:text-white",
              isStarred && "text-amber-400 hover:text-amber-300",
            )}
          >
            <Star
              className={cn("h-4 w-4", isStarred && "fill-current")}
            />
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={onToggleClock}
              aria-label="Journal activity"
              className={cn(
                "transition-colors hover:text-white",
                isClockOpen && "text-white",
              )}
            >
              <Clock3 className="h-4 w-4" />
            </button>
            {isClockOpen ? (
              <div className="absolute right-0 top-7 z-40 w-56 rounded-lg border border-zinc-800 bg-[#171717] p-3 text-left text-[11px] shadow-2xl shadow-black/60">
                <p className="mb-1 font-semibold uppercase tracking-wide text-zinc-500">
                  Activity
                </p>
                <p className="text-zinc-300">
                  <span className="text-zinc-500">Created:</span>{" "}
                  {journalCreatedAt
                    ? formatRelative(new Date(journalCreatedAt))
                    : "—"}
                </p>
                <p className="text-zinc-300">
                  <span className="text-zinc-500">Updated:</span>{" "}
                  {journalUpdatedAt
                    ? formatRelative(new Date(journalUpdatedAt))
                    : "—"}
                </p>
              </div>
            ) : null}
          </div>
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
  const [generatingCells, setGeneratingCells] = useState<Set<string>>(
    () => new Set(),
  );
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const [sort, setSort] = useState<SortState>(null);
  const [filters, setFilters] = useState<FilterEntry[]>([]);
  const [search, setSearch] = useState<string>("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [density, setDensity] = useState<"compact" | "comfortable">(
    "comfortable",
  );
  const [starredIds, setStarredIds] = useState<string[]>(() => readStarredIds());
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
        // A journal opened via an explicit ?id= (i.e. from the switcher or a
        // share link) is already "activated" — go straight to the table.
        // Only the unspecified default route shows the empty-page chooser
        // when it has zero rows AND no title, so brand-new users still see it.
        setIsTableMode(
          data.rows.length > 0 ||
            Boolean(journalId) ||
            data.title.trim().length > 0,
        );
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
      router.push(`/dashboard/journal?id=${created._id}`);
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

    const trimmedTitle = titleDraft.trim();
    if (trimmedTitle && trimmedTitle !== journal.title) {
      setJournal({ ...journal, title: trimmedTitle });
      await persistJournal({ title: trimmedTitle });
    }
  };

  const handleAddRow = async () => {
    if (!journal) return;
    setIsSaving(true);
    try {
      const updated = await createJournalRow(
        journal._id,
        makeEmptyCells(journal.properties),
      );
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

  const handleShare = useCallback(async () => {
    if (typeof window === "undefined") return;
    try {
      await navigator.clipboard.writeText(window.location.href);
      setStatus("Link copied");
    } catch {
      setError("Could not copy link to clipboard");
    }
  }, []);

  const handleToggleStar = useCallback(() => {
    if (!journal) return;
    setStarredIds((prev) => {
      const next = prev.includes(journal._id)
        ? prev.filter((id) => id !== journal._id)
        : [...prev, journal._id];
      writeStarredIds(next);
      return next;
    });
  }, [journal]);

  const handleDuplicateJournal = useCallback(async () => {
    if (!journal) return;
    setIsCreatingJournal(true);
    setError(null);
    try {
      const created = await createJournal();
      const titleBase = journal.title.trim() || "Journal";
      // Re-id rows so they don't collide with the source journal's row ids.
      const clonedRows = journal.rows.map((row, idx) => ({
        ...row,
        id: `row-${Date.now()}-${idx}`,
        linkedSignalPlayId: undefined,
        sourceSignalId: undefined,
      }));
      const updated = await saveJournal(created._id, {
        title: `${titleBase} (copy)`,
        properties: journal.properties,
        views: journal.views,
        rows: clonedRows,
      });
      setStatus("Journal duplicated");
      void refreshJournals();
      router.push(`/dashboard/journal?id=${updated._id}`);
    } catch (dupError) {
      setError(
        dupError instanceof Error
          ? dupError.message
          : "Could not duplicate journal",
      );
    } finally {
      setIsCreatingJournal(false);
    }
  }, [journal, refreshJournals, router]);

  const handleConfirmDelete = useCallback(async () => {
    if (!pendingDeleteId) return;
    setIsDeleting(true);
    setError(null);
    try {
      await deleteJournal(pendingDeleteId);
      setPendingDeleteId(null);
      setStatus("Journal deleted");
      void refreshJournals();
      router.push("/dashboard/journal");
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Could not delete journal",
      );
    } finally {
      setIsDeleting(false);
    }
  }, [pendingDeleteId, refreshJournals, router]);

  const handleSetCell = useCallback(
    async (rowId: string, propertyId: string, value: unknown) => {
      if (!journal) return;
      // Optimistic update so the pill UI feels instant.
      const nextRows = journal.rows.map((row) =>
        row.id === rowId
          ? { ...row, cells: { ...row.cells, [propertyId]: value } }
          : row,
      );
      setJournal({ ...journal, rows: nextRows });
      try {
        const updated = await updateJournalRow(journal._id, rowId, {
          [propertyId]: value,
        });
        setJournal(updated);
        setStatus("Saved");
      } catch (setError_) {
        setError(
          setError_ instanceof Error ? setError_.message : "Could not save cell",
        );
      }
    },
    [journal],
  );

  const handleGenerateAi = useCallback(
    async (rowId: string, propertyId: string) => {
      if (!journal) return;
      const key = `${rowId}:${propertyId}`;
      setGeneratingCells((prev) => {
        const next = new Set(prev);
        next.add(key);
        return next;
      });
      setError(null);
      try {
        const result = await generateAiCell(journal._id, rowId, propertyId);
        setJournal(result.journal);
        setStatus("AI cell generated");
      } catch (generateError) {
        setError(
          generateError instanceof Error
            ? generateError.message
            : "Could not generate AI cell",
        );
      } finally {
        setGeneratingCells((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }
    },
    [journal],
  );

  const handleAddProperty = async (property: JournalProperty) => {
    if (!journal) return;
    const properties = [...journal.properties, property];
    // Optimistic: show immediately, then persist.
    setJournal({ ...journal, properties });
    await persistJournal({ properties });
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
        onShare={handleShare}
        onToggleComments={() => setIsCommentsOpen((prev) => !prev)}
        isCommentsOpen={isCommentsOpen}
        onToggleStar={handleToggleStar}
        isStarred={starredIds.includes(journal._id)}
        onToggleClock={() =>
          setOpenPopover(openPopover === "clock" ? null : "clock")
        }
        isClockOpen={openPopover === "clock"}
        journalCreatedAt={journal.createdAt}
        journalUpdatedAt={journal.updatedAt}
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
                <button
                  type="button"
                  onClick={handleCreateTable}
                  className="flex items-center gap-2 transition-colors hover:text-white"
                >
                  <FileText className="h-4 w-4" />
                  Empty page
                </button>
                <button
                  type="button"
                  onClick={handleCreateTable}
                  className="flex items-center gap-2 transition-colors hover:text-white"
                  title="Coming soon — opens an empty table for now"
                >
                  <Sparkles className="h-4 w-4 text-zinc-400" />
                  Write &quot;Trading Journal&quot; with AI
                </button>
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
                    onClick={handleCreateTable}
                    className="flex items-center gap-2 transition-colors hover:text-white"
                    title="Coming soon — opens an empty table for now"
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
              <div className="relative mb-1 flex items-center gap-1">
                {journal.views.map((view) => {
                  const isActive =
                    (activeViewId ?? journal.views[0]?.id) === view.id;
                  const Icon = view.type === "calendar" ? CalendarDays : Table2;
                  return (
                    <button
                      key={view.id}
                      type="button"
                      onClick={() => setActiveViewId(view.id)}
                      className={cn(
                        "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition-colors",
                        isActive
                          ? "bg-[#202020] text-white"
                          : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {view.name}
                    </button>
                  );
                })}
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

              {(() => {
                const view =
                  journal.views.find(
                    (v) => v.id === (activeViewId ?? journal.views[0]?.id),
                  ) ?? journal.views[0];
                if (view?.type === "calendar") {
                  return <JournalCalendar journal={journal} />;
                }
                return (
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
                        openPopover === "new-property"
                          ? null
                          : "new-property",
                      )
                    }
                    onCloseNewPropertyMenu={() => setOpenPopover(null)}
                    onAddProperty={handleAddProperty}
                    onEditProperty={() => setOpenPopover("edit-property")}
                    onDraftCell={handleDraftCell}
                    onCommitCell={handleCommitCell}
                    onSetCell={handleSetCell}
                    onAddRow={handleAddRow}
                    onGenerateAi={handleGenerateAi}
                    generatingCells={generatingCells}
                    sort={sort}
                    filters={filters}
                    search={search}
                    isSortOpen={openPopover === "sort"}
                    isFilterOpen={openPopover === "filter"}
                    isSearchOpen={isSearchOpen}
                    onChangeSort={setSort}
                    onChangeFilters={setFilters}
                    onChangeSearch={setSearch}
                    onToggleSort={() =>
                      setOpenPopover(
                        openPopover === "sort" ? null : "sort",
                      )
                    }
                    onToggleFilter={() =>
                      setOpenPopover(
                        openPopover === "filter" ? null : "filter",
                      )
                    }
                    onToggleSearch={() => {
                      setIsSearchOpen((prev) => {
                        if (prev) setSearch("");
                        return !prev;
                      });
                    }}
                    density={density}
                    onToggleDensity={() =>
                      setDensity((d) =>
                        d === "compact" ? "comfortable" : "compact",
                      )
                    }
                    onDuplicateJournal={handleDuplicateJournal}
                    onDeleteJournal={() => setPendingDeleteId(journal._id)}
                    canDelete={journals.length > 1}
                  />
                );
              })()}
            </>
          )}

          {error ? (
            <p className="mt-4 rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {error}
            </p>
          ) : null}
        </div>
      </div>

      {pendingDeleteId ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
          onClick={() => !isDeleting && setPendingDeleteId(null)}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-sm rounded-lg border border-zinc-800 bg-[#171717] p-5 shadow-2xl shadow-black/80"
          >
            <h3 className="mb-2 text-base font-semibold text-white">
              Delete this journal?
            </h3>
            <p className="mb-4 text-xs text-zinc-400">
              This permanently removes the journal and all its rows. This
              action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setPendingDeleteId(null)}
                className="rounded-md border border-zinc-800 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="flex items-center gap-1.5 rounded-md bg-rose-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-400 disabled:opacity-50"
              >
                {isDeleting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : null}
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isCommentsOpen ? (
        <aside
          className="fixed bottom-0 right-0 top-0 z-30 flex w-full max-w-sm flex-col border-l border-zinc-900 bg-[#0a0a0a] shadow-2xl shadow-black/80"
          aria-label="Comments"
        >
          <header className="flex items-center justify-between border-b border-zinc-900 px-4 py-3">
            <h3 className="text-sm font-semibold text-zinc-100">Comments</h3>
            <button
              type="button"
              onClick={() => setIsCommentsOpen(false)}
              className="rounded p-1 text-zinc-400 hover:bg-zinc-900 hover:text-white"
              aria-label="Close comments"
            >
              <MessageSquare className="h-4 w-4" />
            </button>
          </header>
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <MessageSquare className="mb-2 h-6 w-6 text-zinc-700" />
            <p className="text-sm text-zinc-300">Comments are coming soon</p>
            <p className="mt-1 text-xs text-zinc-500">
              You&apos;ll be able to annotate trades and discuss them with
              your team here.
            </p>
          </div>
          <div className="border-t border-zinc-900 p-3">
            <input
              disabled
              placeholder="Comments coming soon..."
              className="h-9 w-full cursor-not-allowed rounded-md border border-zinc-900 bg-[#121212] px-3 text-xs text-zinc-600 outline-none"
            />
          </div>
        </aside>
      ) : null}
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
