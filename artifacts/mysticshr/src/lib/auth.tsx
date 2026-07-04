import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";

const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");

// ─── Theme presets ─────────────────────────────────────────────────────────────

const THEME_PRESETS: Record<string, {
  primary: string; primaryForeground: string;
  sidebar: string; sidebarForeground: string;
  sidebarPrimary: string; ring: string;
}> = {
  violet:  { primary: "262 83% 58%", primaryForeground: "0 0% 100%", sidebar: "258 54% 7%",  sidebarForeground: "260 30% 92%", sidebarPrimary: "262 83% 58%", ring: "262 83% 58%" },
  blue:    { primary: "217 91% 60%", primaryForeground: "0 0% 100%", sidebar: "222 47% 7%",  sidebarForeground: "214 30% 92%", sidebarPrimary: "217 91% 60%", ring: "217 91% 60%" },
  indigo:  { primary: "239 84% 65%", primaryForeground: "0 0% 100%", sidebar: "236 48% 7%",  sidebarForeground: "235 30% 92%", sidebarPrimary: "239 84% 65%", ring: "239 84% 65%" },
  teal:    { primary: "174 76% 40%", primaryForeground: "0 0% 100%", sidebar: "174 50% 6%",  sidebarForeground: "174 30% 92%", sidebarPrimary: "174 76% 40%", ring: "174 76% 40%" },
  emerald: { primary: "152 76% 40%", primaryForeground: "0 0% 100%", sidebar: "152 45% 6%",  sidebarForeground: "152 30% 92%", sidebarPrimary: "152 76% 40%", ring: "152 76% 40%" },
  rose:    { primary: "347 77% 55%", primaryForeground: "0 0% 100%", sidebar: "345 40% 6%",  sidebarForeground: "345 30% 92%", sidebarPrimary: "347 77% 55%", ring: "347 77% 55%" },
  amber:   { primary: "38 92% 50%",  primaryForeground: "0 0% 10%",  sidebar: "25 45% 6%",   sidebarForeground: "38 30% 92%",  sidebarPrimary: "38 92% 50%",  ring: "38 92% 50%"  },
  slate:   { primary: "215 25% 55%", primaryForeground: "0 0% 100%", sidebar: "222 47% 6%",  sidebarForeground: "215 30% 92%", sidebarPrimary: "215 25% 55%", ring: "215 25% 55%" },
};

function applyTheme(themeConfig: { preset?: string } | null | undefined) {
  const preset = THEME_PRESETS[themeConfig?.preset ?? ""] ?? THEME_PRESETS["violet"];
  const root = document.documentElement;
  root.style.setProperty("--primary", preset.primary);
  root.style.setProperty("--primary-foreground", preset.primaryForeground);
  root.style.setProperty("--ring", preset.ring);
  root.style.setProperty("--sidebar", preset.sidebar);
  root.style.setProperty("--sidebar-foreground", preset.sidebarForeground);
  root.style.setProperty("--sidebar-primary", preset.sidebarPrimary);
  root.style.setProperty("--sidebar-primary-foreground", preset.primaryForeground);
}

// ─── Auth context ──────────────────────────────────────────────────────────────

interface MeResponse {
  id?: number;
  email?: string;
  name?: string;
  tenantId?: number | null;
  tenantSlug?: string | null;
  themeConfig?: { preset?: string } | null;
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
          applyTheme(data.themeConfig);
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
      setIsSignedIn(true);
      // Fetch full user data (including themeConfig) after login
      fetch(`${BASE_URL}/api/users/me`, { credentials: "include" })
        .then(async (r) => {
          if (r.ok) {
            const me = (await r.json().catch(() => ({}))) as MeResponse;
            setTenantId(me.tenantId ?? null);
            setTenantSlug(me.tenantSlug ?? null);
            applyTheme(me.themeConfig);
          }
        })
        .catch(() => {});
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
    applyTheme(null);
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
