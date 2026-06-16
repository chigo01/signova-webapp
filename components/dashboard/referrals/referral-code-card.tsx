"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Link2, TriangleAlert } from "lucide-react";

interface ReferralCodeCardProps {
  code: string;
  /** Server-generated fallback; overridden client-side with the live origin. */
  shareUrl: string;
}

export function ReferralCodeCard({
  code,
  shareUrl: fallbackShareUrl,
}: ReferralCodeCardProps) {
  const [copied, setCopied] = useState<"code" | "link" | null>(null);

  // Build the share link from the web app's own origin so it always points at
  // the real domain (e.g. https://web.signova.app), independent of the server's
  // FRONTEND_URL env. Falls back to the server value before hydration.
  const [shareUrl, setShareUrl] = useState(fallbackShareUrl);
  useEffect(() => {
    setShareUrl(`${window.location.origin}/register?ref=${code}`);
  }, [code]);

  async function copy(value: string, which: "code" | "link") {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(which);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // Clipboard can be unavailable (insecure context); fail quietly.
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Referral System</h2>
        <button
          type="button"
          onClick={() => copy(shareUrl, "link")}
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-300 transition-colors hover:border-zinc-700 hover:text-white"
        >
          <Link2 className="h-4 w-4" aria-hidden />
          {copied === "link" ? "Link copied" : "Share link"}
        </button>
      </div>

      <div className="mt-5 rounded-xl border border-zinc-800 bg-black/40 p-4">
        <p className="text-xs font-medium text-zinc-500">Unique Code</p>
        <div className="mt-1 flex items-center justify-between gap-3">
          <span className="font-mono text-2xl font-semibold tracking-wide text-white">
            {code}
          </span>
          <button
            type="button"
            onClick={() => copy(code, "code")}
            aria-label="Copy referral code"
            className="shrink-0 rounded-md p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
          >
            {copied === "code" ? (
              <Check className="h-5 w-5 text-emerald-400" aria-hidden />
            ) : (
              <Copy className="h-5 w-5" aria-hidden />
            )}
          </button>
        </div>
      </div>

      <p className="mt-4 text-sm text-zinc-400">
        Share your code with your audience. Every signup and subscription
        through this code earns you recurring revenue.
      </p>

      <div className="mt-4 flex items-start gap-2 rounded-lg border border-zinc-800 bg-zinc-900/40 p-3 text-sm text-zinc-500">
        <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-zinc-600" aria-hidden />
        <span>
          The more your audience subscribes, the more you earn, every billing
          cycle.
        </span>
      </div>
    </div>
  );
}
