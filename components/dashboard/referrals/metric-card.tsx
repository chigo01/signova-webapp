import type { LucideIcon } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: string;
  description: string;
  Icon: LucideIcon;
}

export function MetricCard({ label, value, description, Icon }: MetricCardProps) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
      <div className="flex items-center gap-2 text-zinc-400">
        <Icon className="h-4 w-4 shrink-0" strokeWidth={1.5} aria-hidden />
        <span className="text-xs font-medium uppercase tracking-wider">
          {label}
        </span>
      </div>
      <p className="mt-3 text-3xl font-bold text-white">{value}</p>
      <p className="mt-2 text-sm text-zinc-500">{description}</p>
    </div>
  );
}
