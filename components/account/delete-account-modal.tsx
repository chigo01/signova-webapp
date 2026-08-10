"use client";

import * as React from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AccountDeletionApiError,
  requestAccountDeletion,
} from "@/lib/account-deletion";
import type { PendingDeletion } from "@/lib/auth-user";

/** Typed literally by the user before the destructive action unlocks. */
const CONFIRM_PHRASE = "DELETE";
const REASON_MAX = 500;

export interface DeleteAccountModalProps {
  open: boolean;
  onClose: () => void;
  /** Called once the backend has scheduled the deletion. */
  onScheduled: (pendingDeletion: PendingDeletion | null) => void;
}

export function DeleteAccountModal({
  open,
  onClose,
  onScheduled,
}: DeleteAccountModalProps) {
  const [confirmText, setConfirmText] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Start from a clean slate each time — a half-typed confirmation left over
  // from a cancelled attempt must not carry into the next one.
  React.useEffect(() => {
    if (!open) return;
    setConfirmText("");
    setReason("");
    setError(null);
    setIsSubmitting(false);
  }, [open]);

  // Lock body scroll while the modal is open.
  React.useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Close on Escape, unless a request is already in flight.
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSubmitting) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, isSubmitting]);

  if (!open) return null;

  const canSubmit = confirmText.trim().toUpperCase() === CONFIRM_PHRASE;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const { pendingDeletion } = await requestAccountDeletion(
        reason.trim() || undefined,
      );
      onScheduled(pendingDeletion);
      onClose();
    } catch (err) {
      setError(
        err instanceof AccountDeletionApiError
          ? err.message
          : "Couldn't schedule the deletion. Please try again.",
      );
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-account-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-zinc-800 bg-[#0a0a0a] p-6 shadow-2xl sm:p-8">
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          aria-label="Close"
          className="absolute right-4 top-4 z-10 rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white disabled:opacity-50"
        >
          <X className="h-4 w-4" />
        </button>

        <h2
          id="delete-account-title"
          className="pr-8 text-base font-medium text-white"
        >
          Delete your account
        </h2>

        <p className="mt-3 text-sm leading-relaxed text-zinc-400">
          Your account will be scheduled for deletion. Nothing is removed right
          away &mdash; you have 30 days to change your mind.
        </p>

        <ul className="mt-4 space-y-2 rounded-md border border-zinc-800 bg-black/50 p-3 text-xs leading-relaxed text-zinc-400">
          <li>
            <span className="text-zinc-200">Until then</span>, your account works
            as normal. Log in and choose &ldquo;Keep my account&rdquo; to cancel.
          </li>
          <li>
            <span className="text-zinc-200">After 30 days</span>, your profile,
            journal, saved chart layouts, watchlists, and signal history are
            permanently erased. This cannot be undone.
          </li>
          <li>
            Any remaining Pro time is forfeited and is not refunded.
          </li>
        </ul>

        <form onSubmit={handleSubmit} className="mt-5">
          <label
            htmlFor="delete-account-reason"
            className="mb-1.5 block text-xs text-zinc-500"
          >
            Why are you leaving? (optional)
          </label>
          <textarea
            id="delete-account-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value.slice(0, REASON_MAX))}
            maxLength={REASON_MAX}
            rows={3}
            disabled={isSubmitting}
            className="w-full resize-none rounded-md border border-zinc-800 bg-black/50 px-3 py-2 text-sm text-zinc-200 outline-none placeholder:text-zinc-600 focus:border-zinc-700 disabled:opacity-50"
            placeholder="This helps us improve Signova."
          />

          <label
            htmlFor="delete-account-confirm"
            className="mb-1.5 mt-4 block text-xs text-zinc-500"
          >
            Type <span className="text-zinc-300">{CONFIRM_PHRASE}</span> to
            confirm
          </label>
          <input
            id="delete-account-confirm"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            autoComplete="off"
            disabled={isSubmitting}
            className="h-10 w-full rounded-md border border-zinc-800 bg-black/50 px-3 text-sm text-zinc-200 outline-none placeholder:text-zinc-600 focus:border-zinc-700 disabled:opacity-50"
            placeholder={CONFIRM_PHRASE}
          />

          {error && <p className="mt-2 text-xs text-red-400">{error}</p>}

          <div className="mt-5 flex flex-col gap-2 sm:flex-row-reverse">
            <Button
              type="submit"
              variant="destructive"
              disabled={!canSubmit || isSubmitting}
              className="w-full sm:w-auto"
            >
              {isSubmitting ? "Scheduling…" : "Delete my account"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isSubmitting}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
