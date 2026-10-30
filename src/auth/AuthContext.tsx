import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getCurrentUser, login as loginRequest, logout as logoutRequest } from "../api/auth.api";
import { clearTokens, getAccessToken, getRefreshToken, saveTokens } from "../api/tokenStorage";
import type { AuthUser } from "../types/api";

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => getAccessToken());
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const onAuthChanged = (event: Event) => {
      const customEvent = event as CustomEvent<{ token: string | null }>;
      const nextToken = customEvent.detail?.token ?? null;
      setToken(nextToken);
      if (!nextToken) setUser(null);
    };
    window.addEventListener("checku:auth-changed", onAuthChanged);
    return () => window.removeEventListener("checku:auth-changed", onAuthChanged);
  }, []);

  const refreshUser = useCallback(async () => {
    const response = await getCurrentUser();
    setUser(response.data);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function restoreSession() {
      if (!getAccessToken()) {
        setLoading(false);
        return;
      }
      try {
        const response = await getCurrentUser();
        if (!cancelled) setUser(response.data);
      } catch {
        clearTokens();
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void restoreSession();
    return () => { cancelled = true; };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const response = await loginRequest({ email: email.trim(), password });
    saveTokens(response.data);
    setToken(response.data.access_token);
    setUser(response.data.user);
  }, []);

  const signOut = useCallback(async () => {
    const refreshToken = getRefreshToken();
    try {
      if (getAccessToken()) await logoutRequest(refreshToken);
    } finally {
      clearTokens();
      setToken(null);
      setUser(null);
    }
  }, []);

  const value = useMemo(() => ({ user, token, loading, signIn, signOut, refreshUser }), [
    user, token, loading, signIn, signOut, refreshUser,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth debe usarse dentro de AuthProvider.");
  return context;
}
