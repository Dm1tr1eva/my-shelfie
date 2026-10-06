"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { apiFetch, ApiError } from "./api";

export type User = { id: string; email: string; name: string };

type Status = "loading" | "authenticated" | "anonymous";

type AuthContextValue = {
  user: User | null;
  status: Status;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    let cancelled = false;

    apiFetch<User | null>("/api/auth/me")
      .then((me) => {
        if (cancelled) return;
        setUser(me);
        setStatus(me ? "authenticated" : "anonymous");
      })
      .catch(() => {
        if (cancelled) return;
        setUser(null);
        setStatus("anonymous");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const me = await apiFetch<User>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setUser(me);
    setStatus("authenticated");
  }, []);

  const register = useCallback(async (email: string, password: string, name: string) => {
    await apiFetch<User>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, name }),
    });
    await login(email, password);
  }, [login]);

  const logout = useCallback(async () => {
    await apiFetch<void>("/api/auth/logout", { method: "POST" });
    setUser(null);
    setStatus("anonymous");
  }, []);

  return (
    <AuthContext.Provider value={{ user, status, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside an AuthProvider");
  }
  return context;
}

export { ApiError };
