// ── Auth types ──────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  authProvider: "email" | "google";
  preferences: UserPreferences;
}

export interface UserPreferences {
  searchRadius?: number; // 400-2000 metres
  units?: "metric" | "imperial";
  theme?: "dark" | "system";
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}
