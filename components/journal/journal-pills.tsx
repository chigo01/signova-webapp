"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { chipClassForColor, DEFAULT_CHIP } from "@/lib/journal-colors";
import type {
  JournalProperty,
  JournalPropertyOption,
} from "./journal-types";

interface AnchorRect {
  top: number;
  left: number;
  bottom: number;
  width: number;
}

/** Track an element's viewport rect and update on scroll/resize. */
function useAnchorRect(
  ref: React.RefObject<HTMLElement | null>,
  active: boolean,
): AnchorRect | null {
  const [rect, setRect] = useState<AnchorRect | null>(null);

  useLayoutEffect(() => {
    if (!active) {
      setRect(null);
      return;
    }
    function update() {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setRect({
        top: r.top,
        left: r.left,
        bottom: r.bottom,
        width: r.width,
      });
    }
    update();
    // Capture-phase so nested scroll containers also trigger reposition.
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [ref, active]);

  return rect;
}

/** Resolve a stored cell value to the matching option (by label or id). */
function findOption(
  property: JournalProperty,
  value: string,
): JournalPropertyOption | null {
  if (!property.options || !value) return null;
  return (
    property.options.find(
      (opt) => opt.label === value || opt.id === value,
    ) ?? null
  );
}

function Pill({
  label,
  color,
  onRemove,
  className,
}: {
  label: string;
  color: string | undefined;
  onRemove?: () => void;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] font-medium",
        chipClassForColor(color),
        className,
      )}
    >
      <span className="max-w-[160px] truncate">{label}</span>
      {onRemove ? (
        <button
          type="button"
          aria-label={`Remove ${label}`}
          onClick={(event) => {
            event.stopPropagation();
            onRemove();
          }}
          className="-mr-0.5 rounded-sm opacity-70 hover:opacity-100"
        >
          <X className="h-3 w-3" />
        </button>
      ) : null}
    </span>
  );
}

const DROPDOWN_APPROX_HEIGHT = 280;

/**
 * Dropdown shared by SelectPillCell and MultiSelectPillCell. Rendered via
 * a portal so it can escape the table's horizontal-scroll wrapper (which
 * is forced to `overflow: auto` on both axes by the CSS spec). Positioned
 * with `position: fixed` and tracks the trigger element's viewport rect.
 */
function PillDropdown({
  anchorRef,
  property,
  selectedValues,
  multi,
  onPick,
  onClose,
}: {
  anchorRef: React.RefObject<HTMLElement | null>;
  property: JournalProperty;
  selectedValues: string[];
  multi: boolean;
  onPick: (label: string) => void;
  onClose: () => void;
}) {
  const [filter, setFilter] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const anchorRect = useAnchorRect(anchorRef, true);

  useEffect(() => {
    inputRef.current?.focus();
    function onDown(event: MouseEvent) {
      const target = event.target as Node;
      if (containerRef.current?.contains(target)) return;
      if (anchorRef.current?.contains(target)) return;
      onClose();
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [anchorRef, onClose]);

  const lowered = filter.trim().toLowerCase();
  const options = property.options ?? [];
  const matches = lowered
    ? options.filter((opt) => opt.label.toLowerCase().includes(lowered))
    : options;
  const filterMatchesOption = options.some(
    (opt) => opt.label.toLowerCase() === lowered,
  );
  const canCreate = !!lowered && !filterMatchesOption;

  if (typeof document === "undefined" || !anchorRect) return null;

  // Flip upward if there isn't enough room below.
  const spaceBelow = window.innerHeight - anchorRect.bottom;
  const openUpward =
    spaceBelow < DROPDOWN_APPROX_HEIGHT && anchorRect.top > spaceBelow;
  const top = openUpward
    ? Math.max(8, anchorRect.top - DROPDOWN_APPROX_HEIGHT - 4)
    : anchorRect.bottom + 4;
  const width = Math.max(anchorRect.width, 240);
  // Keep the dropdown on-screen horizontally.
  const left = Math.min(
    Math.max(8, anchorRect.left),
    window.innerWidth - width - 8,
  );

  return createPortal(
    <div
      ref={containerRef}
      style={{ position: "fixed", top, left, width }}
      className="z-50 rounded-lg border border-zinc-800 bg-[#171717] p-2 shadow-2xl shadow-black/60"
      onClick={(event) => event.stopPropagation()}
    >
      <input
        ref={inputRef}
        value={filter}
        onChange={(event) => setFilter(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && canCreate) {
            event.preventDefault();
            onPick(filter.trim());
            if (!multi) onClose();
            setFilter("");
          }
        }}
        placeholder="Search or create..."
        className="mb-2 h-8 w-full rounded border border-zinc-800 bg-[#202020] px-2 text-xs text-zinc-200 outline-none placeholder:text-zinc-600 focus:border-zinc-500"
      />
      <div className="max-h-56 space-y-0.5 overflow-y-auto">
        {matches.length === 0 && !canCreate ? (
          <p className="px-2 py-1.5 text-[11px] text-zinc-500">
            No options yet.
          </p>
        ) : null}
        {matches.map((option) => {
          const selected = selectedValues.includes(option.label);
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => {
                onPick(option.label);
                if (!multi) onClose();
              }}
              className="flex w-full items-center justify-between rounded-md px-1.5 py-1 hover:bg-zinc-800"
            >
              <Pill label={option.label} color={option.color} />
              {selected ? (
                <Check className="h-3.5 w-3.5 text-zinc-300" />
              ) : null}
            </button>
          );
        })}
        {canCreate ? (
          <button
            type="button"
            onClick={() => {
              onPick(filter.trim());
              if (!multi) onClose();
              setFilter("");
            }}
            className="flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-xs text-zinc-300 hover:bg-zinc-800"
          >
            <Plus className="h-3.5 w-3.5 text-zinc-500" />
            Create &quot;{filter.trim()}&quot;
          </button>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

export function SelectPillCell({
  property,
  value,
  onChange,
}: {
  property: JournalProperty;
  value: string;
  onChange: (next: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const option = findOption(property, value);

  return (
    <div className="w-full">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-8 w-full items-center justify-between rounded px-1 text-left text-xs text-zinc-300 hover:bg-zinc-900/40"
      >
        {value ? (
          <Pill label={value} color={option?.color} />
        ) : (
          <span className="text-zinc-700">{property.name}</span>
        )}
        <ChevronDown
          className={cn(
            "h-3 w-3 text-zinc-600 transition-opacity",
            open ? "opacity-100" : "opacity-0 group-hover/cell:opacity-100",
          )}
        />
      </button>
      {open ? (
        <PillDropdown
          anchorRef={triggerRef}
          property={property}
          selectedValues={value ? [value] : []}
          multi={false}
          onPick={(label) => onChange(label)}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </div>
  );
}

export function MultiSelectPillCell({
  property,
  values,
  onChange,
}: {
  property: JournalProperty;
  values: string[];
  onChange: (next: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const toggle = (label: string) => {
    if (values.includes(label)) {
      onChange(values.filter((v) => v !== label));
    } else {
      onChange([...values, label]);
    }
  };

  return (
    <div className="w-full">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex min-h-8 w-full flex-wrap items-center gap-1 rounded px-1 py-1 text-left text-xs text-zinc-300 hover:bg-zinc-900/40"
      >
        {values.length === 0 ? (
          <span className="text-zinc-700">{property.name}</span>
        ) : (
          values.map((value) => {
            const option = findOption(property, value);
            return (
              <Pill
                key={value}
                label={value}
                color={option?.color}
                onRemove={() => onChange(values.filter((v) => v !== value))}
              />
            );
          })
        )}
      </button>
      {open ? (
        <PillDropdown
          anchorRef={triggerRef}
          property={property}
          selectedValues={values}
          multi
          onPick={toggle}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </div>
  );
}

export { Pill, DEFAULT_CHIP };
