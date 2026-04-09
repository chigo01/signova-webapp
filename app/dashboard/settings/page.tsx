"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuthUserProfile } from "@/lib/auth-user";
import { logout as performLogout } from "@/lib/logout";
import GoogleIcon from "@/assets/icons/Social/google.svg";
import AppleIcon from "@/assets/icons/Social/apple.svg";

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const roleOptions = [
  "Trader",
  "Active Options Trader.",
  "Swing Trader",
  "Analyst",
  "Business developer",
  "Exchange rate analyst",
  "Trade Specialist",
  "Trade Specialist",
  "Exchange rate analyst",
] as const;

export default function UserSettingsPage() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [tradeReversalEnabled, setTradeReversalEnabled] = useState(true);

  const [name, setName] = useState("User");
  const [username, setUsername] = useState("user");
  const [email, setEmail] = useState("user@email.com");

  useEffect(() => {
    const user = getAuthUserProfile();
    if (!user) return;

    if (user.name) {
      setName(user.name);
      setUsername(user.name.replace(/\s+/g, "").toLowerCase());
    }

    if (user.email) {
      setEmail(user.email);
      if (!user.name) setUsername(user.email.split("@")[0] || "user");
    }
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

  const avatarInitials = useMemo(() => initialsFromName(name), [name]);

  return (
    <main className="flex-1 overflow-y-auto overflow-x-hidden bg-black">
      <div className="mx-auto w-full max-w-[1600px] px-4 pb-6 pt-4 sm:px-6 sm:pb-8 sm:pt-6 lg:px-8">
        <header className="mb-5 flex items-center justify-between sm:mb-6">
          <h1 className="text-2xl font-semibold text-white sm:text-[32px]">Settings</h1>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-100 transition-colors hover:bg-zinc-800"
            >
              Edit profile
            </button>
            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-100 transition-colors hover:bg-zinc-800 disabled:opacity-50"
            >
              {isLoggingOut ? "Logging out..." : "Log out"}
            </button>
          </div>
        </header>

        <section className="rounded-xl border border-zinc-800 bg-[#090909] p-4 sm:p-5">
          <h2 className="mb-3 text-base font-medium text-white">Profile settings</h2>
          <div className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-black/40 p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-sm font-medium text-white">
              {avatarInitials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-zinc-100">{name}</p>
              <p className="truncate text-xs text-zinc-500">Trader.</p>
            </div>
          </div>
        </section>

        <section className="mt-4 rounded-xl border border-zinc-800 bg-[#090909] p-4 sm:p-5">
          <h2 className="mb-4 text-base font-medium text-white">Account settings</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs text-zinc-500">Username</label>
              <input
                value={username}
                readOnly
                className="h-10 w-full rounded-md border border-zinc-800 bg-black/50 px-3 text-sm text-zinc-200 outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-zinc-500">Role or Title</label>
              <div className="flex flex-wrap gap-2 rounded-md border border-zinc-800 bg-black/50 p-2.5">
                {roleOptions.map((role, index) => (
                  <button
                    key={`${role}-${index}`}
                    type="button"
                    className={
                      role === "Trader"
                        ? "rounded-md border border-zinc-600 bg-zinc-800 px-2.5 py-1 text-xs text-zinc-100"
                        : "rounded-md border border-zinc-800 bg-zinc-900/60 px-2.5 py-1 text-xs text-zinc-500"
                    }
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-zinc-500">Email address</label>
              <input
                value={email}
                readOnly
                className="h-10 w-full rounded-md border border-zinc-800 bg-black/50 px-3 text-sm text-zinc-200 outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-zinc-500">Password</label>
              <div className="relative">
                <input
                  value={showPassword ? "212123233433" : "************"}
                  readOnly
                  className="h-10 w-full rounded-md border border-zinc-800 bg-black/50 px-3 pr-10 text-sm text-zinc-200 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-zinc-500 hover:text-zinc-300"
                  aria-label="Toggle password visibility"
                >
                  <EyeIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between rounded-md border border-zinc-800 bg-black/50 px-3 py-2.5">
            <p className="text-sm text-zinc-200">
              Trade reversal feature <span className="text-zinc-500">(Default)</span>
            </p>
            <button
              type="button"
              onClick={() => setTradeReversalEnabled((v) => !v)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                tradeReversalEnabled ? "bg-zinc-200" : "bg-zinc-700"
              }`}
              aria-pressed={tradeReversalEnabled}
              aria-label="Toggle trade reversal feature"
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-black transition-transform ${
                  tradeReversalEnabled ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
        </section>

        <section className="mt-4 rounded-xl border border-zinc-800 bg-[#090909] p-4 sm:p-5">
          <h2 className="mb-3 text-base font-medium text-white">Integrators</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:max-w-md">
            <button
              type="button"
              className="flex h-11 items-center justify-center gap-2 rounded-md border border-zinc-800 bg-zinc-900/60 text-sm text-zinc-100 transition-colors hover:bg-zinc-800"
            >
              <Image src={GoogleIcon} alt="" width={18} height={18} />
              Google
            </button>
            <button
              type="button"
              className="flex h-11 items-center justify-center gap-2 rounded-md border border-zinc-800 bg-zinc-900/60 text-sm text-zinc-100 transition-colors hover:bg-zinc-800"
            >
              <Image src={AppleIcon} alt="" width={18} height={18} />
              Apple
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
