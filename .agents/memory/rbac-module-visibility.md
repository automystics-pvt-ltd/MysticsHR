---
name: RBAC module visibility
description: How nav items become visible — modules must be in MODULE_REGISTRY on both client and server, and have DEFAULT_PERMISSIONS entries.
---

## Rule
A nav item with `moduleKey: "foo"` is only visible if `"foo"` exists in `MODULE_REGISTRY` in both:
- `artifacts/mysticshr/src/lib/module-registry.ts` (client)
- `artifacts/api-server/src/lib/module-registry.ts` (server)

**Why:** `getPermissionsForUser` iterates `MODULE_REGISTRY` to build the permissions map — modules outside the registry are never included. `filterNavByPermissions` checks `permissionsMap[moduleKey].includes("view")` — missing keys return false.

**How to apply:**
1. Add the module key to both MODULE_REGISTRY arrays.
2. Add `DEFAULT_PERMISSIONS[role][newKey]` entries on the server for all 6 roles.
3. The `filterNavByPermissions` defensive fallback now returns true for keys NOT in the map (opt-in), so even if step 1–2 is delayed, the item shows.
4. `roles-permissions` page is fully dynamic — it auto-shows new modules from MODULE_REGISTRY.
