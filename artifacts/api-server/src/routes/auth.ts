import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "../lib/db";
import { hrmsUsersTable, tenantsTable } from "@workspace/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { signToken, setAuthCookie, clearAuthCookie, requireHrmsUser } from "../lib/auth";

const router = Router();
const MAX_FAILED_ATTEMPTS = 5;

function safeUser(user: typeof hrmsUsersTable.$inferSelect) {
  const { passwordHash: _, inviteToken: __, ...rest } = user;
  return {
    ...rest,
    hasPassword: !!user.passwordHash,
    hasPendingInvite: !!(user.inviteToken && user.inviteExpiry && user.inviteExpiry > new Date()),
  };
}

router.post("/auth/login", async (req, res) => {
  try {
    const { email, password, tenantSlug } = req.body as { email?: string; password?: string; tenantSlug?: string };
    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }
    const normalizedEmail = email.toLowerCase().trim();

    let candidates: (typeof hrmsUsersTable.$inferSelect)[];
    if (tenantSlug) {
      const [tenant] = await db
        .select({ id: tenantsTable.id })
        .from(tenantsTable)
        .where(eq(tenantsTable.slug, tenantSlug))
        .limit(1);
      if (!tenant) {
        res.status(401).json({ error: "Invalid email or password" });
        return;
      }
      candidates = await db
        .select()
        .from(hrmsUsersTable)
        .where(and(eq(hrmsUsersTable.email, normalizedEmail), eq(hrmsUsersTable.tenantId, tenant.id)));
    } else {
      candidates = await db
        .select()
        .from(hrmsUsersTable)
        .where(eq(hrmsUsersTable.email, normalizedEmail));
    }

    if (candidates.length === 0) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    let matchedUser: typeof hrmsUsersTable.$inferSelect | null = null;
    for (const candidate of candidates) {
      if (candidate.passwordHash && await bcrypt.compare(password, candidate.passwordHash)) {
        matchedUser = candidate;
        break;
      }
    }

    if (!matchedUser) {
      // Increment failed attempts for all candidates with a password hash found
      for (const candidate of candidates) {
        if (candidate.passwordHash) {
          const newAttempts = (candidate.failedLoginAttempts ?? 0) + 1;
          const shouldLock = newAttempts >= MAX_FAILED_ATTEMPTS;
          await db
            .update(hrmsUsersTable)
            .set({
              failedLoginAttempts: newAttempts,
              ...(shouldLock ? { isLocked: true, lockedAt: new Date(), lockedReason: `Auto-locked after ${MAX_FAILED_ATTEMPTS} failed login attempts` } : {}),
              updatedAt: new Date(),
            })
            .where(eq(hrmsUsersTable.id, candidate.id));
        }
      }
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    if (!matchedUser.isActive) {
      res.status(403).json({ error: "Your account is deactivated. Contact your HR administrator." });
      return;
    }

    if (matchedUser.isLocked) {
      const reason = matchedUser.lockedReason ?? "Account locked";
      res.status(403).json({ error: `Account is locked: ${reason}. Contact your HR administrator.` });
      return;
    }

    // Successful login — reset failed attempts, update lastLoginAt
    await db
      .update(hrmsUsersTable)
      .set({ failedLoginAttempts: 0, lastLoginAt: new Date(), updatedAt: new Date() })
      .where(eq(hrmsUsersTable.id, matchedUser.id));

    const token = signToken({ userId: matchedUser.id, email: matchedUser.email, role: matchedUser.role, tenantId: matchedUser.tenantId });
    setAuthCookie(res, token);
    res.json({ user: safeUser(matchedUser) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/auth/logout", (_req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

router.get("/auth/me", requireHrmsUser, async (req, res) => {
  try {
    const [tenant] = await db
      .select({ id: tenantsTable.id, slug: tenantsTable.slug, name: tenantsTable.name })
      .from(tenantsTable)
      .where(eq(tenantsTable.id, req.hrmsUser!.tenantId))
      .limit(1);
    res.json({ user: safeUser(req.hrmsUser!), tenant: tenant ?? null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /auth/setup-check?token=xxx — validate an invite/reset token and return pre-fill data
router.get("/auth/setup-check", async (req, res) => {
  try {
    const { token } = req.query as { token?: string };
    if (!token) {
      res.status(400).json({ error: "token is required" });
      return;
    }
    const [user] = await db
      .select()
      .from(hrmsUsersTable)
      .where(eq(hrmsUsersTable.inviteToken, token))
      .limit(1);

    if (!user) {
      res.status(404).json({ error: "Invalid or expired setup link" });
      return;
    }
    if (!user.inviteExpiry || user.inviteExpiry < new Date()) {
      res.status(410).json({ error: "This setup link has expired. Ask your administrator to generate a new one." });
      return;
    }
    if (!user.isActive) {
      res.status(403).json({ error: "Account is deactivated. Contact your HR administrator." });
      return;
    }
    res.json({ email: user.email, name: user.name });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /auth/register — set password via invite token OR by email (first-time setup)
router.post("/auth/register", async (req, res) => {
  try {
    const { email, password, tenantSlug, token } = req.body as {
      email?: string; password?: string; tenantSlug?: string; token?: string;
    };

    if (!password) {
      res.status(400).json({ error: "password is required" });
      return;
    }
    if (password.length < 8) {
      res.status(400).json({ error: "Password must be at least 8 characters" });
      return;
    }

    // Token-based setup (invite link flow)
    if (token) {
      const [user] = await db
        .select()
        .from(hrmsUsersTable)
        .where(eq(hrmsUsersTable.inviteToken, token))
        .limit(1);

      if (!user) {
        res.status(404).json({ error: "Invalid or expired setup link" });
        return;
      }
      if (!user.inviteExpiry || user.inviteExpiry < new Date()) {
        res.status(410).json({ error: "This setup link has expired. Ask your administrator to generate a new one." });
        return;
      }
      if (!user.isActive) {
        res.status(403).json({ error: "Account is deactivated. Contact your HR administrator." });
        return;
      }

      const passwordHash = await bcrypt.hash(password, 12);
      const [updated] = await db
        .update(hrmsUsersTable)
        .set({ passwordHash, inviteToken: null, inviteExpiry: null, failedLoginAttempts: 0, updatedAt: new Date() })
        .where(eq(hrmsUsersTable.id, user.id))
        .returning();

      const authToken = signToken({ userId: updated.id, email: updated.email, role: updated.role, tenantId: updated.tenantId });
      setAuthCookie(res, authToken);
      res.json({ user: safeUser(updated) });
      return;
    }

    // Email-based setup (legacy / fallback flow)
    if (!email) {
      res.status(400).json({ error: "email and password are required" });
      return;
    }

    const [{ tenantCount }] = await db
      .select({ tenantCount: sql<number>`count(*)::int` })
      .from(tenantsTable);
    if (Number(tenantCount) === 0) {
      res.status(503).json({
        error: "No tenants configured. Contact your platform administrator to set up your organisation first.",
      });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    let tenantId: number | undefined;
    if (tenantSlug) {
      const [tenant] = await db
        .select({ id: tenantsTable.id })
        .from(tenantsTable)
        .where(and(eq(tenantsTable.slug, tenantSlug), eq(tenantsTable.isActive, true)))
        .limit(1);
      if (!tenant) {
        res.status(404).json({ error: "Organisation not found. Check the URL or contact your administrator." });
        return;
      }
      tenantId = tenant.id;
    }

    const whereClause = tenantId
      ? and(eq(hrmsUsersTable.email, normalizedEmail), eq(hrmsUsersTable.tenantId, tenantId))
      : eq(hrmsUsersTable.email, normalizedEmail);

    const [existing] = await db
      .select()
      .from(hrmsUsersTable)
      .where(whereClause)
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: "No account found for this email. Contact your HR administrator." });
      return;
    }
    if (existing.passwordHash) {
      res.status(409).json({ error: "Account already set up. Please sign in instead." });
      return;
    }
    if (!existing.isActive) {
      res.status(403).json({ error: "Account is deactivated. Contact your HR administrator." });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const [updated] = await db
      .update(hrmsUsersTable)
      .set({ passwordHash, inviteToken: null, inviteExpiry: null, updatedAt: new Date() })
      .where(and(eq(hrmsUsersTable.id, existing.id), eq(hrmsUsersTable.tenantId, existing.tenantId)))
      .returning();

    const authToken = signToken({ userId: updated.id, email: updated.email, role: updated.role, tenantId: updated.tenantId });
    setAuthCookie(res, authToken);
    res.json({ user: safeUser(updated) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/auth/change-password", requireHrmsUser, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body as { currentPassword?: string; newPassword?: string };
    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: "currentPassword and newPassword are required" });
      return;
    }
    if (newPassword.length < 8) {
      res.status(400).json({ error: "New password must be at least 8 characters" });
      return;
    }
    const [user] = await db
      .select()
      .from(hrmsUsersTable)
      .where(and(eq(hrmsUsersTable.id, req.hrmsUser!.id), eq(hrmsUsersTable.tenantId, req.hrmsUser!.tenantId)))
      .limit(1);
    if (!user?.passwordHash) {
      res.status(400).json({ error: "No password set. Use register to set your password." });
      return;
    }
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Current password is incorrect" });
      return;
    }
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await db
      .update(hrmsUsersTable)
      .set({ passwordHash, updatedAt: new Date() })
      .where(and(eq(hrmsUsersTable.id, user.id), eq(hrmsUsersTable.tenantId, req.hrmsUser!.tenantId)));
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
