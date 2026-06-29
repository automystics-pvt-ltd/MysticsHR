import { Request, Response, NextFunction } from "express";
import { db } from "./db";
import { rolePermissionsTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { DEFAULT_PERMISSIONS, MODULE_REGISTRY, PermissionAction, PermissionMap } from "./module-registry";

interface CacheEntry { map: PermissionMap; expiresAt: number }
const permCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000;

function cacheKey(tenantId: number, roleSlug: string) {
  return `${tenantId}:${roleSlug}`;
}

export function invalidatePermissionCache(tenantId: number) {
  for (const key of permCache.keys()) {
    if (key.startsWith(`${tenantId}:`)) permCache.delete(key);
  }
}

export async function getPermissionsForUser(tenantId: number, roleSlug: string): Promise<PermissionMap> {
  const key = cacheKey(tenantId, roleSlug);
  const cached = permCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.map;

  const defaults = DEFAULT_PERMISSIONS[roleSlug] ?? {};

  const rows = await db
    .select({ moduleKey: rolePermissionsTable.moduleKey, actions: rolePermissionsTable.actions })
    .from(rolePermissionsTable)
    .where(
      and(
        eq(rolePermissionsTable.tenantId, tenantId),
        eq(rolePermissionsTable.roleSlug, roleSlug),
      ),
    );

  const map: PermissionMap = {};
  for (const mod of MODULE_REGISTRY) {
    const dbRow = rows.find((r) => r.moduleKey === mod.key);
    if (dbRow) {
      map[mod.key] = dbRow.actions as PermissionAction[];
    } else {
      map[mod.key] = defaults[mod.key] ?? [];
    }
  }

  permCache.set(key, { map, expiresAt: Date.now() + CACHE_TTL_MS });
  return map;
}

export function canDo(map: PermissionMap, moduleKey: string, action: string): boolean {
  return (map[moduleKey] ?? []).includes(action as PermissionAction);
}

export function requirePermission(moduleKey: string, action: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = req.hrmsUser;
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    if (user.role === "customer_admin") {
      next();
      return;
    }
    try {
      const map = await getPermissionsForUser(user.tenantId, user.role);
      if (!canDo(map, moduleKey, action)) {
        res.status(403).json({ error: `Forbidden: '${action}' permission required for '${moduleKey}'` });
        return;
      }
      next();
    } catch (err) {
      console.error("RBAC check error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  };
}
