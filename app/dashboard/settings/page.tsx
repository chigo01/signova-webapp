"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AuthUserProfile,
  getAuthUserProfile,
  setAuthUserProfile,
} from "@/lib/auth-user";
import { logout as performLogout } from "@/lib/logout";
import { API_URL } from "@/lib/config";
import { getAuthHeaders } from "@/lib/cookies";
import { PROFILE_ROLES } from "@/lib/profile";
import { EditProfileModal } from "@/components/dashboard/edit-profile-modal";
import { getPlanBalance, type SubscriptionPlan } from "@/lib/payments";

// Mirrors the backend default for tradeReversalEnabled (user.model.ts).
const TRADE_REVERSAL_DEFAULT = true;

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function deriveUsername(profile: AuthUserProfile): string {
  if (profile.username) return profile.username;
  if (profile.name) return profile.name.replace(/\s+/g, "").toLowerCase();
  if (profile.email) return profile.email.split("@")[0] || "";
  return "";
}

export default function UserSettingsPage() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [profile, setProfile] = useState<AuthUserProfile>({});
  const [tradeReversalEnabled, setTradeReversalEnabled] = useState(true);
  const [toggleError, setToggleError] = useState<string | null>(null);
  const [currentPlan, setCurrentPlan] = useState<SubscriptionPlan>("free");
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    const cached = getAuthUserProfile();
    if (cached) {
      setProfile((prev) => ({ ...prev, ...cached }));
      if (typeof cached.tradeReversalEnabled === "boolean") {
        setTradeReversalEnabled(cached.tradeReversalEnabled);
      }
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_URL}/auth/check`, {
          headers: getAuthHeaders(),
        });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled || !data?.user) return;

        const merged: AuthUserProfile = {
          email: data.user.email,
          name: data.user.name,
          username: data.user.username,
          role: data.user.role,
          avatarDataUrl: data.user.avatarDataUrl,
          tradeReversalEnabled: data.user.tradeReversalEnabled,
        };

        setProfile((prev) => ({ ...prev, ...merged }));
        if (typeof merged.tradeReversalEnabled === "boolean") {
          setTradeReversalEnabled(merged.tradeReversalEnabled);
        }
        setAuthUserProfile(merged);
      } catch (err) {
        console.error("Failed to load profile", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const balance = await getPlanBalance({ signal: controller.signal });
        if (!controller.signal.aborted) setCurrentPlan(balance.plan);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          console.error("Failed to load plan balance", err);
        }
      }
    })();
    return () => controller.abort();
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

  async function handleToggleTradeReversal() {
    const next = !tradeReversalEnabled;
    setTradeReversalEnabled(next);
    setToggleError(null);

    try {
      const res = await fetch(`${API_URL}/auth/profile`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ tradeReversalEnabled: next }),
      });

      if (!res.ok) {
        throw new Error("Failed to update preference");
      }

      const data = await res.json();
      if (data?.user) {
        setProfile((prev) => ({ ...prev, ...data.user }));
        setAuthUserProfile(data.user);
      }
    } catch (err) {
      console.error(err);
      if (isMounted.current) {
        setTradeReversalEnabled(!next);
        setToggleError("Couldn't save that change. Please try again.");
      }
    }
  }

  const displayName = profile.name || "";
  const displayEmail = profile.email || "";
  const displayUsername = deriveUsername(profile);
  const displayRole = profile.role || "";
  const avatarInitials = useMemo(
    () => initialsFromName(displayName),
    [displayName]
  );

  return (
    <main className="flex-1 overflow-y-auto overflow-x-hidden bg-black">
      <div className="mx-auto w-full max-w-[1600px] px-4 pb-6 pt-4 sm:px-6 sm:pb-8 sm:pt-6 lg:px-8">
        <header className="mb-5 flex items-center justify-between sm:mb-6">
          <h1 className="text-2xl font-semibold text-white sm:text-[32px]">Settings</h1>
          <div className="flex items-center gap-2">
            {/* TODO: re-enable when payment plans return */}
            {/*
            <button
              type="button"
              onClick={() => router.push("/dashboard/settings/pricing")}
              className={
                currentPlan === "free"
                  ? "rounded-md bg-emerald-400 px-3 py-1.5 text-sm font-medium text-black transition-colors hover:bg-emerald-300"
                  : "rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-100 transition-colors hover:bg-zinc-800"
              }
            >
              {currentPlan === "free" ? "Upgrade your plan" : "Manage plan"}
            </button>
            */}
            <button
              type="button"
              onClick={() => setIsEditOpen(true)}
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
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-zinc-700 text-sm font-medium text-white">
              {profile.avatarDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatarDataUrl}
                  alt={displayName}
                  className="h-full w-full object-cover"
                />
              ) : (
                avatarInitials
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-zinc-100">{displayName || "—"}</p>
              <p className="truncate text-xs text-zinc-500">{displayRole || "—"}</p>
            </div>
          </div>
        </section>

        <section className="mt-4 rounded-xl border border-zinc-800 bg-[#090909] p-4 sm:p-5">
          <h2 className="mb-4 text-base font-medium text-white">Account settings</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs text-zinc-500">Username</label>
              <input
                value={displayUsername}
                readOnly
                className="h-10 w-full rounded-md border border-zinc-800 bg-black/50 px-3 text-sm text-zinc-200 outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-zinc-500">Role or Title</label>
              <div className="flex flex-wrap gap-2 rounded-md border border-zinc-800 bg-black/50 p-2.5">
                {PROFILE_ROLES.map((option) => (
                  <span
                    key={option}
                    className={
                      option === displayRole
                        ? "rounded-md border border-zinc-600 bg-zinc-800 px-2.5 py-1 text-xs text-zinc-100"
                        : "rounded-md border border-zinc-800 bg-zinc-900/60 px-2.5 py-1 text-xs text-zinc-500"
                    }
                  >
                    {option}
                  </span>
                ))}
              </div>
            </div>
            <div className="lg:col-span-2">
              <label className="mb-1.5 block text-xs text-zinc-500">Email address</label>
              <input
                value={displayEmail}
                readOnly
                className="h-10 w-full rounded-md border border-zinc-800 bg-black/50 px-3 text-sm text-zinc-200 outline-none"
              />
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between rounded-md border border-zinc-800 bg-black/50 px-3 py-2.5">
            <p className="text-sm text-zinc-200">
              Trade reversal feature{" "}
              {tradeReversalEnabled === TRADE_REVERSAL_DEFAULT && (
                <span className="text-zinc-500">(Default)</span>
              )}
            </p>
            <button
              type="button"
              onClick={handleToggleTradeReversal}
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
          {toggleError && (
            <p className="mt-2 text-xs text-red-400">{toggleError}</p>
          )}
        </section>
      </div>

      <EditProfileModal
        open={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        initial={profile}
        onSaved={(updated) => {
          setProfile((prev) => ({ ...prev, ...updated }));
          if (typeof updated.tradeReversalEnabled === "boolean") {
            setTradeReversalEnabled(updated.tradeReversalEnabled);
          }
        }}
      />
    </main>
  );
}
