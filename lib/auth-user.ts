const STORAGE_KEY = "signova_auth_user";

export interface AuthUserProfile {
  email?: string;
  name?: string;
}

export function setAuthUserProfile(user: AuthUserProfile | null | undefined): void {
  if (typeof window === "undefined" || !user) return;
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ email: user.email, name: user.name })
    );
  } catch {
    // ignore quota / private mode
  }
}

export function getAuthUserProfile(): AuthUserProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const { email, name } = parsed as AuthUserProfile;
    return {
      ...(typeof email === "string" ? { email } : {}),
      ...(typeof name === "string" ? { name } : {}),
    };
  } catch {
    return null;
  }
}

export function removeAuthUserProfile(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
