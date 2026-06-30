---
name: Attendance suspicion config — requireGps
description: requireGps is a boolean field in AttendanceSuspicionConfig that blocks clock-in when GPS is unavailable.
---

## Rule
`requireGps: boolean` is part of `AttendanceSuspicionConfig`. It is:
- Stored in `system_settings` (category=`attendance_suspicion`, key=`config`) as JSONB
- Loaded by `loadAttendanceSuspicionConfig` in `artifacts/api-server/src/lib/attendance-suspicion.ts`
- Enforced in the `/attendance/me/clock-in` endpoint — returns 422 if requireGps=true and no GPS in telemetry
- Configured via the "Attendance Suspicion" tab in system-config, using a Switch toggle

**Why:** Administrators need to optionally enforce that employees must allow location permission to punch in. The enforcement is server-side for security (client-side is just informational).

**How to apply:** The system defaults to `requireGps: false`. Setting it to true blocks ALL employees in the tenant from clocking in without GPS — use carefully.
