import { Router } from "express";
import { requireHrmsUser, requireRole } from "../lib/auth";
import { logAudit } from "../lib/audit";
import { db } from "../lib/db";
import { branchesTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";

const router = Router();

router.get("/branches", requireHrmsUser, async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(branchesTable)
      .where(eq(branchesTable.tenantId, req.hrmsUser!.tenantId))
      .orderBy(branchesTable.name);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post(
  "/branches",
  requireHrmsUser,
  requireRole("customer_admin", "hr_manager"),
  async (req, res) => {
    try {
      const { name, code, address, city, state, country, phone, email, isHeadquarters } = req.body as {
        name?: string; code?: string; address?: string; city?: string;
        state?: string; country?: string; phone?: string; email?: string; isHeadquarters?: boolean;
      };
      if (!name || !code) {
        res.status(400).json({ error: "name and code are required" });
        return;
      }
      const [branch] = await db
        .insert(branchesTable)
        .values({
          tenantId: req.hrmsUser!.tenantId,
          name,
          code: code.toUpperCase(),
          address: address ?? null,
          city: city ?? null,
          state: state ?? null,
          country: country ?? "India",
          phone: phone ?? null,
          email: email ?? null,
          isHeadquarters: isHeadquarters ?? false,
          isActive: true,
        })
        .returning();
      await logAudit({ user: req.hrmsUser, action: "CREATE", module: "Branches", recordId: branch.id, ipAddress: req.ip });
      res.status(201).json(branch);
    } catch (err: unknown) {
      const e = err as { code?: string };
      if (e?.code === "23505") {
        res.status(409).json({ error: "A branch with this code already exists" });
        return;
      }
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

router.get("/branches/:id", requireHrmsUser, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    const [branch] = await db
      .select()
      .from(branchesTable)
      .where(and(eq(branchesTable.id, id), eq(branchesTable.tenantId, req.hrmsUser!.tenantId)))
      .limit(1);
    if (!branch) { res.status(404).json({ error: "Branch not found" }); return; }
    res.json(branch);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch(
  "/branches/:id",
  requireHrmsUser,
  requireRole("customer_admin", "hr_manager"),
  async (req, res) => {
    try {
      const id = parseInt(String(req.params.id), 10);
      if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
      const { name, code, address, city, state, country, phone, email, isHeadquarters, isActive } = req.body as {
        name?: string; code?: string; address?: string; city?: string; state?: string;
        country?: string; phone?: string; email?: string; isHeadquarters?: boolean; isActive?: boolean;
      };
      const patch: Partial<typeof branchesTable.$inferInsert> & { updatedAt: Date } = { updatedAt: new Date() };
      if (name !== undefined) patch.name = name;
      if (code !== undefined) patch.code = code.toUpperCase();
      if (address !== undefined) patch.address = address;
      if (city !== undefined) patch.city = city;
      if (state !== undefined) patch.state = state;
      if (country !== undefined) patch.country = country;
      if (phone !== undefined) patch.phone = phone;
      if (email !== undefined) patch.email = email;
      if (isHeadquarters !== undefined) patch.isHeadquarters = isHeadquarters;
      if (isActive !== undefined) patch.isActive = isActive;

      const [branch] = await db
        .update(branchesTable)
        .set(patch)
        .where(and(eq(branchesTable.id, id), eq(branchesTable.tenantId, req.hrmsUser!.tenantId)))
        .returning();
      if (!branch) { res.status(404).json({ error: "Branch not found" }); return; }
      await logAudit({ user: req.hrmsUser, action: "UPDATE", module: "Branches", recordId: id, ipAddress: req.ip });
      res.json(branch);
    } catch (err: unknown) {
      const e = err as { code?: string };
      if (e?.code === "23505") {
        res.status(409).json({ error: "A branch with this code already exists" });
        return;
      }
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

router.delete(
  "/branches/:id",
  requireHrmsUser,
  requireRole("customer_admin"),
  async (req, res) => {
    try {
      const id = parseInt(String(req.params.id), 10);
      if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
      const [branch] = await db
        .delete(branchesTable)
        .where(and(eq(branchesTable.id, id), eq(branchesTable.tenantId, req.hrmsUser!.tenantId)))
        .returning();
      if (!branch) { res.status(404).json({ error: "Branch not found" }); return; }
      await logAudit({ user: req.hrmsUser, action: "DELETE", module: "Branches", recordId: id, ipAddress: req.ip });
      res.json({ ok: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

export default router;
