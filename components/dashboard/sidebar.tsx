"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

import Logo from "@/assets/icons/logos/Main-icon.svg";
import LayoutDashboard from "@/assets/icons/dashboard-active.svg";
import SignalVault from "@/assets/icons/vault.svg";
import StockOptions from "@/assets/icons/stock.svg";
import Journal from "@/assets/icons/journal.svg";

const sidebarItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Signal vault",
    href: "/dashboard/signals",
    icon: SignalVault,
  },
  {
    title: "Stock options",
    href: "/dashboard/stocks",
    icon: StockOptions,
  },
  {
    title: "Trading journal",
    href: "/dashboard/journal",
    icon: Journal,
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="fixed left-0 top-0 flex h-screen w-64 flex-col overflow-hidden border-r border-zinc-800 bg-black text-zinc-400">
      <div className="flex h-16 shrink-0 items-center px-6">
        <div className="flex items-center gap-2">
          <Image src={Logo} alt="SIGNOVA" width={34} height={28} />
          <span className="text-xl font-bold text-white">
            SIG<span className="text-[#565656]">NOVA</span>
          </span>
        </div>
      </div>

      <div className="flex-1 px-4 py-6">
        <nav className="space-y-2">
          {sidebarItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-zinc-800 text-white"
                    : "hover:bg-zinc-800/50 hover:text-white"
                )}
              >
                <Image
                  src={item.icon}
                  alt={item.title}
                  width={16}
                  height={16}
                  className="h-4 w-4"
                />
                {item.title}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="shrink-0 border-t border-zinc-800 p-4">
        <div className="flex items-center gap-3 rounded-lg bg-zinc-900 p-3">
          <div className="h-10 w-10 rounded-full bg-zinc-700 overflow-hidden">
            {/* Placeholder for avatar */}
            <img src="https://github.com/shadcn.png" alt="User" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-white">
              Favour Ayomide
            </span>
            <span className="text-xs text-zinc-500">Trader</span>
          </div>
        </div>
      </div>
    </div>
  );
}
