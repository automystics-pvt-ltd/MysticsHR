import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { requireHrmsUser, requireRole } from "../lib/auth";
import { logAudit } from "../lib/audit";
import { db } from "../lib/db";
import { hrmsUsersTable, tenantsTable } from "@workspace/db/schema";
import { eq, and, ilike, or, count, ne } from "drizzle-orm";

const router = Router();
const MAX_FAILED_ATTEMPTS = 5;
const INVITE_TTL_MS = 48 * 60 * 60 * 1000;

function safeUser(user: typeof hrmsUsersTable.$inferSelect) {
  const { passwordHash: _, inviteToken: __, ...rest } = user;
  return {
    ...rest,
    hasPassword: !!user.passwordHash,
    hasPendingInvite: !!(user.inviteToken && user.inviteExpiry && user.inviteExpiry > new Date()),
  };
}

// GET /users/license-usage — current user count vs tenant limit
router.get(
  "/users/license-usage",
  requireHrmsUser,
  requireRole("customer_admin", "hr_manager"),
  async (req, res) => {
    try {
      const tenantId = req.hrmsUser!.tenantId;
      const [tenant] = await db
        .select({ customMaxUsers: tenantsTable.customMaxUsers })
        .from(tenantsTable)
        .where(eq(tenantsTable.id, tenantId))
        .limit(1);

      const [{ total }] = await db
        .select({ total: count() })
        .from(hrmsUsersTable)
        .where(eq(hrmsUsersTable.tenantId, tenantId));

      const limit = tenant?.customMaxUsers ?? null;
      res.json({
        used: Number(total),
        limit,
        remaining: limit !== null ? Math.max(0, limit - Number(total)) : null,
        atLimit: limit !== null && Number(total) >= limit,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// GET /users — list with search/filter
router.get(
  "/users",
  requireHrmsUser,
  requireRole("customer_admin", "hr_manager"),
  async (req, res) => {
    try {
      const { search, role, status } = req.query as {
        search?: string; role?: string; status?: string;
      };
      const tenantId = req.hrmsUser!.tenantId;

      let rows = await db
        .select()
        .from(hrmsUsersTable)
        .where(eq(hrmsUsersTable.tenantId, tenantId))
        .orderBy(hrmsUsersTable.name);

      // Apply filters in-memory (small tenant user sets rarely exceed a few hundred)
      if (search) {
        const q = search.toLowerCase();
        rows = rows.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
      }
      if (role) {
        rows = rows.filter(u => u.role === role);
      }
      if (status === "active") rows = rows.filter(u => u.isActive && !u.isLocked);
      else if (status === "inactive") rows = rows.filter(u => !u.isActive);
      else if (status === "locked") rows = rows.filter(u => u.isLocked);
      else if (status === "pending") rows = rows.filter(u => !u.passwordHash && !u.isLocked);

      res.json(rows.map(safeUser));
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// POST /users — create user (with license guard)
router.post(
  "/users",
  requireHrmsUser,
  requireRole("customer_admin"),
  async (req, res) => {
    try {
      const tenantId = req.hrmsUser!.tenantId;

      // License limit check
      const [tenant] = await db
        .select({ customMaxUsers: tenantsTable.customMaxUsers })
        .from(tenantsTable)
        .where(eq(tenantsTable.id, tenantId))
        .limit(1);

      if (tenant?.customMaxUsers !== null && tenant?.customMaxUsers !== undefined) {
        const [{ total }] = await db
          .select({ total: count() })
          .from(hrmsUsersTable)
          .where(eq(hrmsUsersTable.tenantId, tenantId));
        if (Number(total) >= tenant.customMaxUsers) {
          res.status(422).json({
            error: `License limit reached. Your plan allows up to ${tenant.customMaxUsers} users. Please upgrade your subscription or contact your platform administrator.`,
            code: "LICENSE_LIMIT_REACHED",
            limit: tenant.customMaxUsers,
            used: Number(total),
          });
          return;
        }
      }

      const { employeeId, email, name, role, password, sendInvite } = req.body as {
        employeeId?: number; email?: string; name?: string;
        role?: string; password?: string; sendInvite?: boolean;
      };
      if (!email || !name) {
        res.status(400).json({ error: "email and name are required" });
        return;
      }

      let passwordHash: string | null = null;
      let inviteToken: string | null = null;
      let inviteExpiry: Date | null = null;
      let invitedAt: Date | null = null;

      if (password) {
        if (password.length < 8) {
          res.status(400).json({ error: "Password must be at least 8 characters" });
          return;
        }
        passwordHash = await bcrypt.hash(password, 12);
      } else if (sendInvite !== false) {
        inviteToken = crypto.randomBytes(32).toString("hex");
        inviteExpiry = new Date(Date.now() + INVITE_TTL_MS);
        invitedAt = new Date();
      }

      const [user] = await db
        .insert(hrmsUsersTable)
        .values({
          tenantId,
          employeeId: employeeId ?? null,
          email: email.toLowerCase().trim(),
          name,
          role: (role as typeof hrmsUsersTable.$inferSelect["role"]) ?? "employee",
          passwordHash,
          inviteToken,
          inviteExpiry,
          invitedAt,
          isActive: true,
        })
        .returning();

      await logAudit({ user: req.hrmsUser, action: "CREATE", module: "Users", recordId: user.id, ipAddress: req.ip });

      const responseUser = safeUser(user);
      const inviteUrl = inviteToken
        ? `${req.protocol}://${req.get("host")}/setup-password?token=${inviteToken}`
        : null;

      res.status(201).json({ ...responseUser, inviteUrl });
    } catch (err: unknown) {
      const e = err as { code?: string };
      if (e?.code === "23505") {
        res.status(409).json({ error: "A user with this email already exists in this organisation" });
        return;
      }
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

router.get("/users/me", requireHrmsUser, (req, res) => {
  res.json(safeUser(req.hrmsUser!));
});

router.get(
  "/users/:id",
  requireHrmsUser,
  requireRole("customer_admin", "hr_manager"),
  async (req, res) => {
    try {
      const id = parseInt(String(req.params.id), 10);
      const [user] = await db
        .select()
        .from(hrmsUsersTable)
        .where(and(eq(hrmsUsersTable.id, id), eq(hrmsUsersTable.tenantId, req.hrmsUser!.tenantId)))
        .limit(1);
      if (!user) { res.status(404).json({ error: "User not found" }); return; }
      res.json(safeUser(user));
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

router.patch(
  "/users/:id",
  requireHrmsUser,
  requireRole("customer_admin"),
  async (req, res) => {
    try {
      const id = parseInt(String(req.params.id), 10);
      const { employeeId, email, name, role, isActive, password } = req.body as {
        employeeId?: number; email?: string; name?: string;
        role?: string; isActive?: boolean; password?: string;
      };
      const patch: Partial<typeof hrmsUsersTable.$inferInsert> & { updatedAt: Date } = { updatedAt: new Date() };
      if (employeeId !== undefined) patch.employeeId = employeeId;
      if (email !== undefined) patch.email = email.toLowerCase().trim();
      if (name !== undefined) patch.name = name;
      if (role !== undefined) patch.role = role as typeof hrmsUsersTable.$inferSelect["role"];
      if (isActive !== undefined) patch.isActive = isActive;
      if (password) {
        if (password.length < 8) {
          res.status(400).json({ error: "Password must be at least 8 characters" });
          return;
        }
        patch.passwordHash = await bcrypt.hash(password, 12);
      }
      const [user] = await db
        .update(hrmsUsersTable)
        .set(patch)
        .where(and(eq(hrmsUsersTable.id, id), eq(hrmsUsersTable.tenantId, req.hrmsUser!.tenantId)))
        .returning();
      if (!user) { res.status(404).json({ error: "User not found" }); return; }
      await logAudit({ user: req.hrmsUser, action: "UPDATE", module: "Users", recordId: id, ipAddress: req.ip });
      res.json(safeUser(user));
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// POST /users/:id/lock
router.post(
  "/users/:id/lock",
  requireHrmsUser,
  requireRole("customer_admin"),
  async (req, res) => {
    try {
      const id = parseInt(String(req.params.id), 10);
      const { reason } = req.body as { reason?: string };

      // Prevent locking yourself
      if (id === req.hrmsUser!.id) {
        res.status(400).json({ error: "You cannot lock your own account" });
        return;
      }

      const [user] = await db
        .update(hrmsUsersTable)
        .set({ isLocked: true, lockedAt: new Date(), lockedReason: reason ?? null, updatedAt: new Date() })
        .where(and(eq(hrmsUsersTable.id, id), eq(hrmsUsersTable.tenantId, req.hrmsUser!.tenantId)))
        .returning();
      if (!user) { res.status(404).json({ error: "User not found" }); return; }
      await logAudit({ user: req.hrmsUser, action: "UPDATE", module: "Users", recordId: id, ipAddress: req.ip, newValue: `Locked account: ${reason ?? "no reason given"}` });
      res.json(safeUser(user));
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// POST /users/:id/unlock
router.post(
  "/users/:id/unlock",
  requireHrmsUser,
  requireRole("customer_admin"),
  async (req, res) => {
    try {
      const id = parseInt(String(req.params.id), 10);
      const [user] = await db
        .update(hrmsUsersTable)
        .set({ isLocked: false, lockedAt: null, lockedReason: null, failedLoginAttempts: 0, updatedAt: new Date() })
        .where(and(eq(hrmsUsersTable.id, id), eq(hrmsUsersTable.tenantId, req.hrmsUser!.tenantId)))
        .returning();
      if (!user) { res.status(404).json({ error: "User not found" }); return; }
      await logAudit({ user: req.hrmsUser, action: "UPDATE", module: "Users", recordId: id, ipAddress: req.ip, newValue: "Unlocked account" });
      res.json(safeUser(user));
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// POST /users/:id/generate-invite — (re)generate a password setup invitation link
router.post(
  "/users/:id/generate-invite",
  requireHrmsUser,
  requireRole("customer_admin"),
  async (req, res) => {
    try {
      const id = parseInt(String(req.params.id), 10);
      const inviteToken = crypto.randomBytes(32).toString("hex");
      const inviteExpiry = new Date(Date.now() + INVITE_TTL_MS);

      const [user] = await db
        .update(hrmsUsersTable)
        .set({ inviteToken, inviteExpiry, invitedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(hrmsUsersTable.id, id), eq(hrmsUsersTable.tenantId, req.hrmsUser!.tenantId)))
        .returning();
      if (!user) { res.status(404).json({ error: "User not found" }); return; }

      await logAudit({ user: req.hrmsUser, action: "UPDATE", module: "Users", recordId: id, ipAddress: req.ip, newValue: "Generated password setup invitation" });

      const inviteUrl = `${req.protocol}://${req.get("host")}/setup-password?token=${inviteToken}`;
      res.json({ ok: true, inviteUrl, expiresAt: inviteExpiry.toISOString() });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// POST /users/:id/reset-password-link — admin generates a reset link (same mechanism as invite but for existing password users)
router.post(
  "/users/:id/reset-password-link",
  requireHrmsUser,
  requireRole("customer_admin"),
  async (req, res) => {
    try {
      const id = parseInt(String(req.params.id), 10);
      const inviteToken = crypto.randomBytes(32).toString("hex");
      const inviteExpiry = new Date(Date.now() + INVITE_TTL_MS);

      const [user] = await db
        .update(hrmsUsersTable)
        .set({ inviteToken, inviteExpiry, updatedAt: new Date(), passwordHash: null })
        .where(and(eq(hrmsUsersTable.id, id), eq(hrmsUsersTable.tenantId, req.hrmsUser!.tenantId)))
        .returning();
      if (!user) { res.status(404).json({ error: "User not found" }); return; }

      await logAudit({ user: req.hrmsUser, action: "UPDATE", module: "Users", recordId: id, ipAddress: req.ip, newValue: "Admin-initiated password reset" });

      const resetUrl = `${req.protocol}://${req.get("host")}/setup-password?token=${inviteToken}`;
      res.json({ ok: true, resetUrl, expiresAt: inviteExpiry.toISOString() });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

export default router;
