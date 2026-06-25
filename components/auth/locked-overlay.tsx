"use client";

import * as React from "react";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthState } from "@/components/auth/auth-provider";

export interface LockedOverlayProps {
  children: React.ReactNode;
  /** Headline shown on the overlay and passed to the auth modal. */
  message?: string;
  /** Button label. */
  cta?: string;
  className?: string;
}

/**
 * Renders `children` blurred and non-interactive with a "log in to unlock"
 * overlay when the visitor is a guest. Authenticated users see the children
 * untouched.
 */
export function LockedOverlay({
  children,
  message = "Log in to find out",
  cta = "Sign up free",
  className,
}: LockedOverlayProps) {
  const { isGuest, promptAuth } = useAuthState();

  if (!isGuest) {
    return <>{children}</>;
  }

  return (
    <div className={cn("relative h-full", className)}>
      <div
        aria-hidden
        className="pointer-events-none select-none blur-sm"
      >
        {children}
      </div>

      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-lg bg-black/40 p-4 text-center backdrop-blur-[2px]">
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-700 bg-black/60">
          <Lock className="h-4 w-4 text-zinc-300" />
        </div>
        <p className="max-w-[220px] text-sm font-medium text-white">{message}</p>
        <button
          type="button"
          onClick={() => promptAuth(message)}
          className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-black transition-colors hover:bg-zinc-200"
        >
          {cta}
        </button>
      </div>
    </div>
  );
}
