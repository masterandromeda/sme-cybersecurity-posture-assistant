"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  getCurrentUser,
  signIn as authSignIn,
  signUp as authSignUp,
  signOut as authSignOut,
  type AuthUser,
  type AuthResult,
} from "@/lib/auth";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (name: string, email: string, password: string, company: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // On mount, restore session from in-memory store
  useEffect(() => {
    const existing = getCurrentUser();
    const timer = setTimeout(() => {
      setUser(existing);
      setLoading(false);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const signIn = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    const result = await authSignIn(email, password);
    if (result.success && result.user) setUser(result.user);
    return result;
  }, []);

  const signUp = useCallback(async (name: string, email: string, password: string, company: string): Promise<AuthResult> => {
    const result = await authSignUp(name, email, password, company);
    if (result.success && result.user) setUser(result.user);
    return result;
  }, []);

  const signOut = useCallback(async () => {
    await authSignOut();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
