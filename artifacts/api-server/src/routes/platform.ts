import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "../lib/db";
import {
  platformAdminsTable,
  tenantsTable,
  hrmsUsersTable,
  employeesTable,
  auditLogsTable,
} from "@workspace/db/schema";
import { and, eq, sql, desc } from "drizzle-orm";
import {
  signPlatformToken,
  setPlatformAuthCookie,
  clearPlatformAuthCookie,
  requirePlatformAdmin,
} from "../lib/auth";

const router = Router();

function safePlatformAdmin(admin: typeof platformAdminsTable.$inferSelect) {
  const { passwordHash: _, ...rest } = admin;
  return rest;
}

// ─── Platform Auth ────────────────────────────────────────────────────────────

router.post("/platform/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email || !password) {
      res.status(400).json({ error: "email and password are required" });
      return;
    }
    const [admin] = await db
      .select()
      .from(platformAdminsTable)
      .where(eq(platformAdminsTable.email, email.toLowerCase().trim()))
      .limit(1);
    if (!admin) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }
    const valid = await bcrypt.compare(password, admin.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }
    if (!admin.isActive) {
      res.status(403).json({ error: "Platform admin account is deactivated" });
      return;
    }
    const token = signPlatformToken({ platformAdminId: admin.id, email: admin.email });
    setPlatformAuthCookie(res, token);
    res.json({ admin: safePlatformAdmin(admin) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/platform/auth/logout", (_req, res) => {
  clearPlatformAuthCookie(res);
  res.json({ ok: true });
});

router.get("/platform/auth/me", requirePlatformAdmin, (req, res) => {
  res.json({ admin: safePlatformAdmin(req.platformAdmin!) });
});

// ─── All routes below require platform admin ──────────────────────────────────
router.use("/platform", requirePlatformAdmin);

// ─── Tenants ──────────────────────────────────────────────────────────────────

router.get("/platform/tenants", async (_req, res) => {
  try {
    const tenants = await db
      .select({
        id: tenantsTable.id,
        slug: tenantsTable.slug,
        name: tenantsTable.name,
        isActive: tenantsTable.isActive,
        createdAt: tenantsTable.createdAt,
        updatedAt: tenantsTable.updatedAt,
        userCount: sql<number>`(
          SELECT count(*)::int FROM hrms_users WHERE hrms_users.tenant_id = ${tenantsTable.id}
        )`,
      })
      .from(tenantsTable)
      .orderBy(desc(tenantsTable.createdAt));
    res.json({ data: tenants, total: tenants.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/platform/tenants", async (req, res) => {
  try {
    const { name, slug } = req.body as { name?: string; slug?: string };
    if (!name || !slug) {
      res.status(400).json({ error: "name and slug are required" });
      return;
    }
    const normalizedSlug = slug.toLowerCase().trim().replace(/[^a-z0-9-]/g, "-");
    const [existing] = await db
      .select({ id: tenantsTable.id })
      .from(tenantsTable)
      .where(eq(tenantsTable.slug, normalizedSlug))
      .limit(1);
    if (existing) {
      res.status(409).json({ error: "A tenant with this slug already exists" });
      return;
    }
    const [tenant] = await db
      .insert(tenantsTable)
      .values({ name: name.trim(), slug: normalizedSlug, isActive: true })
      .returning();
    res.status(201).json(tenant);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/platform/tenants/:id", async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const [tenant] = await db
      .select({
        id: tenantsTable.id,
        slug: tenantsTable.slug,
        name: tenantsTable.name,
        isActive: tenantsTable.isActive,
        createdAt: tenantsTable.createdAt,
        updatedAt: tenantsTable.updatedAt,
        userCount: sql<number>`(
          SELECT count(*)::int FROM hrms_users WHERE hrms_users.tenant_id = ${tenantsTable.id}
        )`,
        employeeCount: sql<number>`(
          SELECT count(*)::int FROM employees WHERE employees.tenant_id = ${tenantsTable.id}
        )`,
      })
      .from(tenantsTable)
      .where(eq(tenantsTable.id, id))
      .limit(1);
    if (!tenant) {
      res.status(404).json({ error: "Tenant not found" });
      return;
    }
    res.json(tenant);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/platform/tenants/:id", async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const { name, isActive } = req.body as { name?: string; isActive?: boolean };
    const updates: Partial<{ name: string; isActive: boolean; updatedAt: Date }> = { updatedAt: new Date() };
    if (name !== undefined) updates.name = name.trim();
    if (isActive !== undefined) updates.isActive = Boolean(isActive);
    const [updated] = await db
      .update(tenantsTable)
      .set(updates)
      .where(eq(tenantsTable.id, id))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Tenant not found" });
      return;
    }
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/platform/tenants/:id", async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const [updated] = await db
      .update(tenantsTable)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(tenantsTable.id, id))
      .returning({ id: tenantsTable.id });
    if (!updated) {
      res.status(404).json({ error: "Tenant not found" });
      return;
    }
    res.json({ ok: true, id: updated.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Tenant Users ─────────────────────────────────────────────────────────────

router.get("/platform/tenants/:id/users", async (req, res) => {
  try {
    const tenantId = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(tenantId)) {
      res.status(400).json({ error: "Invalid tenant id" });
      return;
    }
    const users = await db
      .select({
        id: hrmsUsersTable.id,
        email: hrmsUsersTable.email,
        name: hrmsUsersTable.name,
        role: hrmsUsersTable.role,
        isActive: hrmsUsersTable.isActive,
        createdAt: hrmsUsersTable.createdAt,
      })
      .from(hrmsUsersTable)
      .where(eq(hrmsUsersTable.tenantId, tenantId))
      .orderBy(desc(hrmsUsersTable.createdAt));
    res.json({ data: users, total: users.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/platform/tenants/:id/users", async (req, res) => {
  try {
    const tenantId = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(tenantId)) {
      res.status(400).json({ error: "Invalid tenant id" });
      return;
    }
    const [tenant] = await db
      .select({ id: tenantsTable.id })
      .from(tenantsTable)
      .where(and(eq(tenantsTable.id, tenantId), eq(tenantsTable.isActive, true)))
      .limit(1);
    if (!tenant) {
      res.status(404).json({ error: "Tenant not found or inactive" });
      return;
    }
    const { email, name, password, role = "customer_admin" } = req.body as {
      email?: string;
      name?: string;
      password?: string;
      role?: string;
    };
    if (!email || !name || !password) {
      res.status(400).json({ error: "email, name, and password are required" });
      return;
    }
    if (password.length < 8) {
      res.status(400).json({ error: "Password must be at least 8 characters" });
      return;
    }
    const normalizedEmail = email.toLowerCase().trim();
    const [existing] = await db
      .select({ id: hrmsUsersTable.id })
      .from(hrmsUsersTable)
      .where(and(eq(hrmsUsersTable.email, normalizedEmail), eq(hrmsUsersTable.tenantId, tenantId)))
      .limit(1);
    if (existing) {
      res.status(409).json({ error: "A user with this email already exists in this tenant" });
      return;
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const [created] = await db
      .insert(hrmsUsersTable)
      .values({
        tenantId,
        email: normalizedEmail,
        name: name.trim(),
        role: role as typeof hrmsUsersTable.$inferInsert["role"],
        passwordHash,
        isActive: true,
      })
      .returning();
    const { passwordHash: _, ...safeUser } = created;
    res.status(201).json(safeUser);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Platform Admins ──────────────────────────────────────────────────────────

router.get("/platform/admins", async (_req, res) => {
  try {
    const admins = await db
      .select({
        id: platformAdminsTable.id,
        email: platformAdminsTable.email,
        name: platformAdminsTable.name,
        isActive: platformAdminsTable.isActive,
        createdAt: platformAdminsTable.createdAt,
        updatedAt: platformAdminsTable.updatedAt,
      })
      .from(platformAdminsTable)
      .orderBy(desc(platformAdminsTable.createdAt));
    res.json({ data: admins, total: admins.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/platform/admins", async (req, res) => {
  try {
    const { email, name, password } = req.body as { email?: string; name?: string; password?: string };
    if (!email || !name || !password) {
      res.status(400).json({ error: "email, name, and password are required" });
      return;
    }
    if (password.length < 8) {
      res.status(400).json({ error: "Password must be at least 8 characters" });
      return;
    }
    const [existing] = await db
      .select({ id: platformAdminsTable.id })
      .from(platformAdminsTable)
      .where(eq(platformAdminsTable.email, email.toLowerCase().trim()))
      .limit(1);
    if (existing) {
      res.status(409).json({ error: "A platform admin with this email already exists" });
      return;
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const [created] = await db
      .insert(platformAdminsTable)
      .values({ email: email.toLowerCase().trim(), name: name.trim(), passwordHash, isActive: true })
      .returning();
    res.status(201).json(safePlatformAdmin(created));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/platform/admins/:id", async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const { name, isActive, password } = req.body as { name?: string; isActive?: boolean; password?: string };
    const updates: Partial<{ name: string; isActive: boolean; passwordHash: string; updatedAt: Date }> = { updatedAt: new Date() };
    if (name !== undefined) updates.name = name.trim();
    if (isActive !== undefined) updates.isActive = Boolean(isActive);
    if (password) {
      if (password.length < 8) {
        res.status(400).json({ error: "Password must be at least 8 characters" });
        return;
      }
      updates.passwordHash = await bcrypt.hash(password, 12);
    }
    const [updated] = await db
      .update(platformAdminsTable)
      .set(updates)
      .where(eq(platformAdminsTable.id, id))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Platform admin not found" });
      return;
    }
    res.json(safePlatformAdmin(updated));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Analytics ────────────────────────────────────────────────────────────────

router.get("/platform/analytics", async (_req, res) => {
  try {
    const [tenantStats] = await db
      .select({ total: sql<number>`count(*)::int`, active: sql<number>`sum(case when is_active then 1 else 0 end)::int` })
      .from(tenantsTable);
    const [userStats] = await db
      .select({ total: sql<number>`count(*)::int`, active: sql<number>`sum(case when is_active then 1 else 0 end)::int` })
      .from(hrmsUsersTable);
    const [employeeStats] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(employeesTable);
    const [platformAdminStats] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(platformAdminsTable);

    res.json({
      tenants: { total: tenantStats?.total ?? 0, active: tenantStats?.active ?? 0 },
      hrmsUsers: { total: userStats?.total ?? 0, active: userStats?.active ?? 0 },
      employees: { total: employeeStats?.total ?? 0 },
      platformAdmins: { total: platformAdminStats?.total ?? 0 },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Audit Logs (cross-tenant) ────────────────────────────────────────────────

router.get("/platform/audit-logs", async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    const tenantId = req.query.tenantId ? Number(req.query.tenantId) : undefined;

    const where = tenantId ? eq(auditLogsTable.tenantId, tenantId) : undefined;

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(auditLogsTable)
      .where(where);

    const logs = await db
      .select()
      .from(auditLogsTable)
      .where(where)
      .orderBy(desc(auditLogsTable.createdAt))
      .limit(limit)
      .offset(offset);

    res.json({ data: logs, total: count ?? 0, limit, offset });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
