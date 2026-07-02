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
  auditLogs: (params?: { limit?: number; offset?: number; tenantId?: number; userId?: number; action?: string; dateFrom?: string; dateTo?: string; sortField?: string; sortDir?: string }) => {
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

  // ─── Billing ───────────────────────────────────────────────────────────────

  // Tenant invoices
  listTenantInvoices: (tenantId: number) =>
    apiFetch<{ data: Invoice[]; total: number }>(`/platform/tenants/${tenantId}/invoices`),
  createTenantInvoice: (tenantId: number, data: CreateInvoiceInput) =>
    apiFetch<Invoice>(`/platform/tenants/${tenantId}/invoices`, { method: "POST", body: JSON.stringify(data) }),

  // Platform-wide invoices
  listInvoices: (params?: { status?: string; tenantId?: number }) => {
    const qs = new URLSearchParams();
    if (params?.status && params.status !== "all") qs.set("status", params.status);
    if (params?.tenantId) qs.set("tenantId", String(params.tenantId));
    const q = qs.toString();
    return apiFetch<{ data: Invoice[]; total: number }>(`/platform/invoices${q ? `?${q}` : ""}`);
  },

  // Invoice operations
  getInvoice: (id: number) => apiFetch<InvoiceDetail>(`/platform/invoices/${id}`),
  updateInvoice: (id: number, data: Partial<Invoice>) =>
    apiFetch<Invoice>(`/platform/invoices/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  payInvoice: (id: number, data: RecordPaymentInput) =>
    apiFetch<{ ok: boolean; payment: Payment }>(`/platform/invoices/${id}/pay`, { method: "POST", body: JSON.stringify(data) }),
  voidInvoice: (id: number) =>
    apiFetch<{ ok: boolean }>(`/platform/invoices/${id}`, { method: "DELETE" }),

  // Tenant billing summary
  getTenantBillingSummary: (tenantId: number) =>
    apiFetch<BillingSummary>(`/platform/tenants/${tenantId}/billing-summary`),

  // Billing reports
  getBillingReports: () => apiFetch<BillingReport>("/platform/billing/reports"),

  // Enforce subscriptions
  enforceSubscriptions: () =>
    apiFetch<EnforceResult>("/platform/billing/enforce-subscriptions", { method: "POST" }),

  // Update tenant billing settings
  updateTenantBilling: (id: number, data: { billingCycle?: string; gracePeriodDays?: number }) =>
    apiFetch<Tenant>(`/platform/tenants/${id}/billing`, { method: "PATCH", body: JSON.stringify(data) }),
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
  offerText?: string; badgeText?: string; isFeatured: boolean; sortOrder: number;
  tenantCount?: number;
  createdAt: string; updatedAt: string;
}

export interface Tenant {
  id: number; slug: string; name: string;
  isActive: boolean; status: string;
  planId?: number | null; planName?: string | null; planType?: string | null;
  contactEmail?: string | null; industry?: string | null;
  website?: string | null; country?: string | null; notes?: string | null;
  billingCycle?: string; gracePeriodDays?: number;
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
  customPriceMonthly?: number | null; customPriceYearly?: number | null;
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

// ─── Billing Types ─────────────────────────────────────────────────────────────

export interface Invoice {
  id: number;
  tenantId: number;
  tenantName?: string;
  planId?: number | null;
  planName?: string | null;
  invoiceNumber: string;
  billingCycle: string;
  amountCents: number;
  currency: string;
  billingPeriodStart?: string | null;
  billingPeriodEnd?: string | null;
  dueDate?: string | null;
  status: string; // pending | paid | overdue | void | cancelled
  issuedAt: string;
  paidAt?: string | null;
  paymentMethod?: string | null;
  paymentReference?: string | null;
  notes?: string | null;
  createdAt: string;
}

export interface Payment {
  id: number;
  tenantId: number;
  invoiceId?: number | null;
  amountCents: number;
  currency: string;
  paymentDate: string;
  paymentMethod?: string | null;
  referenceNumber?: string | null;
  notes?: string | null;
  createdAt: string;
}

export interface InvoiceDetail extends Invoice {
  tenantSlug?: string;
  tenantContactEmail?: string | null;
  updatedAt: string;
  payments: Payment[];
}

export interface CreateInvoiceInput {
  billingCycle?: string;
  amountCents?: number;
  currency?: string;
  billingPeriodStart?: string;
  billingPeriodEnd?: string;
  dueDate?: string;
  notes?: string;
  planId?: number;
  autoGenerate?: boolean;
}

export interface RecordPaymentInput {
  paymentDate?: string;
  paymentMethod?: string;
  referenceNumber?: string;
  notes?: string;
  amountCents?: number;
}

export interface BillingSummary {
  tenant: {
    id: number; status: string; billingCycle: string;
    planId?: number | null; planName?: string | null;
    planPriceMonthly?: number | null; planPriceYearly?: number | null;
    subscriptionEndsAt?: string | null; gracePeriodDays: number;
  };
  stats: {
    totalInvoiced: number; totalPaid: number; totalOutstanding: number;
    totalOverdue: number; invoiceCount: number;
    overdueCount: number; pendingCount: number; paidCount: number;
  };
  gracePeriodInfo?: {
    isExpired: boolean; daysOverdue: number; isInGrace: boolean; gracePeriodDays: number;
  } | null;
  recentPayments: Payment[];
}

export interface BillingReport {
  overall: {
    totalInvoiced: number; totalCollected: number; totalOverdue: number;
    totalPending: number; invoiceCount: number; paidCount: number; overdueCount: number;
  };
  monthly: { month: string; invoiced: number; collected: number; count: number }[];
  byPlan: { planName: string; planType: string; invoiced: number; collected: number; count: number }[];
  topTenants: { tenantId: number; tenantName: string; tenantStatus: string; totalPaid: number; totalInvoiced: number }[];
}

export interface EnforceResult {
  ok: boolean;
  invoicesMarkedOverdue: number;
  tenantsSuspended: number;
  tenantsInGrace: number;
  suspendedIds: number[];
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

export function fmtMoney(cents: number, currency = "INR"): string {
  const amount = cents / 100;
  if (currency === "INR") {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 0 }).format(amount);
  }
  return new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 0 }).format(amount);
}

export function fmtDate(iso?: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
