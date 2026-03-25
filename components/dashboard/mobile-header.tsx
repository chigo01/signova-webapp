"use client";

import Image from "next/image";
import Link from "next/link";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { getAuthUserProfile } from "@/lib/auth-user";
import Logo from "@/assets/icons/logos/Main-icon.svg";

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function MobileHeader() {
  const [initials, setInitials] = useState("?");

  useEffect(() => {
    const user = getAuthUserProfile();
    if (user?.name) setInitials(initialsFromName(user.name));
    else if (user?.email)
      setInitials((user.email.split("@")[0] || "?").slice(0, 2).toUpperCase());
  }, []);

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between border-b border-zinc-900 bg-black/90 px-4 py-3 backdrop-blur-md lg:hidden">
      <Link href="/dashboard" className="flex items-center gap-2 min-w-0">
        <Image src={Logo} alt="" width={28} height={24} className="shrink-0" />
        <span className="truncate text-lg font-bold text-white">
          SIG<span className="text-[#565656]">NOVA</span>
        </span>
      </Link>
      <div className="flex shrink-0 items-center gap-3">
        <button
          type="button"
          className="rounded-full p-2 text-white hover:bg-zinc-900"
          aria-label="Search"
        >
          <Search className="h-5 w-5" />
        </button>
        <div
          className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-700 text-xs font-medium text-white"
          aria-hidden
        >
          {initials}
        </div>
      </div>
    </header>
  );
}
