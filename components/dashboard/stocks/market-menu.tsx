"use client";

import { useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { StockMarket } from "@/lib/markets";

const OPTIONS: { id: StockMarket; label: string }[] = [
  { id: "US", label: "United States" },
  { id: "NGX", label: "Nigeria" },
  { id: "KRX", label: "South Korea" },
];

export function MarketMenu({
  value,
  onChange,
}: {
  value: StockMarket;
  onChange: (market: StockMarket) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = OPTIONS.find((option) => option.id === value) ?? OPTIONS[0];

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          aria-label="Market"
          className="border border-zinc-800 bg-zinc-900 text-white hover:bg-zinc-800"
        >
          {current.label}
          <ChevronDown className="ml-2 h-4 w-4 text-zinc-400" aria-hidden="true" />
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={8}
          className="z-50 w-48 rounded-lg border border-zinc-800 bg-[#171717] p-1 shadow-2xl shadow-black/60 outline-none"
        >
          <div role="menu" aria-label="Market">
            {OPTIONS.map((option) => {
              const selected = option.id === value;
              return (
                <button
                  key={option.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={selected}
                  onClick={() => {
                    onChange(option.id);
                    setOpen(false);
                  }}
                  className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm text-zinc-200 hover:bg-zinc-800"
                >
                  {option.label}
                  {selected ? <Check className="h-4 w-4 text-white" /> : null}
                </button>
              );
            })}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
