'use client';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI, setTokens, clearTokens, getTokens } from './api';
import { User } from './types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
  setUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const tokens = getTokens();
      if (!tokens) { setLoading(false); return; }
      const { data } = await authAPI.me();
      setUser(data.user);
    } catch {
      clearTokens();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const login = async (email: string, password: string) => {
    const { data } = await authAPI.login({ email, password });
    setTokens(data.tokens);
    setUser(data.user);
  };

  const logout = () => {
    authAPI.logout().catch(() => {});
    clearTokens();
    setUser(null);
    window.location.href = '/';
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refresh, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export const useRequireAuth = () => {
  const { user, loading } = useAuth();
  return { user, loading, isAuthenticated: !!user };
};
