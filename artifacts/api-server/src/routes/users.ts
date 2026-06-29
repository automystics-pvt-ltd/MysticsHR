import { Router } from "express";
import bcrypt from "bcryptjs";
import { requireHrmsUser, requireRole } from "../lib/auth";
import { logAudit } from "../lib/audit";
import { db } from "../lib/db";
import { hrmsUsersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

function safeUser(user: typeof hrmsUsersTable.$inferSelect) {
  const { passwordHash: _, ...rest } = user;
  return rest;
}

router.get(
  "/users",
  requireHrmsUser,
  requireRole("super_admin", "hr_manager"),
  async (req, res) => {
    try {
      const users = await db.select().from(hrmsUsersTable).orderBy(hrmsUsersTable.name);
      res.json(users.map(safeUser));
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

router.post(
  "/users",
  requireHrmsUser,
  requireRole("super_admin"),
  async (req, res) => {
    try {
      const { employeeId, email, name, role, password } = req.body as {
        employeeId?: number;
        email?: string;
        name?: string;
        role?: string;
        password?: string;
      };
      if (!email || !name) {
        res.status(400).json({ error: "email and name are required" });
        return;
      }
      let passwordHash: string | null = null;
      if (password) {
        if (password.length < 8) {
          res.status(400).json({ error: "Password must be at least 8 characters" });
          return;
        }
        passwordHash = await bcrypt.hash(password, 12);
      }
      const [user] = await db
        .insert(hrmsUsersTable)
        .values({
          employeeId: employeeId ?? null,
          email: email.toLowerCase().trim(),
          name,
          role: (role as typeof hrmsUsersTable.$inferSelect["role"]) ?? "employee",
          passwordHash,
          isActive: true,
        })
        .returning();
      await logAudit({
        user: req.hrmsUser,
        action: "CREATE",
        module: "Users",
        recordId: user.id,
        ipAddress: req.ip,
      });
      res.status(201).json(safeUser(user));
    } catch (err: unknown) {
      const e = err as { code?: string };
      if (e?.code === "23505") {
        res.status(409).json({ error: "A user with this email already exists" });
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
  requireRole("super_admin", "hr_manager"),
  async (req, res) => {
    try {
      const id = parseInt(String(req.params.id), 10);
      const [user] = await db
        .select()
        .from(hrmsUsersTable)
        .where(eq(hrmsUsersTable.id, id))
        .limit(1);
      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }
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
  requireRole("super_admin"),
  async (req, res) => {
    try {
      const id = parseInt(String(req.params.id), 10);
      const { employeeId, email, name, role, isActive, password } = req.body as {
        employeeId?: number;
        email?: string;
        name?: string;
        role?: string;
        isActive?: boolean;
        password?: string;
      };
      const patch: Partial<typeof hrmsUsersTable.$inferInsert> & { updatedAt: Date } = {
        updatedAt: new Date(),
      };
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
        .where(eq(hrmsUsersTable.id, id))
        .returning();
      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }
      await logAudit({
        user: req.hrmsUser,
        action: "UPDATE",
        module: "Users",
        recordId: id,
        ipAddress: req.ip,
      });
      res.json(safeUser(user));
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

export default router;
