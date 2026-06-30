---
name: NotificationBell fetch pattern
description: How the NotificationBell component fetches real in-app notifications (not activity feed)
---

## Rule
`NotificationBell` uses TanStack Query with an inline `apiFetch` helper (same pattern as wfh/expense pages: `BASE_URL + /api` prefix, `credentials: include`). It does NOT use generated hooks from `@workspace/api-client-react` because none exist for `/notifications`.

## Why
The generated api-client only covers endpoints that were code-gen'd. The `/notifications`, `/notifications/unread-count`, and `/notifications/mark-read` endpoints are custom and must be called directly.

## How to apply
- `GET /notifications` → list of `AppNotification[]` (id, title, message, entityType, entityId, isRead, createdAt)
- `GET /notifications/unread-count` → `{ count: number }`
- `POST /notifications/mark-read` body `{ notificationIds?: number[] }` — omit ids to mark all read
- Poll interval: 30s when popover is closed; invalidate on open for immediate refresh
- Unread badge: numeric count from unread-count endpoint, shown as pill on bell icon
- Click row → mark that single notification read; "Mark all read" button marks all; "Clear all" marks all and closes
