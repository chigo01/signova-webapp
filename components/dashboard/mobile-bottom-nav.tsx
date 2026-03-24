"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Presentation,
  LineChart,
  PieChart,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { title: "Dashboard", href: "/dashboard", Icon: Presentation },
  { title: "Signal", href: "/dashboard/signals", Icon: LineChart },
  { title: "Stocks", href: "/dashboard/stocks", Icon: PieChart },
  { title: "Journal", href: "/dashboard/journal", Icon: BarChart3 },
] as const;

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-800 bg-black lg:hidden"
      style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      aria-label="Primary"
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-evenly px-2 py-2.5">
        {items.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const { Icon } = item;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 py-0.5 text-[11px] font-medium leading-none tracking-tight transition-colors",
                isActive ? "text-white" : "text-zinc-500"
              )}
            >
              <Icon
                className="h-5 w-5 shrink-0"
                strokeWidth={1.5}
                aria-hidden
              />
              <span
                className={cn(
                  "truncate border-b-2 border-transparent pb-0.5",
                  isActive && "border-white"
                )}
              >
                {item.title}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
