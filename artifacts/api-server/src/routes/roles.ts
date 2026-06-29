import { Router } from "express";
import { requireHrmsUser } from "../lib/auth";
import { db } from "../lib/db";
import { rolesTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";

const router = Router();

router.get("/roles", requireHrmsUser, async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(rolesTable)
      .where(eq(rolesTable.tenantId, req.hrmsUser!.tenantId))
      .orderBy(rolesTable.level);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/roles/:id", requireHrmsUser, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const [role] = await db
      .select()
      .from(rolesTable)
      .where(
        and(
          eq(rolesTable.id, id),
          eq(rolesTable.tenantId, req.hrmsUser!.tenantId)
        )
      )
      .limit(1);
    if (!role) {
      res.status(404).json({ error: "Role not found" });
      return;
    }
    res.json(role);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
