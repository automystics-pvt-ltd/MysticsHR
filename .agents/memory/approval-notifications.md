---
name: Approval notifications pattern
description: How notifyUser/notifyEmployee are wired into approval-type routes for in-app bell notifications
---

## Rule
Call `notifyUser()` immediately after logAudit at the submit point, and `notifyEmployee()` immediately after logAudit at every approve/reject point. Both calls use `.catch(() => {})` (fire-and-forget) before `res.json()`.

## Why
Ensures employees always get an in-app bell notification when they submit a request AND when it is actioned, without blocking the HTTP response if the notification insert fails.

## How to apply
- Submit endpoint: `notifyUser({ tenantId, userId: req.hrmsUser!.id, title, message, entityType, entityId }).catch(() => {})`
- Action endpoint: `notifyEmployee({ tenantId, employeeId: existing.employeeId!, title, message, entityType, entityId }).catch(() => {})`
- `notifyEmployee` looks up hrmsUser by employeeId internally (one extra query, acceptable).
- Both helpers live in `artifacts/api-server/src/lib/notification-service.ts`.
- Covered modules: leave, wfh, expense, shift-change, permissions, attendance (regularization).
