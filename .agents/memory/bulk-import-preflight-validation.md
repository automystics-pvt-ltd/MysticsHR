---
name: Bulk-import pre-flight validation pattern
description: How MysticsHR's employee bulk-import gives users a review step before committing, and where the shared validation rules live.
---

MysticsHR's employee bulk-import (Excel upload) validates the parsed file against a **read-only** endpoint (`POST /employees/bulk-import/validate` in `artifacts/api-server/src/routes/employees-extended.ts`) the moment a file is selected/dropped, before the user ever clicks "Import". The frontend (`artifacts/mysticshr/src/pages/employees/index.tsx`) shows a review panel grouping issues by sheet/row/column, and blocks the Import button while any `severity: "error"` issue exists (warnings, like an unmatched department name that will just be left blank, do not block).

**Why:** users were only finding out about bad rows (malformed dates, invalid enum values, duplicate IDs, references to employees not in the file) after running the real import, which is slower to iterate on and encourages partial/messy imports. A dry-run check lets them fix everything in their spreadsheet first.

**How to apply:** the validation rules live in `artifacts/api-server/src/lib/bulk-import-validation.ts` (`validateBulkImportPayload`) and are shared by both the dry-run endpoint and the real import route (both use `DATE_RE` and the same enum lists) so they cannot drift apart — if you add a new column/rule to one, add the check to this shared module so both paths agree. Any new sheet or field added to the bulk-import template should get a matching format/enum check here, not just a try/catch around the DB insert.
