const STORAGE_KEY = "signova_auth_user";

export interface NotificationPreferences {
  newSignals?: boolean;
  tradeAlerts?: boolean;
  newsletter?: boolean;
}

export interface StockNewsPreferences {
  delivery?: "off" | "immediate" | "daily";
  timezone?: string;
  changedAt?: string;
}

export interface AuthUserProfile {
  email?: string;
  name?: string;
  phone?: string;
  username?: string;
  role?: string;
  avatarDataUrl?: string;
  tradeReversalEnabled?: boolean;
  notificationPreferences?: NotificationPreferences;
  stockNewsPreferences?: StockNewsPreferences;
}

export function setAuthUserProfile(user: AuthUserProfile | null | undefined): void {
  if (typeof window === "undefined" || !user) return;
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        email: user.email,
        name: user.name,
        phone: user.phone,
        username: user.username,
        role: user.role,
        avatarDataUrl: user.avatarDataUrl,
        tradeReversalEnabled: user.tradeReversalEnabled,
        notificationPreferences: user.notificationPreferences,
        stockNewsPreferences: user.stockNewsPreferences,
      })
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
    const {
      email,
      name,
      phone,
      username,
      role,
      avatarDataUrl,
      tradeReversalEnabled,
      notificationPreferences,
      stockNewsPreferences,
    } = parsed as AuthUserProfile;
    return {
      ...(typeof email === "string" ? { email } : {}),
      ...(typeof name === "string" ? { name } : {}),
      ...(typeof phone === "string" ? { phone } : {}),
      ...(typeof username === "string" ? { username } : {}),
      ...(typeof role === "string" ? { role } : {}),
      ...(typeof avatarDataUrl === "string" ? { avatarDataUrl } : {}),
      ...(typeof tradeReversalEnabled === "boolean"
        ? { tradeReversalEnabled }
        : {}),
      ...(notificationPreferences &&
      typeof notificationPreferences === "object"
        ? { notificationPreferences }
        : {}),
      ...(stockNewsPreferences && typeof stockNewsPreferences === "object"
        ? { stockNewsPreferences }
        : {}),
    };
  } catch {
    return null;
  }
}

export function removeAuthUserProfile(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
