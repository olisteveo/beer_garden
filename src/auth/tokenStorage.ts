import { jwtDecode } from "jwt-decode";

const ACCESS_KEY = "pub-garden:access-token";
const REFRESH_KEY = "pub-garden:refresh-token";

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY);
}

export function setTokens(access: string, refresh: string): void {
  localStorage.setItem(ACCESS_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

/**
 * Decode the access token's `exp` claim.
 * Returns epoch seconds, or null if token is invalid.
 */
export function getTokenExpiry(token: string): number | null {
  try {
    const decoded = jwtDecode<{ exp?: number }>(token);
    return decoded.exp ?? null;
  } catch {
    return null;
  }
}
