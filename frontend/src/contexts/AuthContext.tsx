import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { authService } from '@/services/authService';
import { AUTH_EXPIRED_EVENT, TOKENS_REFRESHED_EVENT, tokenStore, type StoredTokens } from '@/services/api';
import { authorizeRealtime } from '@/services/supabase';
import { autoLoginCredentials } from '@/utils/autoLogin';
import type { RegisterPayload, Role, User } from '@/types';

interface AuthContextValue {
  user: User | null;
  /** true until the stored session has been verified on first load. */
  initializing: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (payload: RegisterPayload) => Promise<User | null>;
  logout: () => Promise<void>;
  /** Signs in with the configured account for `role`, replacing any current session. */
  signInAs: (role: Role) => Promise<User>;
  refreshUser: () => Promise<void>;
  setUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const tokens = tokenStore.get();
    if (!tokens?.access_token) {
      setInitializing(false);
      return;
    }
    void (async () => {
      try {
        await authorizeRealtime(tokens.access_token, tokens.refresh_token);
        const me = await authService.me();
        if (!cancelled) setUserState(me);
      } catch {
        tokenStore.clear();
      } finally {
        if (!cancelled) setInitializing(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onExpired = () => setUserState(null);
    const onRefreshed = (e: Event) => {
      const t = (e as CustomEvent<StoredTokens>).detail;
      void authorizeRealtime(t.access_token, t.refresh_token);
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    window.addEventListener(TOKENS_REFRESHED_EVENT, onRefreshed);
    return () => {
      window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
      window.removeEventListener(TOKENS_REFRESHED_EVENT, onRefreshed);
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const u = await authService.login(email, password);
    setUserState(u);
    return u;
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    const u = await authService.register(payload);
    if (u) setUserState(u);
    return u;
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUserState(null);
  }, []);

  const signInAs = useCallback(async (role: Role) => {
    const { email, password } = autoLoginCredentials(role);
    const u = await authService.login(email, password);
    setUserState(u);
    return u;
  }, []);

  const refreshUser = useCallback(async () => {
    const me = await authService.me();
    setUserState(me);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      initializing,
      isAuthenticated: !!user,
      login,
      register,
      logout,
      signInAs,
      refreshUser,
      setUser: setUserState,
    }),
    [user, initializing, login, register, logout, signInAs, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
