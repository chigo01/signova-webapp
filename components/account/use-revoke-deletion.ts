"use client";

import * as React from "react";
import { useAuthState } from "@/components/auth/auth-provider";
import {
  AccountDeletionApiError,
  revokeAccountDeletion,
} from "@/lib/account-deletion";
import { getAuthUserProfile, setAuthUserProfile } from "@/lib/auth-user";

/**
 * Cancels a scheduled account deletion from anywhere in the dashboard.
 *
 * Clears the cached profile's pending state as well as re-running /auth/check:
 * the settings page paints from that cache before the network call lands, so
 * leaving it stale would flash the banner back for a moment after the undo.
 */
export function useRevokeDeletion(): {
  revoke: () => Promise<void>;
  isRevoking: boolean;
  error: string | null;
} {
  const { refreshAuth } = useAuthState();
  const [isRevoking, setIsRevoking] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const revoke = React.useCallback(async () => {
    setIsRevoking(true);
    setError(null);
    try {
      await revokeAccountDeletion();
      const cached = getAuthUserProfile();
      if (cached) setAuthUserProfile({ ...cached, pendingDeletion: null });
      refreshAuth();
    } catch (err) {
      setError(
        err instanceof AccountDeletionApiError
          ? err.message
          : "Couldn't cancel the deletion. Please try again.",
      );
      setIsRevoking(false);
      return;
    }
    setIsRevoking(false);
  }, [refreshAuth]);

  return { revoke, isRevoking, error };
}
