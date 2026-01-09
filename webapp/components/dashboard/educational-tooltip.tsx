"use client";

import { Info } from "lucide-react";
import * as React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function EducationalTooltip({
  term,
  definition,
}: {
  term: string;
  definition: string;
}) {
  return (
    <div className="group relative inline-flex items-center gap-1 cursor-help">
      <span className="border-b border-dotted border-zinc-400 font-medium">
        {term}
      </span>
      <Info className="h-3 w-3 text-primary" />
      <div className="absolute bottom-full left-1/2 mb-2 w-48 -translate-x-1/2 scale-0 rounded-lg border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md transition-all group-hover:scale-100 z-50">
        {definition}
        <div className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 border-r border-b border-border bg-popover"></div>
      </div>
    </div>
  );
}
