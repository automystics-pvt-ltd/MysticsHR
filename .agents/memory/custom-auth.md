---
name: Custom Auth System
description: MysticsHR authentication — JWT HTTP-only cookie, bcrypt, no Clerk. Design, endpoints, and key decisions.
---

# MysticsHR Custom Auth

Clerk was fully replaced with a custom email+password system.

## Design
- Cookie: `mysticshr_session`, HTTP-only, SameSite=lax, Secure in prod, 7-day maxAge
- JWT payload: `{ userId, email, role }`
- JWT_SECRET: set in shared env via Replit secrets
- bcrypt cost: 12

## Key files
- Backend middleware: `artifacts/api-server/src/lib/auth.ts` (`requireHrmsUser`, `requireRole`, `signToken`, `setAuthCookie`)
- Auth routes: `artifacts/api-server/src/routes/auth.ts` (POST /api/auth/login, /api/auth/logout, /api/auth/register, /api/auth/change-password, GET /api/auth/me)
- Frontend context: `artifacts/mysticshr/src/lib/auth.tsx` (AuthProvider, useAuth)
- Login page: `artifacts/mysticshr/src/pages/login.tsx`

## Bootstrap flow
- If DB has 0 users: POST /api/auth/register creates first super_admin (no prior account needed)
- Subsequent users: admin pre-creates account (no password), user sets password via /api/auth/register
- If account already has a password: returns 409 "already set up"

## API calls
- All API calls use `credentials: "include"` (set in `lib/api-client-react/src/custom-fetch.ts`)
- No Bearer tokens needed for most routes

**Why:** Clerk had strict usage limits and required external dependency; custom auth gives full control and persistent sessions with no third-party.
