import { getAuthToken, removeAuthToken } from "@/lib/cookies";
import { removeAuthUserProfile } from "@/lib/auth-user";

function apiBase(): string {
  const base =
    process.env.NEXT_PUBLIC_API_URL || "https://web-server-4gpe.onrender.com";
  return base.replace(/\/$/, "");
}

/**
 * Calls the backend logout route, then clears local session (cookie + stored profile).
 * Local session is always cleared even if the request fails.
 */
export async function logout(): Promise<void> {
  const token = getAuthToken();

  try {
    if (token) {
      await fetch(`${apiBase()}/auth/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
    }
  } catch {
    // Network errors: still clear client-side session below.
  } finally {
    removeAuthToken();
    removeAuthUserProfile();
  }
}
