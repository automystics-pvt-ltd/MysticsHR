---
name: XLSX bulk-import date parsing
description: Why Excel date cells must be read with cellDates:true and converted with local date parts, not toISOString, before sending to a Postgres `date` column.
---

When a browser reads an uploaded `.xlsx` with SheetJS (`XLSX.read(buffer, { cellDates: false })`, the default), date cells come back as raw serial numbers (e.g. 45124) instead of `Date` objects. If that value is blindly stringified (`String(v)`) and sent to a Postgres `date` column, every insert on that row throws "invalid input syntax for type date", which then cascades into "not found" errors for any dependent rows that reference the never-created parent.

**Why:** this exact bug caused MysticsHR's bulk employee import to report "0 employees imported" with all dependent sheets (Profiles/Education/etc.) failing — the fix was `cellDates: true` plus formatting `Date` instances as local-timezone `YYYY-MM-DD` (not `toISOString()`, which can roll the date to the adjacent day depending on timezone).

**How to apply:** any client-side spreadsheet import feature that writes dates into a SQL `date` column needs both: (1) `cellDates: true` on `XLSX.read`, and (2) an explicit `Date -> "YYYY-MM-DD"` formatter using `getFullYear/getMonth/getDate` (local parts), applied to every date-typed column before the value leaves the browser.
