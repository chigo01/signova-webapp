"use client";

import * as Popover from "@radix-ui/react-popover";
import { AlertTriangle, Clock3, Info } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export interface TradeReleaseInfoProps {
  releasedAt: string;
}

function parseReleasedAt(releasedAt: string): number | null {
  if (!releasedAt.trim()) return null;
  const releasedAtMs = new Date(releasedAt).getTime();
  return Number.isNaN(releasedAtMs) ? null : releasedAtMs;
}

export function formatElapsedDuration(
  releasedAt: string,
  nowMs: number = Date.now(),
): string | null {
  const releasedAtMs = parseReleasedAt(releasedAt);
  if (releasedAtMs === null) return null;

  const totalSeconds = Math.max(
    0,
    Math.floor((nowMs - releasedAtMs) / 1_000),
  );
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  const clock = [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");

  return days > 0 ? `${days}d ${clock}` : clock;
}

export function TradeReleaseInfo({ releasedAt }: TradeReleaseInfoProps) {
  const [open, setOpen] = useState(false);
  const [nowMs, setNowMs] = useState<number | null>(null);
  const releasedAtMs = useMemo(() => parseReleasedAt(releasedAt), [releasedAt]);

  useEffect(() => {
    if (!open) return;

    const intervalId = window.setInterval(() => setNowMs(Date.now()), 1_000);
    return () => window.clearInterval(intervalId);
  }, [open]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) setNowMs(Date.now());
    setOpen(nextOpen);
  };

  const elapsed =
    nowMs === null ? null : formatElapsedDuration(releasedAt, nowMs);
  const releasedAtLabel =
    releasedAtMs === null
      ? null
      : new Intl.DateTimeFormat(undefined, {
          dateStyle: "medium",
          timeStyle: "medium",
        }).format(releasedAtMs);

  return (
    <Popover.Root open={open} onOpenChange={handleOpenChange}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70"
          aria-label="View trade release information"
        >
          <Info className="h-4 w-4" aria-hidden="true" />
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="end"
          side="bottom"
          sideOffset={8}
          collisionPadding={16}
          className="z-50 w-[min(18rem,calc(100vw-2rem))] rounded-xl border border-zinc-700 bg-zinc-950 p-4 text-left shadow-2xl shadow-black/60 outline-none data-[state=closed]:animate-out data-[state=open]:animate-in"
          aria-label="Trade release information"
        >
          <div className="flex items-center gap-2 text-zinc-300">
            <Clock3 className="h-4 w-4 text-emerald-400" aria-hidden="true" />
            <p className="text-xs font-semibold uppercase tracking-wide">
              Time since release
            </p>
          </div>

          {elapsed === null ? (
            <p className="mt-3 text-sm font-medium text-zinc-300">
              Release time unavailable
            </p>
          ) : (
            <>
              <p
                className="mt-2 font-mono text-2xl font-semibold tabular-nums text-white"
                aria-live="off"
              >
                {elapsed}
              </p>
              <p className="mt-1 text-[11px] text-zinc-500">
                Released {releasedAtLabel}
              </p>
            </>
          )}

          <div className="mt-4 flex gap-2 rounded-lg border border-amber-400/20 bg-amber-400/10 p-3">
            <AlertTriangle
              className="mt-0.5 h-4 w-4 shrink-0 text-amber-400"
              aria-hidden="true"
            />
            <p className="text-xs leading-relaxed text-amber-100/80">
              The entry price may have changed since this trade was released.
              Confirm the current market price before entering.
            </p>
          </div>

          <Popover.Arrow className="fill-zinc-700" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
