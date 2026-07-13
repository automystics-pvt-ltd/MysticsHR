---
name: Sequential employee ID generation
description: How auto-generated employee IDs avoid colliding with manually-entered ones, and where the sequence counter lives.
---

Tenants can auto-generate employee IDs (prefix-year-XXXX) instead of typing them. The counter (`tenants.employee_id_sequence`) is per-tenant, monotonic, and never resets by year.

**Why:** Manual entry and auto-generation must coexist without collisions — HR may have already typed IDs with high numeric suffixes before turning on auto mode, or may still type manual IDs alongside auto ones.

**How to apply:** When adding similar auto-numbering elsewhere (e.g. invoice numbers, ticket IDs), seed the counter from the max of the stored value AND any existing numeric suffixes already in use, and reserve the next value under a row lock in the same transaction as the insert. A preview/suggestion endpoint that reads the counter without locking is fine for UI display, but must never be trusted as the actual reserved value.
