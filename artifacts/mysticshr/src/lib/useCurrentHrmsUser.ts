import { useGetCurrentUser, getGetCurrentUserQueryKey } from "@workspace/api-client-react";
import { useAuth } from "./auth";

export type HrmsRole = "customer_admin" | "hr_manager" | "hr_executive" | "hod" | "payroll_admin" | "employee";

interface ApiError {
  response?: { status?: number };
  message?: string;
}

export function useCurrentHrmsUser() {
  const { isSignedIn } = useAuth();
  const { data, error, isLoading } = useGetCurrentUser({
    query: {
      enabled: isSignedIn,
      retry: false,
      staleTime: 1000 * 60 * 5,
      queryKey: getGetCurrentUserQueryKey(),
    },
  });

  const apiError = error as ApiError | null;
  const status = apiError?.response?.status;
  const isNotProvisioned = status === 403 || status === 404;

  return {
    hrmsUser: data ?? null,
    role: (data?.role ?? null) as HrmsRole | null,
    isLoading,
    isNotProvisioned,
    error: apiError,
  };
}

export function hasRole(role: HrmsRole | null, allowed: HrmsRole[]): boolean {
  return role !== null && allowed.includes(role);
}
