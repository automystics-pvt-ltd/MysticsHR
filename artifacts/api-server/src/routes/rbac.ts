import { Router } from "express";
import { requireHrmsUser, requireRole } from "../lib/auth";
import { db } from "../lib/db";
import { rolePermissionsTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import {
  MODULE_REGISTRY,
  PERMISSION_ACTIONS,
  DEFAULT_PERMISSIONS,
  PermissionAction,
} from "../lib/module-registry";
import { getPermissionsForUser, invalidatePermissionCache } from "../lib/rbac";
import { logAudit } from "../lib/audit";

const router = Router();

const HRMS_ROLES = ["customer_admin", "hr_manager", "hr_executive", "hod", "payroll_admin", "employee"] as const;

router.get("/rbac/modules", requireHrmsUser, (_req, res) => {
  res.json(MODULE_REGISTRY);
});

router.get("/rbac/actions", requireHrmsUser, (_req, res) => {
  res.json(PERMISSION_ACTIONS);
});

router.get("/rbac/my-permissions", requireHrmsUser, async (req, res) => {
  try {
    const map = await getPermissionsForUser(req.hrmsUser!.tenantId, req.hrmsUser!.role);
    res.json(map);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/rbac/permissions", requireHrmsUser, requireRole("customer_admin", "hr_manager"), async (req, res) => {
  try {
    const { roleSlug } = req.query as { roleSlug?: string };
    const tenantId = req.hrmsUser!.tenantId;

    const roles = roleSlug ? [roleSlug] : [...HRMS_ROLES];
    const result: Record<string, Record<string, PermissionAction[]>> = {};

    for (const rs of roles) {
      result[rs] = (await getPermissionsForUser(tenantId, rs)) as Record<string, PermissionAction[]>;
    }

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/rbac/permissions", requireHrmsUser, requireRole("customer_admin", "hr_manager"), async (req, res) => {
  try {
    const { roleSlug, permissions } = req.body as {
      roleSlug: string;
      permissions: Record<string, string[]>;
    };

    if (!HRMS_ROLES.includes(roleSlug as typeof HRMS_ROLES[number])) {
      res.status(400).json({ error: "Invalid role" });
      return;
    }
    if (roleSlug === "customer_admin") {
      res.status(400).json({ error: "customer_admin permissions cannot be modified" });
      return;
    }
    if (!permissions || typeof permissions !== "object") {
      res.status(400).json({ error: "permissions must be an object" });
      return;
    }

    const tenantId = req.hrmsUser!.tenantId;
    const validActions = new Set(PERMISSION_ACTIONS);
    const validModules: Set<string> = new Set(MODULE_REGISTRY.map((m) => m.key));

    const rows = Object.entries(permissions)
      .filter(([moduleKey]) => validModules.has(moduleKey))
      .map(([moduleKey, actions]) => ({
        tenantId,
        roleSlug,
        moduleKey,
        actions: (actions ?? []).filter((a) => validActions.has(a as PermissionAction)) as PermissionAction[],
        updatedAt: new Date(),
      }));

    await db.transaction(async (tx) => {
      await tx
        .delete(rolePermissionsTable)
        .where(
          and(
            eq(rolePermissionsTable.tenantId, tenantId),
            eq(rolePermissionsTable.roleSlug, roleSlug),
          ),
        );
      if (rows.length > 0) {
        await tx.insert(rolePermissionsTable).values(rows);
      }
    });

    invalidatePermissionCache(tenantId);

    await logAudit({
      user: req.hrmsUser!,
      action: "UPDATE_ROLE_PERMISSIONS",
      module: "Roles & Permissions",
      newValue: JSON.stringify({ roleSlug, modules: Object.keys(permissions).length }),
      ipAddress: req.ip,
    });

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/rbac/permissions/reset", requireHrmsUser, requireRole("customer_admin"), async (req, res) => {
  try {
    const { roleSlug } = req.body as { roleSlug?: string };
    const tenantId = req.hrmsUser!.tenantId;

    const condition = roleSlug
      ? and(eq(rolePermissionsTable.tenantId, tenantId), eq(rolePermissionsTable.roleSlug, roleSlug))
      : eq(rolePermissionsTable.tenantId, tenantId);

    await db.delete(rolePermissionsTable).where(condition);
    invalidatePermissionCache(tenantId);

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
