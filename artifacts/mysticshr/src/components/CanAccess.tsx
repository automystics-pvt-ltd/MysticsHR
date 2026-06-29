import { usePermission } from "@/lib/useMyPermissions";

interface CanAccessProps {
  module: string;
  action: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function CanAccess({ module, action, children, fallback = null }: CanAccessProps) {
  const allowed = usePermission(module, action);
  return allowed ? <>{children}</> : <>{fallback}</>;
}
