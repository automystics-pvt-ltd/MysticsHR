import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./auth";
import { type PermissionMap } from "./module-registry";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function fetchMyPermissions(): Promise<PermissionMap> {
  const res = await fetch(`${BASE}/api/rbac/my-permissions`, { credentials: "include" });
  if (!res.ok) return {};
  return res.json();
}

export function useMyPermissions() {
  const { isSignedIn } = useAuth();
  return useQuery<PermissionMap>({
    queryKey: ["rbac", "my-permissions"],
    queryFn: fetchMyPermissions,
    enabled: isSignedIn,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

export function usePermission(moduleKey: string, action: string): boolean {
  const { data } = useMyPermissions();
  if (!data) return false;
  return (data[moduleKey] ?? []).includes(action);
}

export function useModulePermissions(moduleKey: string): string[] {
  const { data } = useMyPermissions();
  return data?.[moduleKey] ?? [];
}
