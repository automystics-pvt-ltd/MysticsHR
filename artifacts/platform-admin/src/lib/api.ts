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
    try { const body = await res.json(); msg = body.error ?? body.message ?? msg; } catch {}
    throw Object.assign(new Error(msg), { status: res.status });
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  // Auth
  platformMe: () => apiFetch<{ admin: PlatformAdmin }>("/platform/auth/me"),
  platformLogin: (email: string, password: string) =>
    apiFetch<{ admin: PlatformAdmin }>("/platform/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  platformLogout: () => apiFetch<{ ok: boolean }>("/platform/auth/logout", { method: "POST" }),

  // Analytics
  analytics: () => apiFetch<Analytics>("/platform/analytics"),

  // Subscription Plans
  listPlans: () => apiFetch<{ data: SubscriptionPlan[]; total: number }>("/platform/subscription-plans"),
  getPlan: (id: number) => apiFetch<SubscriptionPlan>(`/platform/subscription-plans/${id}`),
  createPlan: (data: Partial<SubscriptionPlan>) =>
    apiFetch<SubscriptionPlan>("/platform/subscription-plans", { method: "POST", body: JSON.stringify(data) }),
  updatePlan: (id: number, data: Partial<SubscriptionPlan>) =>
    apiFetch<SubscriptionPlan>(`/platform/subscription-plans/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deletePlan: (id: number) =>
    apiFetch<{ ok: boolean }>(`/platform/subscription-plans/${id}`, { method: "DELETE" }),

  // Tenants
  listTenants: (status?: string) => {
    const qs = status && status !== "all" ? `?status=${status}` : "";
    return apiFetch<{ data: Tenant[]; total: number }>(`/platform/tenants${qs}`);
  },
  getTenant: (id: number) => apiFetch<TenantDetail>(`/platform/tenants/${id}`),
  createTenant: (data: Partial<Tenant> & { name: string; slug: string }) =>
    apiFetch<Tenant>("/platform/tenants", { method: "POST", body: JSON.stringify(data) }),
  updateTenant: (id: number, data: Partial<Tenant> & Record<string, unknown>) =>
    apiFetch<Tenant>(`/platform/tenants/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteTenant: (id: number) =>
    apiFetch<{ ok: boolean; id: number }>(`/platform/tenants/${id}`, { method: "DELETE" }),

  // Tenant Config
  getTenantConfig: (id: number) => apiFetch<TenantConfig>(`/platform/tenants/${id}/config`),
  updateTenantConfig: (id: number, data: Partial<TenantConfig>) =>
    apiFetch<Tenant>(`/platform/tenants/${id}/config`, { method: "PATCH", body: JSON.stringify(data) }),

  // Tenant Health
  getTenantHealth: (id: number) => apiFetch<TenantHealth>(`/platform/tenants/${id}/health`),

  // Tenant users
  listTenantUsers: (tenantId: number) =>
    apiFetch<{ data: HrmsUser[]; total: number }>(`/platform/tenants/${tenantId}/users`),
  createTenantUser: (tenantId: number, data: { email: string; name: string; password: string; role?: string }) =>
    apiFetch<HrmsUser>(`/platform/tenants/${tenantId}/users`, { method: "POST", body: JSON.stringify(data) }),
  updateTenantUser: (tenantId: number, userId: number, data: { isActive?: boolean; role?: string }) =>
    apiFetch<HrmsUser>(`/platform/tenants/${tenantId}/users/${userId}`, { method: "PATCH", body: JSON.stringify(data) }),

  // Platform admins
  listAdmins: () => apiFetch<{ data: PlatformAdmin[]; total: number }>("/platform/admins"),
  createAdmin: (data: { email: string; name: string; password: string }) =>
    apiFetch<PlatformAdmin>("/platform/admins", { method: "POST", body: JSON.stringify(data) }),
  updateAdmin: (id: number, data: { name?: string; isActive?: boolean }) =>
    apiFetch<PlatformAdmin>(`/platform/admins/${id}`, { method: "PATCH", body: JSON.stringify(data) }),

  // Audit logs
  auditLogs: (params?: { limit?: number; offset?: number; tenantId?: number }) => {
    const qs = new URLSearchParams();
    if (params?.limit != null) qs.set("limit", String(params.limit));
    if (params?.offset != null) qs.set("offset", String(params.offset));
    if (params?.tenantId != null) qs.set("tenantId", String(params.tenantId));
    return apiFetch<{ data: AuditLog[]; total: number; limit: number; offset: number }>(
      `/platform/audit-logs?${qs}`
    );
  },
};

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface PlatformAdmin {
  id: number; email: string; name: string; isActive: boolean;
  createdAt: string; updatedAt: string;
}

export interface SubscriptionPlan {
  id: number; name: string; type: string;
  priceMonthly: number; priceYearly: number;
  maxUsers: number; maxEmployees: number; maxBranches: number; maxApiCalls: number;
  enabledModules: string[]; enabledFeatures: string[];
  description?: string; isActive: boolean;
  tenantCount?: number;
  createdAt: string; updatedAt: string;
}

export interface Tenant {
  id: number; slug: string; name: string;
  isActive: boolean; status: string;
  planId?: number | null; planName?: string | null; planType?: string | null;
  contactEmail?: string | null; industry?: string | null;
  website?: string | null; country?: string | null;
  trialEndsAt?: string | null; subscriptionEndsAt?: string | null;
  userCount?: number; employeeCount?: number;
  createdAt: string; updatedAt: string;
}

export interface TenantDetail extends Tenant {
  planMaxUsers?: number | null; planMaxEmployees?: number | null;
  planMaxBranches?: number | null; planMaxApiCalls?: number | null;
  planEnabledModules?: string[] | null; planEnabledFeatures?: string[] | null;
  customMaxUsers?: number | null; customMaxEmployees?: number | null;
  customMaxBranches?: number | null; customMaxApiCalls?: number | null;
  enabledModules?: string[] | null; enabledFeatures?: string[] | null;
  notes?: string | null; subscriptionStartsAt?: string | null;
  activeUserCount?: number;
}

export interface TenantConfig {
  enabledModules?: string[] | null; enabledFeatures?: string[] | null;
  customMaxUsers?: number | null; customMaxEmployees?: number | null;
  customMaxBranches?: number | null; customMaxApiCalls?: number | null;
  planEnabledModules?: string[] | null; planEnabledFeatures?: string[] | null;
  planMaxUsers?: number | null; planMaxEmployees?: number | null;
  planMaxBranches?: number | null; planMaxApiCalls?: number | null;
}

export interface TenantHealth {
  users: { total: number; active: number };
  employees: { total: number; active: number };
  roleBreakdown: { role: string; count: number }[];
  recentActivity: { id: number; action: string; module?: string; userEmail?: string; createdAt: string }[];
}

export interface HrmsUser {
  id: number; email: string; name: string;
  role: string; isActive: boolean; createdAt: string;
}

export interface Analytics {
  tenants: { total: number; active: number; trial: number; suspended: number; archived: number };
  hrmsUsers: { total: number; active: number };
  employees: { total: number };
  platformAdmins: { total: number };
  planDistribution: { planName: string; planType: string; count: number }[];
  recentTenants: { id: number; name: string; status: string; planName?: string | null; createdAt: string }[];
}

export interface AuditLog {
  id: number; tenantId: number; action: string;
  entityType?: string; entityId?: number;
  module?: string; userEmail?: string;
  performedByUserId?: number; createdAt: string;
  metadata?: Record<string, unknown>;
}
