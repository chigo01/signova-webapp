"use client";

import * as React from "react";
import { X } from "lucide-react";
import { AuthForm } from "@/components/auth-form";

export interface AuthModalProps {
  open: boolean;
  /** Optional headline shown above the form, e.g. "Log in to view live signals". */
  reason?: string;
  onClose: () => void;
}

export function AuthModal({ open, reason, onClose }: AuthModalProps) {
  // Lock body scroll while the modal is open.
  React.useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Close on Escape.
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleSuccess = () => {
    onClose();
    // Re-run the auth check and reveal gated content in place.
    window.location.reload();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        // Click outside the panel closes the modal.
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-zinc-800 bg-[#0a0a0a] py-8 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 z-10 rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        {reason && (
          <p className="px-10 pb-4 text-sm font-medium text-emerald-300">
            {reason}
          </p>
        )}

        <AuthForm type="login" onSuccess={handleSuccess} />
      </div>
    </div>
  );
}
