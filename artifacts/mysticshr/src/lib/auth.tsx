import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";

const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");

interface MeResponse {
  id?: number;
  email?: string;
  name?: string;
  tenantId?: number | null;
  tenantSlug?: string | null;
}

interface AuthContextValue {
  isSignedIn: boolean;
  isLoading: boolean;
  tenantId: number | null;
  tenantSlug: string | null;
  login: (email: string, password: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [tenantId, setTenantId] = useState<number | null>(null);
  const [tenantSlug, setTenantSlug] = useState<string | null>(null);
  const qc = useQueryClient();

  useEffect(() => {
    fetch(`${BASE_URL}/api/users/me`, { credentials: "include" })
      .then(async (r) => {
        if (r.ok) {
          const data = (await r.json().catch(() => ({}))) as MeResponse;
          setIsSignedIn(true);
          setTenantId(data.tenantId ?? null);
          setTenantSlug(data.tenantSlug ?? null);
        } else {
          setIsSignedIn(false);
        }
      })
      .catch(() => setIsSignedIn(false))
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        return { ok: false as const, error: data.error ?? "Sign in failed" };
      }
      const data = (await res.json().catch(() => ({}))) as MeResponse;
      setIsSignedIn(true);
      setTenantId(data.tenantId ?? null);
      setTenantSlug(data.tenantSlug ?? null);
      qc.clear();
      return { ok: true as const };
    },
    [qc],
  );

  const logout = useCallback(async () => {
    await fetch(`${BASE_URL}/api/auth/logout`, { method: "POST", credentials: "include" });
    setIsSignedIn(false);
    setTenantId(null);
    setTenantSlug(null);
    qc.clear();
  }, [qc]);

  return (
    <AuthContext.Provider value={{ isSignedIn, isLoading, tenantId, tenantSlug, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
