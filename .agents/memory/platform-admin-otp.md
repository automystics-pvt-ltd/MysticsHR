---
name: Platform Admin OTP auth
description: OTP-based login for Platform Admin — whitelist enforced, no password login.
---

## Rule
Platform Admin login is OTP-only. No password-based auth. Whitelist is enforced server-side via the `PLATFORM_ADMIN_EMAILS` env var (comma-separated), defaulting to the two owner emails.

**Why:** Security — only known platform owners should access the admin panel; passwords create credential risk.

**How to apply:**
- Routes: `POST /platform/auth/otp/request` (check whitelist → send OTP) and `POST /platform/auth/otp/verify` (check OTP → sign JWT cookie, auto-create admin record if needed).
- OTP store: in-memory `Map<email, {otp, expires, attempts}>` — resets on server restart (acceptable; just request new OTP).
- `passwordHash` column is NOT NULL in `platform_admins` table — auto-created records get `bcrypt(randomUUID())` as a placeholder.
- Frontend: 2-step login in `LoginPage.tsx`; context exposes `requestOtp` / `verifyOtp` (no `login`).
- To add a new admin, add their email to `PLATFORM_ADMIN_EMAILS` env var — they auto-provision on first verify.
