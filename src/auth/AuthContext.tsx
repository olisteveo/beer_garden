import {
  createContext,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { User } from "../types/auth";
import {
  getRefreshToken,
  setTokens,
  clearTokens,
  getAccessToken,
  getTokenExpiry,
} from "./tokenStorage";
import {
  apiLogin,
  apiRegister,
  apiGoogleAuth,
  apiRefreshToken,
  apiLogout,
  apiGetMe,
} from "../utils/api";

// ── Context shape ───────────────────────────────────────────────

export interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  loginWithGoogle: (credential: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

// ── Provider ────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Schedule proactive token refresh ~60s before expiry
  const scheduleRefresh = useCallback(() => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);

    const token = getAccessToken();
    if (!token) return;

    const exp = getTokenExpiry(token);
    if (!exp) return;

    const msUntilRefresh = (exp - 60) * 1000 - Date.now();
    if (msUntilRefresh <= 0) return; // already near expiry, will refresh on next request

    refreshTimer.current = setTimeout(async () => {
      const rt = getRefreshToken();
      if (!rt) return;
      try {
        const data = await apiRefreshToken(rt);
        setTokens(data.accessToken, data.refreshToken);
        scheduleRefresh();
      } catch {
        clearTokens();
        setUser(null);
      }
    }, msUntilRefresh);
  }, []);

  // Bootstrap: try to restore session from stored refresh token
  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const rt = getRefreshToken();
      if (!rt) {
        setLoading(false);
        return;
      }

      try {
        const tokens = await apiRefreshToken(rt);
        setTokens(tokens.accessToken, tokens.refreshToken);
        const me = await apiGetMe();
        if (!cancelled) {
          setUser(me);
          scheduleRefresh();
        }
      } catch {
        clearTokens();
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
    };
  }, [scheduleRefresh]);

  // Shared post-auth handler
  const handleAuthSuccess = useCallback(
    (u: User, accessToken: string, refreshToken: string) => {
      setTokens(accessToken, refreshToken);
      setUser(u);
      scheduleRefresh();
    },
    [scheduleRefresh],
  );

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await apiLogin(email, password);
      handleAuthSuccess(res.user, res.accessToken, res.refreshToken);
    },
    [handleAuthSuccess],
  );

  const register = useCallback(
    async (email: string, password: string, displayName: string) => {
      const res = await apiRegister(email, password, displayName);
      handleAuthSuccess(res.user, res.accessToken, res.refreshToken);
    },
    [handleAuthSuccess],
  );

  const loginWithGoogle = useCallback(
    async (credential: string) => {
      const res = await apiGoogleAuth(credential);
      handleAuthSuccess(res.user, res.accessToken, res.refreshToken);
    },
    [handleAuthSuccess],
  );

  const logout = useCallback(async () => {
    const rt = getRefreshToken();
    try {
      if (rt) await apiLogout(rt);
    } catch {
      // Swallow — clear local state regardless
    }
    clearTokens();
    setUser(null);
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
  }, []);

  const updateUser = useCallback((u: User) => {
    setUser(u);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, loginWithGoogle, logout, updateUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}
