'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { apiFetch, clearTokens, setTokens } from './api';
import type { AuthTokens, User } from './types';

interface SignupInput {
  email: string;
  username: string;
  password: string;
  age: number;
}

interface LoginInput {
  email: string;
  password: string;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (input: LoginInput) => Promise<void>;
  signup: (input: SignupInput) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const me = await apiFetch<User>('/users/me');
      setUser(me);
    } catch {
      clearTokens();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Standard fetch-on-mount: refreshUser() resolves the current session from the stored token.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshUser();
  }, [refreshUser]);

  const login = useCallback(async (input: LoginInput) => {
    const result = await apiFetch<{ user: User; tokens: AuthTokens }>('/auth/login', {
      method: 'POST',
      body: input,
    });
    setTokens(result.tokens.accessToken, result.tokens.refreshToken);
    setUser(result.user);
  }, []);

  const signup = useCallback(async (input: SignupInput) => {
    const result = await apiFetch<{ user: User; tokens: AuthTokens }>('/auth/signup', {
      method: 'POST',
      body: input,
    });
    setTokens(result.tokens.accessToken, result.tokens.refreshToken);
    setUser(result.user);
  }, []);

  const logout = useCallback(() => {
    clearTokens();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
