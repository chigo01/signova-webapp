import { API_URL } from "@/lib/config";
import { getAuthToken } from "@/lib/cookies";
import type { PendingDeletion } from "@/lib/auth-user";

export class AccountDeletionApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

interface AccountDeletionResponse {
  message?: string;
  pendingDeletion?: PendingDeletion | null;
  graceDays?: number;
  revoked?: boolean;
}

/**
 * Normalizes the `pendingDeletion` field the backend attaches to every auth
 * payload (login, `/auth/check`, profile updates). Returns null both when the
 * account is clean and when the field is missing or malformed — an unreadable
 * value must not be shown as "your account is being deleted".
 */
export function parsePendingDeletion(raw: unknown): PendingDeletion | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const { requestedAt, scheduledFor } = raw as PendingDeletion;
  // Without a date there is nothing to display or count down to.
  if (typeof scheduledFor !== "string" || !scheduledFor) return null;
  return {
    scheduledFor,
    ...(typeof requestedAt === "string" ? { requestedAt } : {}),
  };
}

/** Days remaining before the purge, floored at 0. */
export function daysUntilDeletion(
  pendingDeletion: PendingDeletion,
  now: Date = new Date(),
): number {
  const scheduled = new Date(pendingDeletion.scheduledFor ?? "").getTime();
  if (!Number.isFinite(scheduled)) return 0;
  return Math.max(0, Math.ceil((scheduled - now.getTime()) / 86_400_000));
}

export function formatDeletionDate(
  pendingDeletion: PendingDeletion,
): string {
  const scheduled = new Date(pendingDeletion.scheduledFor ?? "");
  if (Number.isNaN(scheduled.getTime())) return "soon";
  return scheduled.toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

async function accountDeletionRequest(
  path: string,
  body?: Record<string, unknown>,
): Promise<AccountDeletionResponse> {
  const token = getAuthToken();
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify(body ?? {}),
  });

  if (!res.ok) {
    const payload = (await res.json().catch(() => ({}))) as {
      message?: string;
    };
    throw new AccountDeletionApiError(
      payload.message || `Request failed (${res.status})`,
      res.status,
    );
  }

  return res.json();
}

/**
 * Schedules the account for deletion. Nothing is destroyed immediately — the
 * backend holds the account for a grace window during which this can be undone.
 */
export async function requestAccountDeletion(
  reason?: string,
): Promise<{ pendingDeletion: PendingDeletion | null; graceDays?: number }> {
  const data = await accountDeletionRequest("/auth/account/delete", {
    platform: "web",
    ...(reason ? { reason } : {}),
  });
  return {
    pendingDeletion: parsePendingDeletion(data.pendingDeletion),
    graceDays: data.graceDays,
  };
}

/** Cancels a pending deletion. Safe to call when nothing is pending. */
export async function revokeAccountDeletion(): Promise<{ revoked: boolean }> {
  const data = await accountDeletionRequest("/auth/account/delete/revoke");
  return { revoked: data.revoked === true };
}
