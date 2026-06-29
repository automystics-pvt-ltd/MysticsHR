---
name: HRMS user extended security fields
description: hrms_users table extended with lock, invite, and login-tracking fields; safeUser() shape changed
---

## New columns on hrms_users (all added via direct SQL, then reflected in drizzle schema)
- `is_locked` boolean DEFAULT false
- `locked_at` timestamp nullable
- `locked_reason` text nullable
- `failed_login_attempts` integer DEFAULT 0
- `last_login_at` timestamp nullable
- `invite_token` text nullable — 64-char hex, 48h TTL
- `invite_expiry` timestamp nullable
- `invited_at` timestamp nullable

## safeUser() shape
Both `passwordHash` and `inviteToken` are stripped from every API response.
Two computed booleans are added:
- `hasPassword: !!user.passwordHash`
- `hasPendingInvite: !!(user.inviteToken && user.inviteExpiry && user.inviteExpiry > new Date())`

**Why:** Invite tokens are single-use secrets; exposing them in responses would allow anyone with the API response to steal the setup link.

## Auto-lock logic
Login increments `failed_login_attempts` on password mismatch. At ≥ 5 failures, `is_locked = true`, `locked_reason` = "Auto-locked after 5 failed login attempts". Unlock resets both counter and lock flag.

## How to apply
Any route that returns user data must call `safeUser()`. Any auth check must verify `is_locked` before setting session cookie.
