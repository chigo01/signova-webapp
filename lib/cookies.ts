// Cookie utilities for auth token management

export const COOKIE_NAME = "auth_token";

/**
 * Get the auth token from cookies
 */
export function getAuthToken(): string | null {
  if (typeof document === "undefined") return null;

  const cookies = document.cookie.split(";");
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split("=");
    if (name === COOKIE_NAME) {
      return value;
    }
  }
  return null;
}

/**
 * Set the auth token in a cookie
 */
export function setAuthToken(token: string): void {
  const isProduction = window.location.protocol === "https:";
  const maxAge = 7 * 24 * 60 * 60; // 7 days in seconds
  document.cookie = `${COOKIE_NAME}=${token}; path=/; max-age=${maxAge}${
    isProduction ? "; secure" : ""
  }; samesite=lax`;
}

/**
 * Remove the auth token cookie
 */
export function removeAuthToken(): void {
  document.cookie = `${COOKIE_NAME}=; path=/; max-age=0`;
}

/**
 * Get headers with Authorization token for API requests
 */
export function getAuthHeaders(): HeadersInit {
  const token = getAuthToken();
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}
