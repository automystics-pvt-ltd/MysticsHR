const BASE =
  import.meta.env.VITE_API_BASE_URL ??
  `${window.location.origin}/api`;

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const body = await res.json();
      msg = body.error ?? body.message ?? msg;
    } catch {}
    throw Object.assign(new Error(msg), { status: res.status });
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  // Auth
  platformMe: () => apiFetch<{ admin: PlatformAdmin }>("/platform/auth/me"),
  platformLogin: (email: string, password: string) =>
    apiFetch<{ admin: PlatformAdmin }>("/platform/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  platformLogout: () =>
    apiFetch<{ ok: boolean }>("/platform/auth/logout", { method: "POST" }),

  // Analytics
  analytics: () => apiFetch<Analytics>("/platform/analytics"),

  // Tenants
  listTenants: () => apiFetch<{ data: Tenant[]; total: number }>("/platform/tenants"),
  getTenant: (id: number) => apiFetch<Tenant>(`/platform/tenants/${id}`),
  createTenant: (data: { name: string; slug: string }) =>
    apiFetch<Tenant>("/platform/tenants", { method: "POST", body: JSON.stringify(data) }),
  updateTenant: (id: number, data: { name?: string; isActive?: boolean }) =>
    apiFetch<Tenant>(`/platform/tenants/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  // Tenant users
  listTenantUsers: (tenantId: number) =>
    apiFetch<{ data: HrmsUser[]; total: number }>(`/platform/tenants/${tenantId}/users`),
  createTenantUser: (tenantId: number, data: { email: string; name: string; password: string }) =>
    apiFetch<HrmsUser>(`/platform/tenants/${tenantId}/users`, {
      method: "POST",
      body: JSON.stringify({ ...data, role: "customer_admin" }),
    }),

  // Platform admins
  listAdmins: () =>
    apiFetch<{ data: PlatformAdmin[]; total: number }>("/platform/admins"),
  createAdmin: (data: { email: string; name: string; password: string }) =>
    apiFetch<PlatformAdmin>("/platform/admins", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateAdmin: (id: number, data: { name?: string; isActive?: boolean }) =>
    apiFetch<PlatformAdmin>(`/platform/admins/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  // Audit logs
  auditLogs: (params?: {
    limit?: number;
    offset?: number;
    tenantId?: number;
    userId?: number;
    action?: string;
    dateFrom?: string;
    dateTo?: string;
    sortField?: string;
    sortDir?: "asc" | "desc";
  }) => {
    const qs = new URLSearchParams();
    if (params?.limit != null) qs.set("limit", String(params.limit));
    if (params?.offset != null) qs.set("offset", String(params.offset));
    if (params?.tenantId != null) qs.set("tenantId", String(params.tenantId));
    if (params?.userId != null) qs.set("userId", String(params.userId));
    if (params?.action) qs.set("action", params.action);
    if (params?.dateFrom) qs.set("dateFrom", params.dateFrom);
    if (params?.dateTo) qs.set("dateTo", params.dateTo);
    if (params?.sortField) qs.set("sortField", params.sortField);
    if (params?.sortDir) qs.set("sortDir", params.sortDir);
    return apiFetch<{ data: AuditLog[]; total: number; limit: number; offset: number }>(
      `/platform/audit-logs?${qs}`
    );
  },
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PlatformAdmin {
  id: number;
  email: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Tenant {
  id: number;
  slug: string;
  name: string;
  isActive: boolean;
  userCount?: number;
  employeeCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface HrmsUser {
  id: number;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

export interface Analytics {
  tenants: { total: number; active: number };
  hrmsUsers: { total: number; active: number };
  employees: { total: number };
  platformAdmins: { total: number };
}

export interface AuditLog {
  id: number;
  tenantId: number;
  action: string;
  entityType?: string;
  entityId?: number;
  performedByUserId?: number;
  createdAt: string;
  metadata?: Record<string, unknown>;
}
