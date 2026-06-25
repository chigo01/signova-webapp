"use client";

import * as React from "react";
import { getAuthToken } from "@/lib/cookies";
import { API_URL } from "@/lib/config";
import { AuthModal } from "@/components/auth/auth-modal";

interface AuthState {
  /** True once the token has been validated against /auth/check. */
  isAuthenticated: boolean;
  /** True when the visitor is browsing without a valid session. */
  isGuest: boolean;
  /** True while the initial auth check is in flight. */
  isLoading: boolean;
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

  React.useEffect(() => {
    let cancelled = false;

    const checkAuth = async () => {
      const token = getAuthToken();

      if (!token) {
        if (!cancelled) {
          setIsAuthenticated(false);
          setIsLoading(false);
        }
        return;
      }

      try {
        const res = await fetch(`${API_URL}/auth/check`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!cancelled) setIsAuthenticated(res.ok);
      } catch {
        if (!cancelled) setIsAuthenticated(false);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void checkAuth();
    return () => {
      cancelled = true;
    };
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
      promptAuth,
      requireAuth,
    }),
    [isAuthenticated, isLoading, promptAuth, requireAuth],
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
