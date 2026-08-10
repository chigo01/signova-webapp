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

/**
 * Set while the account is inside its deletion grace window. `null` is a real
 * value here — it is what a successful revocation writes — so it must survive
 * the localStorage round trip below rather than being treated as "absent".
 */
export interface PendingDeletion {
  requestedAt?: string;
  scheduledFor?: string;
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
  pendingDeletion?: PendingDeletion | null;
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
        pendingDeletion: user.pendingDeletion,
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
      pendingDeletion,
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
      // Note this checks typeof rather than truthiness like the fields above:
      // an explicit null is meaningful here, since it is what a successful
      // revocation stores. Dropping it would let a stale pending state
      // resurrect the deletion banner after the user already undid it.
      ...(typeof pendingDeletion === "object" ? { pendingDeletion } : {}),
    };
  } catch {
    return null;
  }
}

export function removeAuthUserProfile(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
