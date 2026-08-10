"use client";

import * as React from "react";
import { getAuthToken, removeAuthToken } from "@/lib/cookies";
import { API_URL } from "@/lib/config";
import { AuthModal } from "@/components/auth/auth-modal";
import { parsePendingDeletion } from "@/lib/account-deletion";
import type { PendingDeletion } from "@/lib/auth-user";

interface AuthState {
  /** True once the token has been validated against /auth/check. */
  isAuthenticated: boolean;
  /** True when the visitor is browsing without a valid session. */
  isGuest: boolean;
  /** True while the initial auth check is in flight. */
  isLoading: boolean;
  /**
   * Non-null while the account is scheduled for deletion. The account still
   * works normally during this window; it can be undone until the date passes.
   */
  pendingDeletion: PendingDeletion | null;
  /** Re-runs /auth/check, e.g. after cancelling a scheduled deletion. */
  refreshAuth: () => void;
  /** Open the login/signup modal. `reason` is shown as the modal headline. */
  promptAuth: (reason?: string) => void;
  /**
   * Returns a handler that runs `fn` when authenticated, otherwise opens the
   * auth modal. Use to gate "payoff" actions (play signal, open stock detail,
   * write a journal entry) for guests.
   */
  requireAuth: <Args extends unknown[]>(
    fn: (...args: Args) => void,
    reason?: string,
  ) => (...args: Args) => void;
}

const AuthContext = React.createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [modalReason, setModalReason] = React.useState<string | undefined>();
  const [pendingDeletion, setPendingDeletion] =
    React.useState<PendingDeletion | null>(null);
  // Lets refreshAuth re-trigger the checker that lives inside the effect below.
  const recheckRef = React.useRef<(() => void) | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    let retryTimer: number | undefined;
    let activeRequest: AbortController | undefined;

    function scheduleRetry() {
      if (cancelled || retryTimer !== undefined) return;
      retryTimer = window.setTimeout(() => {
        retryTimer = undefined;
        void checkAuth();
      }, 5_000);
    }

    async function checkAuth() {
      const token = getAuthToken();

      if (!token) {
        if (!cancelled) {
          setIsAuthenticated(false);
          setIsLoading(false);
        }
        return;
      }

      activeRequest?.abort();
      const controller = new AbortController();
      activeRequest = controller;

      try {
        const res = await fetch(`${API_URL}/auth/check`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });

        if (cancelled || controller.signal.aborted) return;

        if (res.ok) {
          setIsAuthenticated(true);
          // The body carries the account's deletion state. A malformed or
          // missing payload must not clear a banner the user needs to see, so
          // only a successfully parsed response updates it.
          try {
            const data = (await res.json()) as {
              user?: { pendingDeletion?: unknown };
            };
            setPendingDeletion(parsePendingDeletion(data?.user?.pendingDeletion));
          } catch {
            // Session is valid regardless; leave the deletion state as-is.
          }
        } else if (res.status === 401) {
          removeAuthToken();
          setIsAuthenticated(false);
          setPendingDeletion(null);
        } else {
          // The token is still present and the server did not reject it. Keep
          // the local session while a temporary API/database failure recovers.
          setIsAuthenticated(true);
          scheduleRetry();
        }
      } catch {
        if (cancelled || controller.signal.aborted) return;

        // Network and CORS failures say nothing about JWT validity. Preserve
        // the session and retry instead of turning the user into a guest.
        setIsAuthenticated(true);
        scheduleRetry();
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    const retryNow = () => {
      if (retryTimer !== undefined) {
        window.clearTimeout(retryTimer);
        retryTimer = undefined;
      }
      void checkAuth();
    };

    const retryWhenVisible = () => {
      if (document.visibilityState === "visible") retryNow();
    };

    recheckRef.current = retryNow;
    void checkAuth();
    window.addEventListener("online", retryNow);
    document.addEventListener("visibilitychange", retryWhenVisible);
    return () => {
      cancelled = true;
      recheckRef.current = null;
      activeRequest?.abort();
      if (retryTimer !== undefined) window.clearTimeout(retryTimer);
      window.removeEventListener("online", retryNow);
      document.removeEventListener("visibilitychange", retryWhenVisible);
    };
  }, []);

  const refreshAuth = React.useCallback(() => {
    recheckRef.current?.();
  }, []);

  const promptAuth = React.useCallback((reason?: string) => {
    setModalReason(reason);
    setModalOpen(true);
  }, []);

  const requireAuth = React.useCallback(
    <Args extends unknown[]>(
      fn: (...args: Args) => void,
      reason?: string,
    ) =>
      (...args: Args) => {
        if (isAuthenticated) {
          fn(...args);
        } else {
          promptAuth(reason);
        }
      },
    [isAuthenticated, promptAuth],
  );

  const value = React.useMemo<AuthState>(
    () => ({
      isAuthenticated,
      isGuest: !isLoading && !isAuthenticated,
      isLoading,
      pendingDeletion,
      refreshAuth,
      promptAuth,
      requireAuth,
    }),
    [
      isAuthenticated,
      isLoading,
      pendingDeletion,
      refreshAuth,
      promptAuth,
      requireAuth,
    ],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      <AuthModal
        open={modalOpen}
        reason={modalReason}
        onClose={() => setModalOpen(false)}
      />
    </AuthContext.Provider>
  );
}

export function useAuthState(): AuthState {
  const ctx = React.useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuthState must be used within an AuthProvider");
  }
  return ctx;
}
