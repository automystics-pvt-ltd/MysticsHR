import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { api, PlatformAdmin } from "@/lib/api";

interface PlatformAuthContextValue {
  isSignedIn: boolean;
  isLoading: boolean;
  admin: PlatformAdmin | null;
  loginWithCredentials: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  requestOtp: (email: string) => Promise<{ ok: boolean; error?: string }>;
  verifyOtp: (email: string, otp: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const PlatformAuthContext = createContext<PlatformAuthContextValue | null>(null);

export function PlatformAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<PlatformAdmin | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api.platformMe()
      .then((res) => setAdmin(res.admin))
      .catch(() => setAdmin(null))
      .finally(() => setIsLoading(false));
  }, []);

  const loginWithCredentials = useCallback(async (email: string, password: string) => {
    try {
      const res = await api.platformLoginCredential(email, password);
      setAdmin(res.admin);
      return { ok: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Login failed";
      return { ok: false, error: msg };
    }
  }, []);

  const requestOtp = useCallback(async (email: string) => {
    try {
      await api.platformRequestOtp(email);
      return { ok: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to send OTP";
      return { ok: false, error: msg };
    }
  }, []);

  const verifyOtp = useCallback(async (email: string, otp: string) => {
    try {
      const res = await api.platformVerifyOtp(email, otp);
      setAdmin(res.admin);
      return { ok: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Verification failed";
      return { ok: false, error: msg };
    }
  }, []);

  const logout = useCallback(async () => {
    await api.platformLogout().catch(() => {});
    setAdmin(null);
  }, []);

  return (
    <PlatformAuthContext.Provider
      value={{ isSignedIn: !!admin, isLoading, admin, loginWithCredentials, requestOtp, verifyOtp, logout }}
    >
      {children}
    </PlatformAuthContext.Provider>
  );
}

export function usePlatformAuth() {
  const ctx = useContext(PlatformAuthContext);
  if (!ctx) throw new Error("usePlatformAuth must be used inside PlatformAuthProvider");
  return ctx;
}
