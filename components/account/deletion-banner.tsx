"use client";

import { AlertTriangle } from "lucide-react";
import { useAuthState } from "@/components/auth/auth-provider";
import { useRevokeDeletion } from "@/components/account/use-revoke-deletion";
import { daysUntilDeletion, formatDeletionDate } from "@/lib/account-deletion";

/**
 * Persistent notice shown on every dashboard route while the account is inside
 * its deletion grace window. Deliberately not dismissible: this is the user's
 * only ambient reminder that their data has a countdown on it.
 */
export function DeletionBanner() {
  const { pendingDeletion } = useAuthState();
  const { revoke, isRevoking, error } = useRevokeDeletion();

  if (!pendingDeletion) return null;

  const daysLeft = daysUntilDeletion(pendingDeletion);
  const date = formatDeletionDate(pendingDeletion);

  return (
    <div
      role="status"
      className="border-b border-red-900/60 bg-red-950/40 px-4 py-3 sm:px-6"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2.5">
          <AlertTriangle
            className="mt-0.5 h-4 w-4 shrink-0 text-red-400"
            aria-hidden="true"
          />
          <div>
            <p className="text-sm text-red-100">
              Your account is scheduled for deletion on{" "}
              <span className="font-medium">{date}</span>
              {daysLeft > 0 && (
                <span className="text-red-300">
                  {" "}
                  &mdash; {daysLeft} {daysLeft === 1 ? "day" : "days"} left
                </span>
              )}
              .
            </p>
            <p className="mt-0.5 text-xs text-red-300/80">
              Nothing has been deleted yet. Cancel any time before then.
            </p>
            {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
          </div>
        </div>

        <button
          type="button"
          onClick={() => void revoke()}
          disabled={isRevoking}
          className="shrink-0 self-start rounded-md bg-white px-3.5 py-2 text-sm font-medium text-black transition-colors hover:bg-white/90 disabled:opacity-50 sm:self-auto"
        >
          {isRevoking ? "Cancelling…" : "Keep my account"}
        </button>
      </div>
    </div>
  );
}
