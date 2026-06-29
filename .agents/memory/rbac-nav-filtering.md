---
name: RBAC nav filtering
description: How Sidebar, CommandPalette, and route guards use RBAC permissions; what to keep consistent.
---

## Rule
`filterNavByPermissions(permissionsMap)` is the primary nav filter; `filterNavByRole` is the fallback while permissions load.
Both Sidebar and CommandPalette must use the same logic — divergence leaks modules through search.

## Route protection layers
1. `ProtectedRoute` — auth only
2. `RoleProtectedRoute` — coarse role check (instant, no network)
3. `PermissionProtectedRoute` — live RBAC check via `useMyPermissions()` (5 min stale)
   Applied to: employees, recruitment, payroll (all subroutes), analytics, reports, audit-logs.
   Falls through while loading to avoid Forbidden flash.

**Why:** Sidebar hides nav items by permission. Without the route guard, a user who knows the URL can still reach the page. The dual-layer approach catches both nav-link and direct-URL access.

**How to apply:** Wrap sensitive routes as: `<RoleProtectedRoute ...><PermissionProtectedRoute module="X"><Page /></PermissionProtectedRoute></RoleProtectedRoute>`
