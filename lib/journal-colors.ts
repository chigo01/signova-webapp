/**
 * Shared option-color → Tailwind class mapping for journal select /
 * multi-select pills and calendar chips. Centralised because Tailwind
 * can't see dynamic class names through string concatenation — every
 * color name we use must appear literally somewhere in the source.
 */
export const CHIP_CLASS_BY_COLOR: Record<string, string> = {
  emerald: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  rose: "bg-rose-500/20 text-rose-300 border-rose-500/40",
  amber: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  cyan: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40",
  zinc: "bg-zinc-700/30 text-zinc-300 border-zinc-700/50",
};

export const DEFAULT_CHIP =
  "bg-zinc-800/60 text-zinc-300 border-zinc-700/60";

export function chipClassForColor(color: string | undefined): string {
  if (!color) return DEFAULT_CHIP;
  return CHIP_CLASS_BY_COLOR[color] ?? DEFAULT_CHIP;
}
