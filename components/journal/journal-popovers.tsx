"use client";

import { useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  CalendarDays,
  ChevronRight,
  Eye,
  GalleryHorizontalEnd,
  Hash,
  ArrowLeft,
  Kanban,
  List,
  ListFilter,
  Rows3,
  Sparkles,
  Table2,
  Text,
  Trash2,
  Type,
  WrapText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  JournalAiKind,
  JournalProperty,
} from "./journal-types";

const menuItemClass =
  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] text-zinc-200 transition-colors hover:bg-zinc-800";

export function AddViewMenu({
  onCreateTable,
}: {
  onCreateTable: () => void;
}) {
  const views = [
    {
      icon: CalendarDays,
      title: "Calendar view",
      description: "Add a table view for all the signal existing the chart",
    },
    {
      icon: Table2,
      title: "Table view",
      description: "Add a table view for all the signal existing the chart",
      onClick: onCreateTable,
    },
    {
      icon: Kanban,
      title: "Board view",
      description: "Add a table view for all the signal existing the chart",
    },
    {
      icon: GalleryHorizontalEnd,
      title: "Gallery view",
      description: "Add a table view for all the signal existing the chart",
    },
    {
      icon: List,
      title: "List view",
      description: "Add a table view for all the signal existing the chart",
    },
  ];

  return (
    <div className="absolute left-0 top-9 z-40 w-[310px] rounded-lg border border-zinc-800 bg-[#171717] p-2 shadow-2xl shadow-black/60">
      <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
        Database
      </p>
      <div className="space-y-1">
        {views.map((view) => (
          <button
            key={view.title}
            type="button"
            onClick={view.onClick}
            className="flex w-full items-center gap-3 rounded-md p-2 text-left transition-colors hover:bg-zinc-800/70"
          >
            <div className="grid h-11 w-11 place-items-center rounded bg-black/60">
              <view.icon className="h-5 w-5 text-zinc-300" />
            </div>
            <span>
              <span className="block text-sm font-semibold text-white">
                {view.title}
              </span>
              <span className="block text-[11px] leading-snug text-zinc-400">
                {view.description}
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function PropertyMenu({ onEdit }: { onEdit: () => void }) {
  return (
    <div className="absolute left-0 top-8 z-40 w-60 rounded-lg border border-zinc-800 bg-[#171717] p-2 shadow-2xl shadow-black/60">
      <div className="mb-2 flex items-center gap-2 rounded-md border border-zinc-800 bg-[#202020] px-2 py-2">
        <Type className="h-3.5 w-3.5 text-zinc-500" />
        <input
          aria-label="Property name"
          defaultValue="Name"
          className="w-full bg-transparent text-xs text-zinc-300 outline-none placeholder:text-zinc-600"
        />
      </div>
      <button type="button" onClick={onEdit} className={menuItemClass}>
        <Rows3 className="h-4 w-4 text-zinc-500" />
        Edit property
      </button>
      <button type="button" className={menuItemClass}>
        <ArrowUp className="h-4 w-4 text-zinc-500" />
        Sort ascending
      </button>
      <button type="button" className={menuItemClass}>
        <ArrowDown className="h-4 w-4 text-zinc-500" />
        Sort descending
      </button>
      <button type="button" className={menuItemClass}>
        <ListFilter className="h-4 w-4 text-zinc-500" />
        Filter
      </button>
      <button type="button" className={menuItemClass}>
        <Rows3 className="h-4 w-4 text-zinc-500" />
        Freeze up to column
      </button>
      <button type="button" className={cn(menuItemClass, "justify-between")}>
        <span className="flex items-center gap-2">
          <WrapText className="h-4 w-4 text-zinc-500" />
          Wrap column
        </span>
        <span className="h-3.5 w-7 rounded-full bg-[#00E0B8] p-0.5">
          <span className="block h-2.5 w-2.5 translate-x-3 rounded-full bg-black" />
        </span>
      </button>
    </div>
  );
}

type AiSuggestion = {
  kind: JournalAiKind;
  label: string;
  defaultName: string;
};

const AI_SUGGESTIONS: AiSuggestion[] = [
  { kind: "summary", label: "AI summary", defaultName: "AI summary" },
  { kind: "key-info", label: "AI key info", defaultName: "AI key info" },
  {
    kind: "custom",
    label: "AI custom autofill",
    defaultName: "AI custom autofill",
  },
  {
    kind: "translation",
    label: "AI translation",
    defaultName: "AI translation",
  },
];

type BasicType = {
  type: "text" | "number" | "select" | "multi-select";
  label: string;
  icon: typeof Text;
  defaultName: string;
};

const BASIC_TYPES: BasicType[] = [
  { type: "text", label: "Text", icon: Text, defaultName: "Text" },
  { type: "number", label: "Number", icon: Hash, defaultName: "Number" },
  { type: "select", label: "Select", icon: Eye, defaultName: "Select" },
  {
    type: "multi-select",
    label: "Multi-select",
    icon: Rows3,
    defaultName: "Multi-select",
  },
];

function makePropertyId(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 32);
  return `${slug || "prop"}-${Date.now().toString(36)}`;
}

export function NewPropertyMenu({
  existingProperties,
  onAddProperty,
  onClose,
}: {
  existingProperties: JournalProperty[];
  onAddProperty: (property: JournalProperty) => void;
  onClose: () => void;
}) {
  const [stage, setStage] = useState<
    | { kind: "root" }
    | { kind: "custom"; name: string; prompt: string }
    | {
        kind: "translation";
        name: string;
        sourcePropertyId: string;
        targetLanguage: string;
      }
  >({ kind: "root" });
  const [filter, setFilter] = useState("");

  const addSimple = (
    type: BasicType["type"] | "ai",
    overrides: Partial<JournalProperty>,
  ) => {
    const name = overrides.name?.trim() || "Untitled";
    const property: JournalProperty = {
      id: makePropertyId(name),
      name,
      type,
      width: 220,
      ...overrides,
    };
    onAddProperty(property);
    onClose();
  };

  const handleAiClick = (suggestion: AiSuggestion) => {
    if (suggestion.kind === "custom") {
      setStage({
        kind: "custom",
        name: suggestion.defaultName,
        prompt: "",
      });
      return;
    }
    if (suggestion.kind === "translation") {
      const firstTextish = existingProperties.find(
        (p) => p.type === "text" || p.type === "ai",
      );
      setStage({
        kind: "translation",
        name: suggestion.defaultName,
        sourcePropertyId: firstTextish?.id ?? "",
        targetLanguage: "Spanish",
      });
      return;
    }
    // summary / key-info → save immediately with defaults.
    addSimple("ai", {
      name: suggestion.defaultName,
      ai: { kind: suggestion.kind, sourcePropertyIds: [] },
    });
  };

  if (stage.kind === "custom") {
    return (
      <div className="absolute right-0 top-10 z-40 w-72 rounded-lg border border-zinc-800 bg-[#171717] p-3 shadow-2xl shadow-black/60">
        <div className="mb-3 flex items-center gap-2">
          <button
            type="button"
            aria-label="Back"
            onClick={() => setStage({ kind: "root" })}
            className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <p className="text-xs font-semibold text-zinc-300">
            AI custom autofill
          </p>
        </div>
        <label className="mb-1 block text-[11px] font-medium text-zinc-500">
          Column name
        </label>
        <input
          value={stage.name}
          onChange={(event) =>
            setStage({ ...stage, name: event.target.value })
          }
          className="mb-3 h-8 w-full rounded border border-zinc-800 bg-[#202020] px-2 text-xs text-zinc-200 outline-none focus:border-zinc-500"
        />
        <label className="mb-1 block text-[11px] font-medium text-zinc-500">
          Prompt
        </label>
        <textarea
          value={stage.prompt}
          onChange={(event) =>
            setStage({ ...stage, prompt: event.target.value })
          }
          placeholder="e.g. Suggest a stop-loss strategy for this trade."
          rows={4}
          className="mb-3 w-full rounded border border-zinc-800 bg-[#202020] p-2 text-xs text-zinc-200 outline-none placeholder:text-zinc-600 focus:border-zinc-500"
        />
        <button
          type="button"
          disabled={!stage.name.trim() || !stage.prompt.trim()}
          onClick={() =>
            addSimple("ai", {
              name: stage.name,
              ai: { kind: "custom", prompt: stage.prompt, sourcePropertyIds: [] },
            })
          }
          className="w-full rounded bg-white px-3 py-1.5 text-xs font-semibold text-black hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Add column
        </button>
      </div>
    );
  }

  if (stage.kind === "translation") {
    const eligibleSources = existingProperties.filter(
      (p) => p.type !== "multi-select" && p.type !== "date",
    );
    return (
      <div className="absolute right-0 top-10 z-40 w-72 rounded-lg border border-zinc-800 bg-[#171717] p-3 shadow-2xl shadow-black/60">
        <div className="mb-3 flex items-center gap-2">
          <button
            type="button"
            aria-label="Back"
            onClick={() => setStage({ kind: "root" })}
            className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <p className="text-xs font-semibold text-zinc-300">AI translation</p>
        </div>
        <label className="mb-1 block text-[11px] font-medium text-zinc-500">
          Column name
        </label>
        <input
          value={stage.name}
          onChange={(event) =>
            setStage({ ...stage, name: event.target.value })
          }
          className="mb-3 h-8 w-full rounded border border-zinc-800 bg-[#202020] px-2 text-xs text-zinc-200 outline-none focus:border-zinc-500"
        />
        <label className="mb-1 block text-[11px] font-medium text-zinc-500">
          Source column
        </label>
        <select
          value={stage.sourcePropertyId}
          onChange={(event) =>
            setStage({ ...stage, sourcePropertyId: event.target.value })
          }
          className="mb-3 h-8 w-full rounded border border-zinc-800 bg-[#202020] px-2 text-xs text-zinc-200 outline-none focus:border-zinc-500"
        >
          {eligibleSources.length === 0 ? (
            <option value="">No eligible columns</option>
          ) : (
            eligibleSources.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))
          )}
        </select>
        <label className="mb-1 block text-[11px] font-medium text-zinc-500">
          Target language
        </label>
        <input
          value={stage.targetLanguage}
          onChange={(event) =>
            setStage({ ...stage, targetLanguage: event.target.value })
          }
          placeholder="e.g. Spanish, French, Japanese"
          className="mb-3 h-8 w-full rounded border border-zinc-800 bg-[#202020] px-2 text-xs text-zinc-200 outline-none placeholder:text-zinc-600 focus:border-zinc-500"
        />
        <button
          type="button"
          disabled={
            !stage.name.trim() ||
            !stage.sourcePropertyId ||
            !stage.targetLanguage.trim()
          }
          onClick={() =>
            addSimple("ai", {
              name: stage.name,
              ai: {
                kind: "translation",
                sourcePropertyIds: [stage.sourcePropertyId],
                targetLanguage: stage.targetLanguage,
              },
            })
          }
          className="w-full rounded bg-white px-3 py-1.5 text-xs font-semibold text-black hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Add column
        </button>
      </div>
    );
  }

  const lowered = filter.trim().toLowerCase();
  const aiMatches = lowered
    ? AI_SUGGESTIONS.filter((s) => s.label.toLowerCase().includes(lowered))
    : AI_SUGGESTIONS;
  const typeMatches = lowered
    ? BASIC_TYPES.filter((t) => t.label.toLowerCase().includes(lowered))
    : BASIC_TYPES;

  return (
    <div className="absolute right-0 top-10 z-40 w-60 rounded-lg border border-zinc-800 bg-[#171717] p-3 shadow-2xl shadow-black/60">
      <p className="mb-3 text-xs font-semibold text-zinc-300">
        New property on Trading Journal
      </p>
      <input
        aria-label="Search or add property"
        placeholder="Search or add new property"
        value={filter}
        onChange={(event) => setFilter(event.target.value)}
        className="mb-4 h-9 w-full rounded border border-zinc-800 bg-[#202020] px-3 text-xs text-zinc-300 outline-none placeholder:text-zinc-600 focus:border-zinc-500"
      />
      {aiMatches.length > 0 ? (
        <>
          <p className="mb-1 text-xs font-medium text-zinc-500">Suggested</p>
          {aiMatches.map((item) => (
            <button
              key={item.kind}
              type="button"
              onClick={() => handleAiClick(item)}
              className={menuItemClass}
            >
              <Sparkles className="h-4 w-4 text-zinc-400" />
              {item.label}
            </button>
          ))}
        </>
      ) : null}
      {typeMatches.length > 0 ? (
        <>
          <p className="mb-1 mt-3 text-xs font-medium text-zinc-500">Type</p>
          {typeMatches.map((basic) => (
            <button
              key={basic.label}
              type="button"
              onClick={() =>
                addSimple(basic.type, {
                  name: basic.defaultName,
                  ...(basic.type === "select" || basic.type === "multi-select"
                    ? { options: [] }
                    : {}),
                })
              }
              className={menuItemClass}
            >
              <basic.icon className="h-4 w-4 text-zinc-500" />
              {basic.label}
            </button>
          ))}
        </>
      ) : null}
    </div>
  );
}

export function EditPropertyPanel() {
  const options = [
    { label: "EQ", className: "bg-cyan-400 text-black" },
    { label: "OB", className: "bg-rose-500 text-black" },
    { label: "FVG", className: "bg-amber-400 text-black" },
  ];

  return (
    <div className="absolute left-0 top-12 z-50 w-[245px] rounded-lg border border-zinc-800 bg-[#171717] p-3 shadow-2xl shadow-black/70 md:w-[260px]">
      <div className="mb-4 flex items-center gap-2">
        <button
          type="button"
          aria-label="Back"
          className="rounded p-1 text-zinc-300 hover:bg-zinc-800"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold text-white">Edit property</span>
      </div>

      <div className="mb-4 flex items-center gap-3">
        <button className="grid h-8 w-8 place-items-center rounded-md border border-zinc-800 bg-black/40">
          <Rows3 className="h-4 w-4 text-white" />
        </button>
        <input
          aria-label="Name of property"
          placeholder="Name of property"
          className="h-9 min-w-0 flex-1 rounded-md border border-zinc-800 bg-[#202020] px-3 text-xs text-zinc-300 outline-none placeholder:text-zinc-600"
        />
      </div>

      <div className="space-y-2 border-b border-zinc-800 pb-4">
        <button className="flex w-full items-center justify-between text-sm">
          <span className="text-zinc-500">Type</span>
          <span className="flex items-center gap-2 font-semibold text-white">
            <Rows3 className="h-4 w-4" />
            Multi select
            <ChevronRight className="h-4 w-4" />
          </span>
        </button>
        <button className="flex w-full items-center justify-between text-sm">
          <span className="text-zinc-500">Sort</span>
          <span className="flex items-center gap-2 text-white">
            Manual
            <ChevronRight className="h-4 w-4" />
          </span>
        </button>
      </div>

      <div className="border-b border-zinc-800 py-3">
        <p className="mb-2 text-sm text-zinc-500">Option</p>
        <div className="rounded-md border border-zinc-800 bg-[#202020] p-2">
          <input
            aria-label="Type a new option"
            placeholder="Type a new option"
            className="mb-2 h-8 w-full rounded-md border border-zinc-500 bg-transparent px-2 text-xs text-zinc-200 outline-none"
          />
          <div className="space-y-1">
            {options.map((option) => (
              <div key={option.label} className="flex items-center gap-2">
                <span className="text-zinc-600">::</span>
                <span
                  className={cn(
                    "rounded px-1.5 py-0.5 text-[11px] font-bold",
                    option.className,
                  )}
                >
                  {option.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="pt-3">
        <p className="mb-2 text-sm text-zinc-500">More</p>
        <button type="button" className={menuItemClass}>
          <Eye className="h-4 w-4" />
          Hide in view
        </button>
        <button type="button" className={menuItemClass}>
          <WrapText className="h-4 w-4" />
          Don&apos;t wrap in view
        </button>
        <button type="button" className={menuItemClass}>
          <Rows3 className="h-4 w-4" />
          Duplicate property
        </button>
        <button type="button" className={menuItemClass}>
          <Trash2 className="h-4 w-4" />
          Delete property
        </button>
      </div>
    </div>
  );
}
