import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, type Player } from "../api/client";
import { connectSocket, disconnectSocket } from "../api/socket";

interface AuthContextValue {
  token: string | null;
  player: Player | null;
  loading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => void;
  refreshPlayer: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = "space.auth.token";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(STORAGE_KEY));
  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshPlayer = useCallback(async () => {
    if (!token) return;
    const me = await api.me(token);
    setPlayer(me);
  }, [token]);

  useEffect(() => {
    if (!token) {
      setPlayer(null);
      disconnectSocket();
      return;
    }
    localStorage.setItem(STORAGE_KEY, token);
    connectSocket(token);
    refreshPlayer().catch(() => {
      setToken(null);
      localStorage.removeItem(STORAGE_KEY);
    });
    return () => disconnectSocket();
  }, [token, refreshPlayer]);

  const login = useCallback(async (username: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const { token: newToken } = await api.login(username, password);
      setToken(newToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (username: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const { token: newToken } = await api.register(username, password);
      setToken(newToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const value = useMemo(
    () => ({ token, player, loading, error, login, register, logout, refreshPlayer }),
    [token, player, loading, error, login, register, logout, refreshPlayer]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
