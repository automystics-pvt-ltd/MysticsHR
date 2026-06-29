---
name: Employee status enum casing
description: PostgreSQL enum values are Title-case; lowercase query params silently break comparisons
---

# Employee Status Enum — Case Convention

The `employee_status` PostgreSQL enum stores values as Title-case:
`"Pre-Joining"`, `"Active"`, `"On Leave of Absence"`, `"Suspended"`, `"Notice Period"`, `"Separated"`

**Why:** Drizzle/PostgreSQL enum comparisons are case-sensitive. Sending `status=active`
(lowercase) causes PostgreSQL to throw `invalid input value for enum employee_status: "active"`,
which the API route catches and returns 500 — the frontend receives no data and shows an empty dropdown.

**How to apply:** Always use exact Title-case when passing status as a query param (e.g. `status=Active`).
The `/employees` list route now also uses `lower(status::text) = lower(param)` as a defensive guard.
