import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "../lib/db";
import { hrmsUsersTable, tenantsTable } from "@workspace/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { signToken, setAuthCookie, clearAuthCookie, requireHrmsUser } from "../lib/auth";

const router = Router();

function safeUser(user: typeof hrmsUsersTable.$inferSelect) {
  const { passwordHash: _, ...rest } = user;
  return rest;
}

router.post("/auth/login", async (req, res) => {
  try {
    const { email, password, tenantSlug } = req.body as { email?: string; password?: string; tenantSlug?: string };
    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }
    const normalizedEmail = email.toLowerCase().trim();

    // Fetch all candidate accounts for this email.
    // When a tenantSlug is provided, narrow to that tenant only (prevents iterating
    // bcrypt rounds across every tenant — important when email reuse is allowed).
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
      // No tenant hint — fetch all accounts with this email across tenants.
      // bcrypt.compare determines which one (if any) matches the supplied password.
      candidates = await db
        .select()
        .from(hrmsUsersTable)
        .where(eq(hrmsUsersTable.email, normalizedEmail));
    }

    if (candidates.length === 0) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    // Find the first candidate whose password hash matches.
    let matchedUser: typeof hrmsUsersTable.$inferSelect | null = null;
    for (const candidate of candidates) {
      if (candidate.passwordHash && await bcrypt.compare(password, candidate.passwordHash)) {
        matchedUser = candidate;
        break;
      }
    }

    if (!matchedUser) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }
    if (!matchedUser.isActive) {
      res.status(403).json({ error: "Your account is deactivated. Contact your HR administrator." });
      return;
    }
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

router.get("/auth/me", requireHrmsUser, (req, res) => {
  res.json(safeUser(req.hrmsUser!));
});

router.post("/auth/register", async (req, res) => {
  try {
    const { email, password, name } = req.body as {
      email?: string;
      password?: string;
      name?: string;
    };
    if (!email || !password) {
      res.status(400).json({ error: "email and password are required" });
      return;
    }
    if (password.length < 8) {
      res.status(400).json({ error: "Password must be at least 8 characters" });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(hrmsUsersTable);

    if (Number(count) === 0) {
      if (!name) {
        res.status(400).json({ error: "name is required for initial setup" });
        return;
      }
      // Resolve default tenant for bootstrap — created by migration script
      const [defaultTenant] = await db
        .select({ id: tenantsTable.id })
        .from(tenantsTable)
        .where(eq(tenantsTable.slug, "default"))
        .limit(1);
      const tenantId = defaultTenant?.id ?? 1;

      const passwordHash = await bcrypt.hash(password, 12);
      const [created] = await db
        .insert(hrmsUsersTable)
        .values({ tenantId, email: normalizedEmail, name, role: "customer_admin", passwordHash, isActive: true })
        .returning();
      const token = signToken({ userId: created.id, email: created.email, role: created.role, tenantId: created.tenantId });
      setAuthCookie(res, token);
      res.status(201).json({ user: safeUser(created), bootstrapped: true });
      return;
    }

    const [existing] = await db
      .select()
      .from(hrmsUsersTable)
      .where(eq(hrmsUsersTable.email, normalizedEmail))
      .limit(1);

    if (!existing) {
      res.status(404).json({
        error: "No account found for this email. Contact your HR administrator.",
      });
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
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(hrmsUsersTable.id, existing.id))
      .returning();
    const token = signToken({ userId: updated.id, email: updated.email, role: updated.role, tenantId: updated.tenantId });
    setAuthCookie(res, token);
    res.json({ user: safeUser(updated) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/auth/change-password", requireHrmsUser, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body as {
      currentPassword?: string;
      newPassword?: string;
    };
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
