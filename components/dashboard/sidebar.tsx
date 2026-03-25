"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { getAuthUserProfile } from "@/lib/auth-user";
import { logout as performLogout } from "@/lib/logout";

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

function LogOutIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" x2="9" y1="12" y2="12" />
    </svg>
  );
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [userName, setUserName] = useState("User");
  const [userEmail, setUserEmail] = useState("Signed in");
  const [hasStoredProfile, setHasStoredProfile] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    const user = getAuthUserProfile();
    const hasProfile = Boolean(user?.name || user?.email);
    setHasStoredProfile(hasProfile);
    if (user?.name) {
      setUserName(user.name);
    } else if (user?.email) {
      setUserName(user.email.split("@")[0] || "User");
    }
    if (user?.email) setUserEmail(user.email);
  }, []);

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await performLogout();
      router.replace("/login");
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <div className="fixed left-0 top-0 hidden h-screen w-64 flex-col overflow-hidden border-r border-zinc-800 bg-black text-zinc-400 lg:flex">
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
                  // Figma: horizontal row, fill width, ~38px hug, 8px radius, 10px padding, 8px gap;
                  // Golos Text 500 / 14px / line-height 100% / -1% tracking; inactive #494949
                  "flex w-full min-h-[38px] items-center gap-2 rounded-[8px] p-[10px] font-[family-name:var(--font-golos)] text-[14px] font-medium leading-none tracking-[-0.01em] transition-colors",
                  isActive
                    ? "border border-[#1D1D1D] bg-[#0E0E0E] text-white"
                    : "border border-transparent text-[#494949] hover:bg-zinc-800/50 hover:text-white"
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
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-sm font-medium text-white">
            {hasStoredProfile ? initialsFromName(userName) : "?"}
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-medium text-white">
              {userName}
            </span>
            <span className="truncate text-xs text-zinc-500">{userEmail}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-400 transition-colors hover:border-zinc-700 hover:bg-zinc-900 hover:text-white disabled:opacity-50"
        >
          <LogOutIcon className="h-4 w-4 shrink-0" />
          {isLoggingOut ? "Signing out…" : "Log out"}
        </button>
      </div>
    </div>
  );
}
