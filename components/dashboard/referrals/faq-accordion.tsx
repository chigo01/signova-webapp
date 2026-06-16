"use client";

import { useState } from "react";
import { Plus, Minus } from "lucide-react";

export interface FaqItem {
  question: string;
  answer: string;
}

interface FaqAccordionProps {
  items: FaqItem[];
}

export function FaqAccordion({ items }: FaqAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="space-y-3">
      {items.map((item, index) => {
        const isOpen = openIndex === index;
        return (
          <div
            key={item.question}
            className="rounded-xl border border-zinc-800 bg-zinc-950/60"
          >
            <button
              type="button"
              onClick={() => setOpenIndex(isOpen ? null : index)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
            >
              <span className="text-sm font-medium text-white">
                {item.question}
              </span>
              {isOpen ? (
                <Minus className="h-4 w-4 shrink-0 text-zinc-400" aria-hidden />
              ) : (
                <Plus className="h-4 w-4 shrink-0 text-zinc-400" aria-hidden />
              )}
            </button>
            {isOpen && (
              <p className="px-5 pb-4 text-sm text-zinc-400">{item.answer}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
