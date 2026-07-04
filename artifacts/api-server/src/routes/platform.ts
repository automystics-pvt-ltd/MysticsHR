import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "../lib/db";
import {
  platformAdminsTable,
  tenantsTable,
  hrmsUsersTable,
  employeesTable,
  auditLogsTable,
  subscriptionPlansTable,
  tenantInvoicesTable,
  tenantPaymentsTable,
} from "@workspace/db/schema";
import { and, eq, sql, desc, ne, lt, lte, or, isNull } from "drizzle-orm";
import {
  signPlatformToken,
  setPlatformAuthCookie,
  clearPlatformAuthCookie,
  requirePlatformAdmin,
} from "../lib/auth";

const router = Router();

// ─── Whitelist & in-memory OTP store ──────────────────────────────────────────
// Add emails to PLATFORM_ADMIN_EMAILS env var (comma-separated) to grant access.
const PLATFORM_WHITELIST = new Set(
  (process.env.PLATFORM_ADMIN_EMAILS ?? "anandakumar.mani01@gmail.com,anandakumar.mani012@gmail.com")
    .split(",").map((e) => e.trim().toLowerCase()).filter(Boolean)
);

interface OtpEntry { otp: string; expires: Date; attempts: number }
const platformOtpStore = new Map<string, OtpEntry>();
const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const OTP_MAX_VERIFY_ATTEMPTS = 5;

function genOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function sendPlatformOtpEmail(to: string, otp: string): Promise<void> {
  console.log(`[Platform OTP] Code for ${to}: ${otp}`);
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) { console.warn("[Platform OTP] RESEND_API_KEY not set — OTP logged above only"); return; }
  const from = process.env.RESEND_FROM ?? "MysticsHR Platform <onboarding@resend.dev>";
  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from, to: [to],
        subject: "Your MysticsHR Platform Admin Login Code",
        html: `<div style="font-family:sans-serif;max-width:420px;margin:auto;padding:32px">
          <h2 style="font-size:18px;font-weight:600;margin-bottom:8px">Platform Admin Login</h2>
          <p style="color:#555;font-size:14px;margin-bottom:24px">Your one-time verification code:</p>
          <div style="font-size:40px;font-weight:700;letter-spacing:10px;text-align:center;padding:20px 24px;background:#f4f4f5;border-radius:10px;margin-bottom:24px">${otp}</div>
          <p style="color:#888;font-size:12px">Expires in 10 minutes. Never share this code.</p>
        </div>`,
      }),
    });
    if (!resp.ok) console.error("[Platform OTP] Resend error:", resp.status, await resp.text().catch(() => ""));
  } catch (e) { console.error("[Platform OTP] Resend fetch failed:", e); }
}

function safePlatformAdmin(admin: typeof platformAdminsTable.$inferSelect) {
  const { passwordHash: _, ...rest } = admin;
  return rest;
}

// ─── Platform Auth — OTP-based (whitelist only) ────────────────────────────────

/** Step 1: request a 6-digit OTP sent to a whitelisted email. */
router.post("/platform/auth/otp/request", async (req, res) => {
  try {
    const { email } = req.body as { email?: string };
    if (!email) { res.status(400).json({ error: "email is required" }); return; }
    const normalised = email.toLowerCase().trim();
    if (!PLATFORM_WHITELIST.has(normalised)) {
      res.status(403).json({ error: "This email is not authorised to access Platform Admin." });
      return;
    }
    const otp = genOtp();
    platformOtpStore.set(normalised, { otp, expires: new Date(Date.now() + OTP_EXPIRY_MS), attempts: 0 });
    await sendPlatformOtpEmail(normalised, otp);
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: "Internal server error" }); }
});

/** Step 2: verify the OTP and issue a session cookie. Auto-creates admin record on first login. */
router.post("/platform/auth/otp/verify", async (req, res) => {
  try {
    const { email, otp } = req.body as { email?: string; otp?: string };
    if (!email || !otp) { res.status(400).json({ error: "email and otp are required" }); return; }
    const normalised = email.toLowerCase().trim();
    if (!PLATFORM_WHITELIST.has(normalised)) {
      res.status(403).json({ error: "This email is not authorised." }); return;
    }
    const entry = platformOtpStore.get(normalised);
    if (!entry) { res.status(400).json({ error: "No OTP requested. Please request a new code." }); return; }
    if (entry.expires < new Date()) {
      platformOtpStore.delete(normalised);
      res.status(410).json({ error: "OTP has expired. Please request a new code." }); return;
    }
    entry.attempts++;
    if (entry.otp !== otp.trim()) {
      if (entry.attempts >= OTP_MAX_VERIFY_ATTEMPTS) {
        platformOtpStore.delete(normalised);
        res.status(429).json({ error: "Too many incorrect attempts. Please request a new code." }); return;
      }
      res.status(400).json({ error: "Incorrect verification code. Please try again." }); return;
    }
    platformOtpStore.delete(normalised);

    // Fetch or auto-create the platform admin record
    let [admin] = await db.select().from(platformAdminsTable)
      .where(eq(platformAdminsTable.email, normalised)).limit(1);
    if (!admin) {
      const name = normalised.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      // Placeholder hash (random — password login disabled)
      const placeholderHash = await bcrypt.hash(crypto.randomUUID(), 12);
      [admin] = await db.insert(platformAdminsTable)
        .values({ email: normalised, name, passwordHash: placeholderHash, isActive: true })
        .returning();
    }
    if (!admin.isActive) { res.status(403).json({ error: "Platform admin account is deactivated." }); return; }

    const token = signPlatformToken({ platformAdminId: admin.id, email: admin.email });
    setPlatformAuthCookie(res, token);
    res.json({ admin: safePlatformAdmin(admin) });
  } catch (err) { console.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.post("/platform/auth/logout", (_req, res) => {
  clearPlatformAuthCookie(res);
  res.json({ ok: true });
});

router.get("/platform/auth/me", requirePlatformAdmin, (req, res) => {
  res.json({ admin: safePlatformAdmin(req.platformAdmin!) });
});

// All routes below require platform admin
router.use("/platform", requirePlatformAdmin);

// ─── Subscription Plans ────────────────────────────────────────────────────────

router.get("/platform/subscription-plans", async (_req, res) => {
  try {
    const plans = await db.select({
      id: subscriptionPlansTable.id,
      name: subscriptionPlansTable.name,
      type: subscriptionPlansTable.type,
      priceMonthly: subscriptionPlansTable.priceMonthly,
      priceYearly: subscriptionPlansTable.priceYearly,
      maxUsers: subscriptionPlansTable.maxUsers,
      maxEmployees: subscriptionPlansTable.maxEmployees,
      maxBranches: subscriptionPlansTable.maxBranches,
      maxApiCalls: subscriptionPlansTable.maxApiCalls,
      enabledModules: subscriptionPlansTable.enabledModules,
      enabledFeatures: subscriptionPlansTable.enabledFeatures,
      description: subscriptionPlansTable.description,
      isActive: subscriptionPlansTable.isActive,
      createdAt: subscriptionPlansTable.createdAt,
      updatedAt: subscriptionPlansTable.updatedAt,
      tenantCount: sql<number>`(SELECT count(*)::int FROM tenants WHERE tenants.plan_id = ${subscriptionPlansTable.id})`,
    }).from(subscriptionPlansTable).orderBy(subscriptionPlansTable.priceMonthly);
    res.json({ data: plans, total: plans.length });
  } catch (err) { console.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.post("/platform/subscription-plans", async (req, res) => {
  try {
    const {
      name, type = "starter", priceMonthly = 0, priceYearly = 0,
      maxUsers = 10, maxEmployees = 50, maxBranches = 1, maxApiCalls = 10000,
      enabledModules = [], enabledFeatures = [], description,
      offerText, badgeText, isFeatured = false, sortOrder = 0,
    } = req.body as {
      name?: string; type?: string; priceMonthly?: number; priceYearly?: number;
      maxUsers?: number; maxEmployees?: number; maxBranches?: number; maxApiCalls?: number;
      enabledModules?: string[]; enabledFeatures?: string[]; description?: string;
      offerText?: string; badgeText?: string; isFeatured?: boolean; sortOrder?: number;
    };
    if (!name) { res.status(400).json({ error: "name is required" }); return; }
    const [plan] = await db.insert(subscriptionPlansTable).values({
      name: name.trim(), type, priceMonthly, priceYearly, maxUsers, maxEmployees,
      maxBranches, maxApiCalls, enabledModules, enabledFeatures, description,
      offerText, badgeText, isFeatured, sortOrder,
    }).returning();
    res.status(201).json(plan);
  } catch (err) { console.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.get("/platform/subscription-plans/:id", async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    const [plan] = await db.select().from(subscriptionPlansTable)
      .where(eq(subscriptionPlansTable.id, id)).limit(1);
    if (!plan) { res.status(404).json({ error: "Plan not found" }); return; }
    res.json(plan);
  } catch (err) { console.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.patch("/platform/subscription-plans/:id", async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    const allowed = ["name","type","priceMonthly","priceYearly","maxUsers","maxEmployees","maxBranches","maxApiCalls","enabledModules","enabledFeatures","description","isActive","offerText","badgeText","isFeatured","sortOrder"] as const;
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    const body = req.body as Record<string, unknown>;
    for (const key of allowed) if (key in body) updates[key] = body[key];
    if (typeof updates.name === "string") updates.name = (updates.name as string).trim();
    const [updated] = await db.update(subscriptionPlansTable).set(updates as never)
      .where(eq(subscriptionPlansTable.id, id)).returning();
    if (!updated) { res.status(404).json({ error: "Plan not found" }); return; }
    res.json(updated);
  } catch (err) { console.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.delete("/platform/subscription-plans/:id", async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    const [inUse] = await db.select({ id: tenantsTable.id }).from(tenantsTable)
      .where(eq(tenantsTable.planId, id)).limit(1);
    if (inUse) { res.status(409).json({ error: "Plan is assigned to one or more tenants. Reassign tenants before deleting." }); return; }
    await db.delete(subscriptionPlansTable).where(eq(subscriptionPlansTable.id, id));
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: "Internal server error" }); }
});

// ─── Tenants ───────────────────────────────────────────────────────────────────

router.get("/platform/tenants", async (req, res) => {
  try {
    const statusFilter = req.query.status as string | undefined;
    const where = statusFilter && statusFilter !== "all"
      ? eq(tenantsTable.status, statusFilter)
      : undefined;

    const tenants = await db.select({
      id: tenantsTable.id,
      slug: tenantsTable.slug,
      name: tenantsTable.name,
      isActive: tenantsTable.isActive,
      status: tenantsTable.status,
      planId: tenantsTable.planId,
      planName: subscriptionPlansTable.name,
      planType: subscriptionPlansTable.type,
      contactEmail: tenantsTable.contactEmail,
      industry: tenantsTable.industry,
      country: tenantsTable.country,
      website: tenantsTable.website,
      trialEndsAt: tenantsTable.trialEndsAt,
      subscriptionEndsAt: tenantsTable.subscriptionEndsAt,
      createdAt: tenantsTable.createdAt,
      updatedAt: tenantsTable.updatedAt,
      userCount: sql<number>`(SELECT count(*)::int FROM hrms_users WHERE hrms_users.tenant_id = ${tenantsTable.id})`,
      employeeCount: sql<number>`(SELECT count(*)::int FROM employees WHERE employees.tenant_id = ${tenantsTable.id})`,
    }).from(tenantsTable)
      .leftJoin(subscriptionPlansTable, eq(tenantsTable.planId, subscriptionPlansTable.id))
      .where(where)
      .orderBy(desc(tenantsTable.createdAt));

    res.json({ data: tenants, total: tenants.length });
  } catch (err) { console.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.post("/platform/tenants", async (req, res) => {
  try {
    const {
      name, slug, planId, status = "active",
      contactEmail, industry, website, country, notes,
      trialEndsAt, subscriptionStartsAt, subscriptionEndsAt,
    } = req.body as {
      name?: string; slug?: string; planId?: number; status?: string;
      contactEmail?: string; industry?: string; website?: string; country?: string;
      notes?: string; trialEndsAt?: string; subscriptionStartsAt?: string;
      subscriptionEndsAt?: string;
    };
    if (!name || !slug) { res.status(400).json({ error: "name and slug are required" }); return; }
    const normalizedSlug = slug.toLowerCase().trim().replace(/[^a-z0-9-]/g, "-");
    const [existing] = await db.select({ id: tenantsTable.id }).from(tenantsTable)
      .where(eq(tenantsTable.slug, normalizedSlug)).limit(1);
    if (existing) { res.status(409).json({ error: "A tenant with this slug already exists" }); return; }

    const isActive = status === "active" || status === "trial";
    const [tenant] = await db.insert(tenantsTable).values({
      name: name.trim(), slug: normalizedSlug, isActive, status,
      planId: planId ?? null, contactEmail: contactEmail ?? null,
      industry: industry ?? null, website: website ?? null,
      country: country ?? null, notes: notes ?? null,
      trialEndsAt: trialEndsAt ? new Date(trialEndsAt) : null,
      subscriptionStartsAt: subscriptionStartsAt ? new Date(subscriptionStartsAt) : null,
      subscriptionEndsAt: subscriptionEndsAt ? new Date(subscriptionEndsAt) : null,
    }).returning();
    res.status(201).json(tenant);
  } catch (err) { console.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.get("/platform/tenants/:id", async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    const [tenant] = await db.select({
      id: tenantsTable.id,
      slug: tenantsTable.slug,
      name: tenantsTable.name,
      isActive: tenantsTable.isActive,
      status: tenantsTable.status,
      planId: tenantsTable.planId,
      planName: subscriptionPlansTable.name,
      planType: subscriptionPlansTable.type,
      planMaxUsers: subscriptionPlansTable.maxUsers,
      planMaxEmployees: subscriptionPlansTable.maxEmployees,
      planMaxBranches: subscriptionPlansTable.maxBranches,
      planMaxApiCalls: subscriptionPlansTable.maxApiCalls,
      planEnabledModules: subscriptionPlansTable.enabledModules,
      planEnabledFeatures: subscriptionPlansTable.enabledFeatures,
      contactEmail: tenantsTable.contactEmail,
      industry: tenantsTable.industry,
      website: tenantsTable.website,
      country: tenantsTable.country,
      notes: tenantsTable.notes,
      trialEndsAt: tenantsTable.trialEndsAt,
      subscriptionStartsAt: tenantsTable.subscriptionStartsAt,
      subscriptionEndsAt: tenantsTable.subscriptionEndsAt,
      customMaxUsers: tenantsTable.customMaxUsers,
      customMaxEmployees: tenantsTable.customMaxEmployees,
      customMaxBranches: tenantsTable.customMaxBranches,
      customMaxApiCalls: tenantsTable.customMaxApiCalls,
      customPriceMonthly: tenantsTable.customPriceMonthly,
      customPriceYearly: tenantsTable.customPriceYearly,
      enabledModules: tenantsTable.enabledModules,
      enabledFeatures: tenantsTable.enabledFeatures,
      createdAt: tenantsTable.createdAt,
      updatedAt: tenantsTable.updatedAt,
      userCount: sql<number>`(SELECT count(*)::int FROM hrms_users WHERE hrms_users.tenant_id = ${tenantsTable.id})`,
      employeeCount: sql<number>`(SELECT count(*)::int FROM employees WHERE employees.tenant_id = ${tenantsTable.id})`,
      activeUserCount: sql<number>`(SELECT count(*)::int FROM hrms_users WHERE hrms_users.tenant_id = ${tenantsTable.id} AND hrms_users.is_active = true)`,
    }).from(tenantsTable)
      .leftJoin(subscriptionPlansTable, eq(tenantsTable.planId, subscriptionPlansTable.id))
      .where(eq(tenantsTable.id, id)).limit(1);
    if (!tenant) { res.status(404).json({ error: "Tenant not found" }); return; }
    res.json(tenant);
  } catch (err) { console.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.patch("/platform/tenants/:id", async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    const body = req.body as Record<string, unknown>;
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    const strFields = ["name","status","contactEmail","industry","website","country","notes"] as const;
    const numFields = ["planId","customMaxUsers","customMaxEmployees","customMaxBranches","customMaxApiCalls","customPriceMonthly","customPriceYearly"] as const;
    const tsFields = ["trialEndsAt","subscriptionStartsAt","subscriptionEndsAt"] as const;
    for (const f of strFields) if (f in body) updates[f] = body[f] === null ? null : String(body[f]).trim();
    for (const f of numFields) if (f in body) updates[f] = body[f] === null ? null : Number(body[f]);
    for (const f of tsFields) if (f in body) updates[f] = body[f] === null ? null : new Date(String(body[f]));
    if ("enabledModules" in body) updates.enabledModules = body.enabledModules;
    if ("enabledFeatures" in body) updates.enabledFeatures = body.enabledFeatures;
    // Sync isActive from status
    if ("status" in updates) {
      const s = updates.status as string;
      updates.isActive = s === "active" || s === "trial";
    }
    if ("isActive" in body && !("status" in updates)) updates.isActive = Boolean(body.isActive);
    const [updated] = await db.update(tenantsTable).set(updates as never)
      .where(eq(tenantsTable.id, id)).returning();
    if (!updated) { res.status(404).json({ error: "Tenant not found" }); return; }
    res.json(updated);
  } catch (err) { console.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.delete("/platform/tenants/:id", async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    const [updated] = await db.update(tenantsTable)
      .set({ status: "archived", isActive: false, updatedAt: new Date() })
      .where(eq(tenantsTable.id, id)).returning({ id: tenantsTable.id });
    if (!updated) { res.status(404).json({ error: "Tenant not found" }); return; }
    res.json({ ok: true, id: updated.id });
  } catch (err) { console.error(err); res.status(500).json({ error: "Internal server error" }); }
});

// ─── Tenant Config (modules, features, limits) ─────────────────────────────────

router.get("/platform/tenants/:id/config", async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    const [row] = await db.select({
      enabledModules: tenantsTable.enabledModules,
      enabledFeatures: tenantsTable.enabledFeatures,
      themeConfig: tenantsTable.themeConfig,
      customMaxUsers: tenantsTable.customMaxUsers,
      customMaxEmployees: tenantsTable.customMaxEmployees,
      customMaxBranches: tenantsTable.customMaxBranches,
      customMaxApiCalls: tenantsTable.customMaxApiCalls,
      planEnabledModules: subscriptionPlansTable.enabledModules,
      planEnabledFeatures: subscriptionPlansTable.enabledFeatures,
      planMaxUsers: subscriptionPlansTable.maxUsers,
      planMaxEmployees: subscriptionPlansTable.maxEmployees,
      planMaxBranches: subscriptionPlansTable.maxBranches,
      planMaxApiCalls: subscriptionPlansTable.maxApiCalls,
    }).from(tenantsTable)
      .leftJoin(subscriptionPlansTable, eq(tenantsTable.planId, subscriptionPlansTable.id))
      .where(eq(tenantsTable.id, id)).limit(1);
    if (!row) { res.status(404).json({ error: "Tenant not found" }); return; }
    res.json(row);
  } catch (err) { console.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.patch("/platform/tenants/:id/config", async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    const body = req.body as Record<string, unknown>;
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if ("enabledModules" in body) updates.enabledModules = body.enabledModules;
    if ("enabledFeatures" in body) updates.enabledFeatures = body.enabledFeatures;
    if ("customMaxUsers" in body) updates.customMaxUsers = body.customMaxUsers === null ? null : Number(body.customMaxUsers);
    if ("customMaxEmployees" in body) updates.customMaxEmployees = body.customMaxEmployees === null ? null : Number(body.customMaxEmployees);
    if ("customMaxBranches" in body) updates.customMaxBranches = body.customMaxBranches === null ? null : Number(body.customMaxBranches);
    if ("customMaxApiCalls" in body) updates.customMaxApiCalls = body.customMaxApiCalls === null ? null : Number(body.customMaxApiCalls);
    const [updated] = await db.update(tenantsTable).set(updates as never)
      .where(eq(tenantsTable.id, id)).returning();
    if (!updated) { res.status(404).json({ error: "Tenant not found" }); return; }
    res.json(updated);
  } catch (err) { console.error(err); res.status(500).json({ error: "Internal server error" }); }
});

// ─── Tenant Theme ──────────────────────────────────────────────────────────────

router.patch("/platform/tenants/:id/theme", async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    const { themeConfig } = req.body as { themeConfig: unknown };
    const [updated] = await db.update(tenantsTable)
      .set({ themeConfig: themeConfig as never, updatedAt: new Date() })
      .where(eq(tenantsTable.id, id))
      .returning({ id: tenantsTable.id, themeConfig: tenantsTable.themeConfig });
    if (!updated) { res.status(404).json({ error: "Tenant not found" }); return; }
    res.json({ ok: true, themeConfig: updated.themeConfig });
  } catch (err) { console.error(err); res.status(500).json({ error: "Internal server error" }); }
});

// ─── Tenant Health ─────────────────────────────────────────────────────────────

router.get("/platform/tenants/:id/health", async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    const [userStats] = await db.select({
      total: sql<number>`count(*)::int`,
      active: sql<number>`sum(case when is_active then 1 else 0 end)::int`,
    }).from(hrmsUsersTable).where(eq(hrmsUsersTable.tenantId, id));

    const [empStats] = await db.select({
      total: sql<number>`count(*)::int`,
      active: sql<number>`sum(case when status = 'Active' then 1 else 0 end)::int`,
    }).from(employeesTable).where(eq(employeesTable.tenantId, id));

    const recentAuditLogs = await db.select({
      id: auditLogsTable.id,
      action: auditLogsTable.action,
      module: auditLogsTable.module,
      userEmail: auditLogsTable.userEmail,
      createdAt: auditLogsTable.createdAt,
    }).from(auditLogsTable)
      .where(eq(auditLogsTable.tenantId, id))
      .orderBy(desc(auditLogsTable.createdAt))
      .limit(10);

    const roleBreakdown = await db.select({
      role: hrmsUsersTable.role,
      count: sql<number>`count(*)::int`,
    }).from(hrmsUsersTable)
      .where(eq(hrmsUsersTable.tenantId, id))
      .groupBy(hrmsUsersTable.role);

    res.json({
      users: { total: userStats?.total ?? 0, active: userStats?.active ?? 0 },
      employees: { total: empStats?.total ?? 0, active: empStats?.active ?? 0 },
      roleBreakdown,
      recentActivity: recentAuditLogs,
    });
  } catch (err) { console.error(err); res.status(500).json({ error: "Internal server error" }); }
});

// ─── Tenant Users ──────────────────────────────────────────────────────────────

router.get("/platform/tenants/:id/users", async (req, res) => {
  try {
    const tenantId = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(tenantId)) { res.status(400).json({ error: "Invalid tenant id" }); return; }
    const users = await db.select({
      id: hrmsUsersTable.id,
      email: hrmsUsersTable.email,
      name: hrmsUsersTable.name,
      role: hrmsUsersTable.role,
      isActive: hrmsUsersTable.isActive,
      createdAt: hrmsUsersTable.createdAt,
    }).from(hrmsUsersTable)
      .where(eq(hrmsUsersTable.tenantId, tenantId))
      .orderBy(desc(hrmsUsersTable.createdAt));
    res.json({ data: users, total: users.length });
  } catch (err) { console.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.post("/platform/tenants/:id/users", async (req, res) => {
  try {
    const tenantId = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(tenantId)) { res.status(400).json({ error: "Invalid tenant id" }); return; }
    const [tenant] = await db.select({ id: tenantsTable.id }).from(tenantsTable)
      .where(and(eq(tenantsTable.id, tenantId), eq(tenantsTable.isActive, true))).limit(1);
    if (!tenant) { res.status(404).json({ error: "Tenant not found or inactive" }); return; }
    const { email, name, password, role = "customer_admin" } = req.body as {
      email?: string; name?: string; password?: string; role?: string;
    };
    if (!email || !name || !password) { res.status(400).json({ error: "email, name, and password are required" }); return; }
    if (password.length < 8) { res.status(400).json({ error: "Password must be at least 8 characters" }); return; }
    const normalizedEmail = email.toLowerCase().trim();
    const [existing] = await db.select({ id: hrmsUsersTable.id }).from(hrmsUsersTable)
      .where(and(eq(hrmsUsersTable.email, normalizedEmail), eq(hrmsUsersTable.tenantId, tenantId))).limit(1);
    if (existing) { res.status(409).json({ error: "A user with this email already exists in this tenant" }); return; }
    const passwordHash = await bcrypt.hash(password, 12);
    const [created] = await db.insert(hrmsUsersTable).values({
      tenantId, email: normalizedEmail, name: name.trim(),
      role: role as typeof hrmsUsersTable.$inferInsert["role"],
      passwordHash, isActive: true,
    }).returning();
    const { passwordHash: _, ...safeUser } = created;
    res.status(201).json(safeUser);
  } catch (err) { console.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.patch("/platform/tenants/:tenantId/users/:userId", async (req, res) => {
  try {
    const tenantId = Number.parseInt(req.params.tenantId, 10);
    const userId = Number.parseInt(req.params.userId, 10);
    if (!Number.isFinite(tenantId) || !Number.isFinite(userId)) { res.status(400).json({ error: "Invalid id" }); return; }
    const { isActive, role } = req.body as { isActive?: boolean; role?: string };
    const updates: Record<string, unknown> = {};
    if (isActive !== undefined) updates.isActive = Boolean(isActive);
    if (role !== undefined) updates.role = role;
    const [updated] = await db.update(hrmsUsersTable).set(updates as never)
      .where(and(eq(hrmsUsersTable.id, userId), eq(hrmsUsersTable.tenantId, tenantId))).returning();
    if (!updated) { res.status(404).json({ error: "User not found" }); return; }
    const { passwordHash: _, ...safeUser } = updated;
    res.json(safeUser);
  } catch (err) { console.error(err); res.status(500).json({ error: "Internal server error" }); }
});

// ─── Tenant User — Reset Password ─────────────────────────────────────────────

router.post("/platform/tenants/:tenantId/users/:userId/reset-password", async (req, res) => {
  try {
    const tenantId = Number.parseInt(req.params.tenantId, 10);
    const userId = Number.parseInt(req.params.userId, 10);
    if (!Number.isFinite(tenantId) || !Number.isFinite(userId)) {
      res.status(400).json({ error: "Invalid id" }); return;
    }
    const { newPassword } = req.body as { newPassword?: string };
    const CHARS = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789@#$!";
    const plain = newPassword?.trim() ||
      Array.from({ length: 12 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join("");
    if (plain.length < 8) { res.status(400).json({ error: "Password must be at least 8 characters" }); return; }
    const passwordHash = await bcrypt.hash(plain, 12);
    const [updated] = await db.update(hrmsUsersTable)
      .set({ passwordHash, updatedAt: new Date() })
      .where(and(eq(hrmsUsersTable.id, userId), eq(hrmsUsersTable.tenantId, tenantId)))
      .returning({ id: hrmsUsersTable.id, email: hrmsUsersTable.email, name: hrmsUsersTable.name });
    if (!updated) { res.status(404).json({ error: "User not found" }); return; }
    res.json({ ok: true, newPassword: plain, user: updated });
  } catch (err) { console.error(err); res.status(500).json({ error: "Internal server error" }); }
});

// ─── Platform Admins ───────────────────────────────────────────────────────────

router.get("/platform/admins", async (_req, res) => {
  try {
    const admins = await db.select({
      id: platformAdminsTable.id, email: platformAdminsTable.email,
      name: platformAdminsTable.name, isActive: platformAdminsTable.isActive,
      createdAt: platformAdminsTable.createdAt, updatedAt: platformAdminsTable.updatedAt,
    }).from(platformAdminsTable).orderBy(desc(platformAdminsTable.createdAt));
    res.json({ data: admins, total: admins.length });
  } catch (err) { console.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.post("/platform/admins", async (req, res) => {
  try {
    const { email, name, password } = req.body as { email?: string; name?: string; password?: string };
    if (!email || !name || !password) { res.status(400).json({ error: "email, name, and password are required" }); return; }
    if (password.length < 8) { res.status(400).json({ error: "Password must be at least 8 characters" }); return; }
    const [existing] = await db.select({ id: platformAdminsTable.id }).from(platformAdminsTable)
      .where(eq(platformAdminsTable.email, email.toLowerCase().trim())).limit(1);
    if (existing) { res.status(409).json({ error: "A platform admin with this email already exists" }); return; }
    const passwordHash = await bcrypt.hash(password, 12);
    const [created] = await db.insert(platformAdminsTable)
      .values({ email: email.toLowerCase().trim(), name: name.trim(), passwordHash, isActive: true }).returning();
    res.status(201).json(safePlatformAdmin(created));
  } catch (err) { console.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.patch("/platform/admins/:id", async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    const { name, isActive, password } = req.body as { name?: string; isActive?: boolean; password?: string };
    const updates: Partial<{ name: string; isActive: boolean; passwordHash: string; updatedAt: Date }> = { updatedAt: new Date() };
    if (name !== undefined) updates.name = name.trim();
    if (isActive !== undefined) updates.isActive = Boolean(isActive);
    if (password) {
      if (password.length < 8) { res.status(400).json({ error: "Password must be at least 8 characters" }); return; }
      updates.passwordHash = await bcrypt.hash(password, 12);
    }
    const [updated] = await db.update(platformAdminsTable).set(updates)
      .where(eq(platformAdminsTable.id, id)).returning();
    if (!updated) { res.status(404).json({ error: "Platform admin not found" }); return; }
    res.json(safePlatformAdmin(updated));
  } catch (err) { console.error(err); res.status(500).json({ error: "Internal server error" }); }
});

// ─── Analytics ─────────────────────────────────────────────────────────────────

router.get("/platform/analytics", async (_req, res) => {
  try {
    const [tenantStats] = await db.select({
      total: sql<number>`count(*)::int`,
      active: sql<number>`sum(case when status = 'active' then 1 else 0 end)::int`,
      trial: sql<number>`sum(case when status = 'trial' then 1 else 0 end)::int`,
      suspended: sql<number>`sum(case when status = 'suspended' then 1 else 0 end)::int`,
      archived: sql<number>`sum(case when status = 'archived' then 1 else 0 end)::int`,
    }).from(tenantsTable);

    const [userStats] = await db.select({
      total: sql<number>`count(*)::int`,
      active: sql<number>`sum(case when is_active then 1 else 0 end)::int`,
    }).from(hrmsUsersTable);

    const [employeeStats] = await db.select({ total: sql<number>`count(*)::int` }).from(employeesTable);
    const [platformAdminStats] = await db.select({ total: sql<number>`count(*)::int` }).from(platformAdminsTable);

    const planDist = await db.select({
      planName: subscriptionPlansTable.name,
      planType: subscriptionPlansTable.type,
      count: sql<number>`count(tenants.id)::int`,
    }).from(subscriptionPlansTable)
      .leftJoin(tenantsTable, and(eq(tenantsTable.planId, subscriptionPlansTable.id), ne(tenantsTable.status, "archived")))
      .groupBy(subscriptionPlansTable.id, subscriptionPlansTable.name, subscriptionPlansTable.type)
      .orderBy(subscriptionPlansTable.priceMonthly);

    const noPlanCount = await db.select({ count: sql<number>`count(*)::int` }).from(tenantsTable)
      .where(and(sql`plan_id IS NULL`, ne(tenantsTable.status, "archived")));

    const recentTenants = await db.select({
      id: tenantsTable.id,
      name: tenantsTable.name,
      status: tenantsTable.status,
      planName: subscriptionPlansTable.name,
      createdAt: tenantsTable.createdAt,
    }).from(tenantsTable)
      .leftJoin(subscriptionPlansTable, eq(tenantsTable.planId, subscriptionPlansTable.id))
      .orderBy(desc(tenantsTable.createdAt)).limit(5);

    res.json({
      tenants: {
        total: tenantStats?.total ?? 0,
        active: tenantStats?.active ?? 0,
        trial: tenantStats?.trial ?? 0,
        suspended: tenantStats?.suspended ?? 0,
        archived: tenantStats?.archived ?? 0,
      },
      hrmsUsers: { total: userStats?.total ?? 0, active: userStats?.active ?? 0 },
      employees: { total: employeeStats?.total ?? 0 },
      platformAdmins: { total: platformAdminStats?.total ?? 0 },
      planDistribution: [
        ...planDist,
        { planName: "No Plan", planType: "none", count: noPlanCount[0]?.count ?? 0 },
      ].filter((p) => (p.count ?? 0) > 0),
      recentTenants,
    });
  } catch (err) { console.error(err); res.status(500).json({ error: "Internal server error" }); }
});

// ─── Audit Logs (cross-tenant) ─────────────────────────────────────────────────

router.get("/platform/audit-logs", async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    const tenantId = req.query.tenantId ? Number(req.query.tenantId) : undefined;
    const where = tenantId ? eq(auditLogsTable.tenantId, tenantId) : undefined;
    const [{ count }] = await db.select({ count: sql<number>`count(*)::int` })
      .from(auditLogsTable).where(where);
    const logs = await db.select().from(auditLogsTable).where(where)
      .orderBy(desc(auditLogsTable.createdAt)).limit(limit).offset(offset);
    res.json({ data: logs, total: count ?? 0, limit, offset });
  } catch (err) { console.error(err); res.status(500).json({ error: "Internal server error" }); }
});

// ─── Billing Helpers ───────────────────────────────────────────────────────────

async function genInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const [{ c }] = await db.select({ c: sql<number>`count(*)::int` })
    .from(tenantInvoicesTable)
    .where(sql`extract(year from created_at) = ${year}`);
  return `INV-${year}-${String((c ?? 0) + 1).padStart(5, "0")}`;
}

function fmtCents(cents: number) { return cents; }

// ─── Platform-wide Invoices ────────────────────────────────────────────────────

router.get("/platform/invoices", async (req, res) => {
  try {
    const statusFilter = req.query.status as string | undefined;
    const tenantIdFilter = req.query.tenantId ? Number(req.query.tenantId) : undefined;
    const conditions = [];
    if (statusFilter && statusFilter !== "all") conditions.push(eq(tenantInvoicesTable.status, statusFilter));
    if (tenantIdFilter) conditions.push(eq(tenantInvoicesTable.tenantId, tenantIdFilter));
    const invoices = await db.select({
      id: tenantInvoicesTable.id,
      tenantId: tenantInvoicesTable.tenantId,
      tenantName: tenantsTable.name,
      planId: tenantInvoicesTable.planId,
      planName: subscriptionPlansTable.name,
      invoiceNumber: tenantInvoicesTable.invoiceNumber,
      billingCycle: tenantInvoicesTable.billingCycle,
      amountCents: tenantInvoicesTable.amountCents,
      currency: tenantInvoicesTable.currency,
      billingPeriodStart: tenantInvoicesTable.billingPeriodStart,
      billingPeriodEnd: tenantInvoicesTable.billingPeriodEnd,
      dueDate: tenantInvoicesTable.dueDate,
      status: tenantInvoicesTable.status,
      issuedAt: tenantInvoicesTable.issuedAt,
      paidAt: tenantInvoicesTable.paidAt,
      paymentMethod: tenantInvoicesTable.paymentMethod,
      paymentReference: tenantInvoicesTable.paymentReference,
      notes: tenantInvoicesTable.notes,
      createdAt: tenantInvoicesTable.createdAt,
    }).from(tenantInvoicesTable)
      .leftJoin(tenantsTable, eq(tenantInvoicesTable.tenantId, tenantsTable.id))
      .leftJoin(subscriptionPlansTable, eq(tenantInvoicesTable.planId, subscriptionPlansTable.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(tenantInvoicesTable.createdAt));
    res.json({ data: invoices, total: invoices.length });
  } catch (err) { console.error(err); res.status(500).json({ error: "Internal server error" }); }
});

// ─── Tenant Invoices ───────────────────────────────────────────────────────────

router.get("/platform/tenants/:id/invoices", async (req, res) => {
  try {
    const tenantId = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(tenantId)) { res.status(400).json({ error: "Invalid id" }); return; }
    const invoices = await db.select({
      id: tenantInvoicesTable.id,
      tenantId: tenantInvoicesTable.tenantId,
      planId: tenantInvoicesTable.planId,
      planName: subscriptionPlansTable.name,
      invoiceNumber: tenantInvoicesTable.invoiceNumber,
      billingCycle: tenantInvoicesTable.billingCycle,
      amountCents: tenantInvoicesTable.amountCents,
      currency: tenantInvoicesTable.currency,
      billingPeriodStart: tenantInvoicesTable.billingPeriodStart,
      billingPeriodEnd: tenantInvoicesTable.billingPeriodEnd,
      dueDate: tenantInvoicesTable.dueDate,
      status: tenantInvoicesTable.status,
      issuedAt: tenantInvoicesTable.issuedAt,
      paidAt: tenantInvoicesTable.paidAt,
      paymentMethod: tenantInvoicesTable.paymentMethod,
      paymentReference: tenantInvoicesTable.paymentReference,
      notes: tenantInvoicesTable.notes,
      createdAt: tenantInvoicesTable.createdAt,
    }).from(tenantInvoicesTable)
      .leftJoin(subscriptionPlansTable, eq(tenantInvoicesTable.planId, subscriptionPlansTable.id))
      .where(eq(tenantInvoicesTable.tenantId, tenantId))
      .orderBy(desc(tenantInvoicesTable.createdAt));
    res.json({ data: invoices, total: invoices.length });
  } catch (err) { console.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.post("/platform/tenants/:id/invoices", async (req, res) => {
  try {
    const tenantId = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(tenantId)) { res.status(400).json({ error: "Invalid id" }); return; }
    const [tenant] = await db.select({
      id: tenantsTable.id, planId: tenantsTable.planId, billingCycle: tenantsTable.billingCycle,
    }).from(tenantsTable).where(eq(tenantsTable.id, tenantId)).limit(1);
    if (!tenant) { res.status(404).json({ error: "Tenant not found" }); return; }

    const {
      billingCycle, amountCents, currency = "INR",
      billingPeriodStart, billingPeriodEnd, dueDate, notes, planId, autoGenerate = false,
    } = req.body as {
      billingCycle?: string; amountCents?: number; currency?: string;
      billingPeriodStart?: string; billingPeriodEnd?: string; dueDate?: string;
      notes?: string; planId?: number; autoGenerate?: boolean;
    };

    const cycle = billingCycle ?? tenant.billingCycle ?? "monthly";
    const finalPlanId = planId ?? tenant.planId ?? null;
    let finalAmount = amountCents;

    if (autoGenerate && finalPlanId) {
      const [plan] = await db.select().from(subscriptionPlansTable)
        .where(eq(subscriptionPlansTable.id, finalPlanId)).limit(1);
      if (plan) finalAmount = cycle === "yearly" ? plan.priceYearly : plan.priceMonthly;
    }
    if (finalAmount == null) { res.status(400).json({ error: "amountCents is required (or use autoGenerate=true with a plan)" }); return; }

    const today = new Date().toISOString().split("T")[0];
    const start = billingPeriodStart ?? today;
    let end = billingPeriodEnd;
    let due = dueDate;
    if (!end) {
      const d = new Date(start);
      if (cycle === "yearly") { d.setFullYear(d.getFullYear() + 1); d.setDate(d.getDate() - 1); }
      else { d.setMonth(d.getMonth() + 1); d.setDate(d.getDate() - 1); }
      end = d.toISOString().split("T")[0];
    }
    if (!due) {
      const d = new Date(start); d.setDate(d.getDate() + 30);
      due = d.toISOString().split("T")[0];
    }

    const invoiceNumber = await genInvoiceNumber();
    const [invoice] = await db.insert(tenantInvoicesTable).values({
      tenantId, planId: finalPlanId, invoiceNumber, billingCycle: cycle,
      amountCents: finalAmount, currency, billingPeriodStart: start, billingPeriodEnd: end,
      dueDate: due, status: "pending", notes: notes ?? null,
    }).returning();
    res.status(201).json(invoice);
  } catch (err) { console.error(err); res.status(500).json({ error: "Internal server error" }); }
});

// ─── Invoice Detail, Update, Pay, Void ────────────────────────────────────────

router.get("/platform/invoices/:id", async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    const [invoice] = await db.select({
      id: tenantInvoicesTable.id,
      tenantId: tenantInvoicesTable.tenantId,
      tenantName: tenantsTable.name,
      tenantSlug: tenantsTable.slug,
      tenantContactEmail: tenantsTable.contactEmail,
      planId: tenantInvoicesTable.planId,
      planName: subscriptionPlansTable.name,
      invoiceNumber: tenantInvoicesTable.invoiceNumber,
      billingCycle: tenantInvoicesTable.billingCycle,
      amountCents: tenantInvoicesTable.amountCents,
      currency: tenantInvoicesTable.currency,
      billingPeriodStart: tenantInvoicesTable.billingPeriodStart,
      billingPeriodEnd: tenantInvoicesTable.billingPeriodEnd,
      dueDate: tenantInvoicesTable.dueDate,
      status: tenantInvoicesTable.status,
      issuedAt: tenantInvoicesTable.issuedAt,
      paidAt: tenantInvoicesTable.paidAt,
      paymentMethod: tenantInvoicesTable.paymentMethod,
      paymentReference: tenantInvoicesTable.paymentReference,
      notes: tenantInvoicesTable.notes,
      createdAt: tenantInvoicesTable.createdAt,
      updatedAt: tenantInvoicesTable.updatedAt,
    }).from(tenantInvoicesTable)
      .leftJoin(tenantsTable, eq(tenantInvoicesTable.tenantId, tenantsTable.id))
      .leftJoin(subscriptionPlansTable, eq(tenantInvoicesTable.planId, subscriptionPlansTable.id))
      .where(eq(tenantInvoicesTable.id, id)).limit(1);
    if (!invoice) { res.status(404).json({ error: "Invoice not found" }); return; }
    const payments = await db.select().from(tenantPaymentsTable)
      .where(eq(tenantPaymentsTable.invoiceId, id))
      .orderBy(desc(tenantPaymentsTable.createdAt));
    res.json({ ...invoice, payments });
  } catch (err) { console.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.patch("/platform/invoices/:id", async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    const body = req.body as Record<string, unknown>;
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    const textFields = ["status","currency","billingPeriodStart","billingPeriodEnd","dueDate","paymentMethod","paymentReference","notes","billingCycle"] as const;
    for (const f of textFields) if (f in body) updates[f] = body[f] === null ? null : String(body[f]);
    if ("amountCents" in body) updates.amountCents = Number(body.amountCents);
    const [updated] = await db.update(tenantInvoicesTable).set(updates as never)
      .where(eq(tenantInvoicesTable.id, id)).returning();
    if (!updated) { res.status(404).json({ error: "Invoice not found" }); return; }
    res.json(updated);
  } catch (err) { console.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.post("/platform/invoices/:id/pay", async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    const [invoice] = await db.select().from(tenantInvoicesTable)
      .where(eq(tenantInvoicesTable.id, id)).limit(1);
    if (!invoice) { res.status(404).json({ error: "Invoice not found" }); return; }
    if (invoice.status === "paid") { res.status(409).json({ error: "Invoice is already paid" }); return; }
    if (invoice.status === "void") { res.status(409).json({ error: "Cannot pay a voided invoice" }); return; }

    const {
      paymentDate, paymentMethod = "Bank Transfer", referenceNumber, notes, amountCents,
    } = req.body as {
      paymentDate?: string; paymentMethod?: string; referenceNumber?: string;
      notes?: string; amountCents?: number;
    };
    const today = new Date().toISOString().split("T")[0];
    const paidAmountCents = amountCents ?? invoice.amountCents;

    // Record payment
    const [payment] = await db.insert(tenantPaymentsTable).values({
      tenantId: invoice.tenantId,
      invoiceId: invoice.id,
      amountCents: paidAmountCents,
      currency: invoice.currency,
      paymentDate: paymentDate ?? today,
      paymentMethod,
      referenceNumber: referenceNumber ?? null,
      notes: notes ?? null,
    }).returning();

    // Mark invoice paid
    const now = new Date();
    await db.update(tenantInvoicesTable).set({
      status: "paid",
      paidAt: now,
      paymentMethod,
      paymentReference: referenceNumber ?? null,
      updatedAt: now,
    }).where(eq(tenantInvoicesTable.id, id));

    // Restore tenant if suspended/overdue — check for any remaining overdue invoices
    const [overdueCount] = await db.select({ c: sql<number>`count(*)::int` })
      .from(tenantInvoicesTable)
      .where(and(
        eq(tenantInvoicesTable.tenantId, invoice.tenantId),
        eq(tenantInvoicesTable.status, "overdue"),
      ));
    const [tenant] = await db.select({ status: tenantsTable.status, billingCycle: tenantsTable.billingCycle })
      .from(tenantsTable).where(eq(tenantsTable.id, invoice.tenantId)).limit(1);

    if (tenant && tenant.status === "suspended" && (overdueCount?.c ?? 0) === 0) {
      // Extend subscription and restore
      const cycle = tenant.billingCycle ?? "monthly";
      const newEnd = new Date();
      if (cycle === "yearly") newEnd.setFullYear(newEnd.getFullYear() + 1);
      else newEnd.setMonth(newEnd.getMonth() + 1);
      await db.update(tenantsTable).set({
        status: "active", isActive: true,
        subscriptionEndsAt: newEnd, updatedAt: new Date(),
      }).where(eq(tenantsTable.id, invoice.tenantId));
    }

    res.json({ ok: true, payment });
  } catch (err) { console.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.delete("/platform/invoices/:id", async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    const [invoice] = await db.select({ status: tenantInvoicesTable.status })
      .from(tenantInvoicesTable).where(eq(tenantInvoicesTable.id, id)).limit(1);
    if (!invoice) { res.status(404).json({ error: "Invoice not found" }); return; }
    if (invoice.status === "paid") { res.status(409).json({ error: "Cannot void a paid invoice" }); return; }
    await db.update(tenantInvoicesTable).set({ status: "void", updatedAt: new Date() })
      .where(eq(tenantInvoicesTable.id, id));
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: "Internal server error" }); }
});

// ─── Tenant Billing Summary ────────────────────────────────────────────────────

router.get("/platform/tenants/:id/billing-summary", async (req, res) => {
  try {
    const tenantId = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(tenantId)) { res.status(400).json({ error: "Invalid id" }); return; }
    const [tenant] = await db.select({
      id: tenantsTable.id, status: tenantsTable.status,
      subscriptionEndsAt: tenantsTable.subscriptionEndsAt,
      gracePeriodDays: tenantsTable.gracePeriodDays,
      billingCycle: tenantsTable.billingCycle,
      planId: tenantsTable.planId,
      planName: subscriptionPlansTable.name,
      planPriceMonthly: subscriptionPlansTable.priceMonthly,
      planPriceYearly: subscriptionPlansTable.priceYearly,
    }).from(tenantsTable)
      .leftJoin(subscriptionPlansTable, eq(tenantsTable.planId, subscriptionPlansTable.id))
      .where(eq(tenantsTable.id, tenantId)).limit(1);
    if (!tenant) { res.status(404).json({ error: "Tenant not found" }); return; }

    const [stats] = await db.select({
      totalInvoiced: sql<number>`coalesce(sum(amount_cents), 0)::int`,
      totalPaid: sql<number>`coalesce(sum(case when status = 'paid' then amount_cents else 0 end), 0)::int`,
      totalOverdue: sql<number>`coalesce(sum(case when status = 'overdue' then amount_cents else 0 end), 0)::int`,
      invoiceCount: sql<number>`count(*)::int`,
      overdueCount: sql<number>`sum(case when status = 'overdue' then 1 else 0 end)::int`,
      pendingCount: sql<number>`sum(case when status = 'pending' then 1 else 0 end)::int`,
      paidCount: sql<number>`sum(case when status = 'paid' then 1 else 0 end)::int`,
    }).from(tenantInvoicesTable)
      .where(and(eq(tenantInvoicesTable.tenantId, tenantId), ne(tenantInvoicesTable.status, "void")));

    const recentPayments = await db.select().from(tenantPaymentsTable)
      .where(eq(tenantPaymentsTable.tenantId, tenantId))
      .orderBy(desc(tenantPaymentsTable.createdAt)).limit(5);

    // Grace period info
    const now = new Date();
    let gracePeriodInfo: { isExpired: boolean; daysOverdue: number; isInGrace: boolean; gracePeriodDays: number } | null = null;
    if (tenant.subscriptionEndsAt) {
      const endDate = new Date(tenant.subscriptionEndsAt);
      const daysOverdue = Math.floor((now.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24));
      gracePeriodInfo = {
        isExpired: daysOverdue > 0,
        daysOverdue: Math.max(0, daysOverdue),
        isInGrace: daysOverdue > 0 && daysOverdue <= (tenant.gracePeriodDays ?? 7),
        gracePeriodDays: tenant.gracePeriodDays ?? 7,
      };
    }

    res.json({
      tenant: {
        id: tenant.id, status: tenant.status, billingCycle: tenant.billingCycle,
        planId: tenant.planId, planName: tenant.planName,
        planPriceMonthly: tenant.planPriceMonthly, planPriceYearly: tenant.planPriceYearly,
        subscriptionEndsAt: tenant.subscriptionEndsAt, gracePeriodDays: tenant.gracePeriodDays,
      },
      stats: {
        totalInvoiced: stats?.totalInvoiced ?? 0,
        totalPaid: stats?.totalPaid ?? 0,
        totalOutstanding: (stats?.totalInvoiced ?? 0) - (stats?.totalPaid ?? 0),
        totalOverdue: stats?.totalOverdue ?? 0,
        invoiceCount: stats?.invoiceCount ?? 0,
        overdueCount: stats?.overdueCount ?? 0,
        pendingCount: stats?.pendingCount ?? 0,
        paidCount: stats?.paidCount ?? 0,
      },
      gracePeriodInfo,
      recentPayments,
    });
  } catch (err) { console.error(err); res.status(500).json({ error: "Internal server error" }); }
});

// ─── Billing Reports ───────────────────────────────────────────────────────────

router.get("/platform/billing/reports", async (_req, res) => {
  try {
    // Overall stats
    const [overall] = await db.select({
      totalInvoiced: sql<number>`coalesce(sum(amount_cents), 0)::int`,
      totalCollected: sql<number>`coalesce(sum(case when status = 'paid' then amount_cents else 0 end), 0)::int`,
      totalOverdue: sql<number>`coalesce(sum(case when status = 'overdue' then amount_cents else 0 end), 0)::int`,
      totalPending: sql<number>`coalesce(sum(case when status = 'pending' then amount_cents else 0 end), 0)::int`,
      invoiceCount: sql<number>`count(*)::int`,
      paidCount: sql<number>`sum(case when status = 'paid' then 1 else 0 end)::int`,
      overdueCount: sql<number>`sum(case when status = 'overdue' then 1 else 0 end)::int`,
    }).from(tenantInvoicesTable).where(ne(tenantInvoicesTable.status, "void"));

    // Monthly revenue (last 12 months)
    const monthly = await db.select({
      month: sql<string>`to_char(date_trunc('month', issued_at), 'YYYY-MM')`,
      invoiced: sql<number>`coalesce(sum(amount_cents), 0)::int`,
      collected: sql<number>`coalesce(sum(case when status = 'paid' then amount_cents else 0 end), 0)::int`,
      count: sql<number>`count(*)::int`,
    }).from(tenantInvoicesTable)
      .where(and(
        ne(tenantInvoicesTable.status, "void"),
        sql`issued_at >= now() - interval '12 months'`,
      ))
      .groupBy(sql`date_trunc('month', issued_at)`)
      .orderBy(sql`date_trunc('month', issued_at)`);

    // Revenue by plan
    const byPlan = await db.select({
      planName: subscriptionPlansTable.name,
      planType: subscriptionPlansTable.type,
      invoiced: sql<number>`coalesce(sum(tenant_invoices.amount_cents), 0)::int`,
      collected: sql<number>`coalesce(sum(case when tenant_invoices.status = 'paid' then tenant_invoices.amount_cents else 0 end), 0)::int`,
      count: sql<number>`count(tenant_invoices.id)::int`,
    }).from(subscriptionPlansTable)
      .leftJoin(tenantInvoicesTable, and(
        eq(tenantInvoicesTable.planId, subscriptionPlansTable.id),
        ne(tenantInvoicesTable.status, "void"),
      ))
      .groupBy(subscriptionPlansTable.id, subscriptionPlansTable.name, subscriptionPlansTable.type)
      .orderBy(desc(sql`coalesce(sum(tenant_invoices.amount_cents), 0)`));

    // Top tenants by revenue
    const topTenants = await db.select({
      tenantId: tenantsTable.id,
      tenantName: tenantsTable.name,
      tenantStatus: tenantsTable.status,
      totalPaid: sql<number>`coalesce(sum(case when tenant_invoices.status = 'paid' then tenant_invoices.amount_cents else 0 end), 0)::int`,
      totalInvoiced: sql<number>`coalesce(sum(tenant_invoices.amount_cents), 0)::int`,
    }).from(tenantsTable)
      .leftJoin(tenantInvoicesTable, and(
        eq(tenantInvoicesTable.tenantId, tenantsTable.id),
        ne(tenantInvoicesTable.status, "void"),
      ))
      .groupBy(tenantsTable.id, tenantsTable.name, tenantsTable.status)
      .orderBy(desc(sql`coalesce(sum(case when tenant_invoices.status = 'paid' then tenant_invoices.amount_cents else 0 end), 0)`))
      .limit(10);

    res.json({ overall, monthly, byPlan, topTenants });
  } catch (err) { console.error(err); res.status(500).json({ error: "Internal server error" }); }
});

// ─── Enforce Subscription Rules ────────────────────────────────────────────────

router.post("/platform/billing/enforce-subscriptions", async (_req, res) => {
  try {
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];

    // 1. Mark overdue invoices (pending, past due_date)
    const overdueResult = await db.update(tenantInvoicesTable)
      .set({ status: "overdue", updatedAt: now })
      .where(and(
        eq(tenantInvoicesTable.status, "pending"),
        lt(tenantInvoicesTable.dueDate, todayStr),
      )).returning({ id: tenantInvoicesTable.id });

    // 2. Auto-suspend tenants where subscriptionEndsAt + gracePeriodDays < now and status is active/trial
    const tenants = await db.select({
      id: tenantsTable.id,
      status: tenantsTable.status,
      subscriptionEndsAt: tenantsTable.subscriptionEndsAt,
      gracePeriodDays: tenantsTable.gracePeriodDays,
    }).from(tenantsTable)
      .where(and(
        sql`status IN ('active', 'trial')`,
        sql`subscription_ends_at IS NOT NULL`,
        sql`subscription_ends_at < now()`,
      ));

    const suspended: number[] = [];
    const warned: number[] = [];
    for (const t of tenants) {
      if (!t.subscriptionEndsAt) continue;
      const endDate = new Date(t.subscriptionEndsAt);
      const graceDays = t.gracePeriodDays ?? 7;
      const graceEnd = new Date(endDate);
      graceEnd.setDate(graceEnd.getDate() + graceDays);
      if (now > graceEnd) {
        // Past grace period — suspend
        await db.update(tenantsTable).set({ status: "suspended", isActive: false, updatedAt: now })
          .where(eq(tenantsTable.id, t.id));
        suspended.push(t.id);
      } else {
        // Within grace period — just note
        warned.push(t.id);
      }
    }

    res.json({
      ok: true,
      invoicesMarkedOverdue: overdueResult.length,
      tenantsSuspended: suspended.length,
      tenantsInGrace: warned.length,
      suspendedIds: suspended,
    });
  } catch (err) { console.error(err); res.status(500).json({ error: "Internal server error" }); }
});

// ─── Tenant Billing Cycle Update ──────────────────────────────────────────────

router.patch("/platform/tenants/:id/billing", async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    const { billingCycle, gracePeriodDays } = req.body as { billingCycle?: string; gracePeriodDays?: number };
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (billingCycle) updates.billingCycle = billingCycle;
    if (gracePeriodDays != null) updates.gracePeriodDays = Number(gracePeriodDays);
    const [updated] = await db.update(tenantsTable).set(updates as never)
      .where(eq(tenantsTable.id, id)).returning();
    if (!updated) { res.status(404).json({ error: "Tenant not found" }); return; }
    res.json(updated);
  } catch (err) { console.error(err); res.status(500).json({ error: "Internal server error" }); }
});

export default router;
