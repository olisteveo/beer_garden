/**
 * API client for the Pub Garden backend.
 *
 * In dev: requests proxy via Vite to localhost:3001.
 * In prod: Vercel rewrites /api/* → Railway backend.
 * In Capacitor: VITE_API_URL points to production backend.
 */

import type { AreaData, WeatherData, ForecastData } from "../types";
import type { AuthResponse, User } from "../types/auth";
import {
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearTokens,
} from "../auth/tokenStorage";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

// ── Error class ─────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// ── Token refresh dedup ─────────────────────────────────────────

let refreshPromise: Promise<boolean> | null = null;

async function attemptTokenRefresh(): Promise<boolean> {
  const rt = getRefreshToken();
  if (!rt) return false;

  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: rt }),
    });
    if (!res.ok) {
      clearTokens();
      return false;
    }
    const data = (await res.json()) as { accessToken: string; refreshToken: string };
    setTokens(data.accessToken, data.refreshToken);
    return true;
  } catch {
    clearTokens();
    return false;
  }
}

/** Deduplicated refresh — multiple 401s share the same attempt. */
function refreshTokenOnce(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = attemptTokenRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

// ── Request helpers ─────────────────────────────────────────────

function parseError(body: unknown): string {
  if (typeof body === "object" && body !== null && "error" in body) {
    return String((body as { error: string }).error);
  }
  return "Request failed";
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  signal?: AbortSignal;
  auth?: boolean; // default true
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, signal, auth = true } = opts;
  const url = `${API_BASE}${path}`;

  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth) {
    const token = getAccessToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  let response = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  });

  // 401 — attempt one refresh then retry
  if (response.status === 401 && auth) {
    const refreshed = await refreshTokenOnce();
    if (refreshed) {
      const retryHeaders: Record<string, string> = {};
      if (body !== undefined) retryHeaders["Content-Type"] = "application/json";
      const retryToken = getAccessToken();
      if (retryToken) retryHeaders["Authorization"] = `Bearer ${retryToken}`;

      response = await fetch(url, {
        method,
        headers: retryHeaders,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal,
      });
    }
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new ApiError(response.status, parseError(errorBody));
  }

  // 204 No Content
  if (response.status === 204) return undefined as T;

  return response.json() as Promise<T>;
}

// ── Auth endpoints (public — no Bearer token) ───────────────────

export async function apiLogin(
  email: string,
  password: string,
): Promise<AuthResponse> {
  return request<AuthResponse>("/auth/login", {
    method: "POST",
    body: { email, password },
    auth: false,
  });
}

export async function apiRegister(
  email: string,
  password: string,
  displayName: string,
): Promise<AuthResponse> {
  return request<AuthResponse>("/auth/register", {
    method: "POST",
    body: { email, password, displayName },
    auth: false,
  });
}

export async function apiGoogleAuth(credential: string): Promise<AuthResponse> {
  return request<AuthResponse>("/auth/google", {
    method: "POST",
    body: { credential },
    auth: false,
  });
}

export async function apiRefreshToken(
  refreshToken: string,
): Promise<{ accessToken: string; refreshToken: string }> {
  return request<{ accessToken: string; refreshToken: string }>("/auth/refresh", {
    method: "POST",
    body: { refreshToken },
    auth: false,
  });
}

export async function apiLogout(refreshToken: string): Promise<void> {
  return request<void>("/auth/logout", {
    method: "POST",
    body: { refreshToken },
    auth: true,
  });
}

export async function apiGetMe(): Promise<User> {
  const res = await request<{ user: User }>("/auth/me");
  return res.user;
}

// ── User profile endpoints ──────────────────────────────────────

export async function apiUpdateProfile(
  data: { displayName?: string; preferences?: Record<string, unknown> },
): Promise<User> {
  const res = await request<{ user: User }>("/auth/me", {
    method: "PUT",
    body: data,
  });
  return res.user;
}

export async function apiChangePassword(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  return request<void>("/auth/me/password", {
    method: "PUT",
    body: { currentPassword, newPassword },
  });
}

export async function apiForgotPassword(email: string): Promise<void> {
  return request<void>("/auth/forgot-password", {
    method: "POST",
    body: { email },
    auth: false,
  });
}

// ── Search endpoints ────────────────────────────────────────────

export interface SearchResponse {
  center: { lat: number; lon: number };
  displayName: string;
  radius: number;
  area: AreaData;
}

export async function apiSearch(
  query: string,
  radius: number,
  signal?: AbortSignal,
): Promise<SearchResponse> {
  const params = new URLSearchParams({
    q: query,
    radius: String(radius),
  });
  return request<SearchResponse>(`/search?${params}`, { signal });
}

export async function apiSearchByLocation(
  lat: number,
  lon: number,
  radius: number,
  signal?: AbortSignal,
): Promise<SearchResponse> {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
    radius: String(radius),
  });
  return request<SearchResponse>(`/search/location?${params}`, { signal });
}

// ── Weather endpoint ────────────────────────────────────────────

export async function apiWeather(
  lat: number,
  lon: number,
  signal?: AbortSignal,
): Promise<WeatherData | null> {
  try {
    return await request<WeatherData>(`/weather?lat=${lat}&lon=${lon}`, { signal });
  } catch (err) {
    if (err instanceof ApiError && err.status === 503) return null;
    throw err;
  }
}

export async function apiForecast(
  lat: number,
  lon: number,
  signal?: AbortSignal,
): Promise<ForecastData | null> {
  try {
    return await request<ForecastData>(`/weather/forecast?lat=${lat}&lon=${lon}`, { signal });
  } catch (err) {
    if (err instanceof ApiError && err.status === 503) return null;
    throw err;
  }
}
