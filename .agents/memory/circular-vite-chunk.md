---
name: Circular Vite chunk crash
description: manualChunks that splits react into vendor-react creates a circular dep with vendor, causing React runtime init-order crash in production
---

## Rule
Never create a separate `vendor-react` chunk in `vite.config.ts` for this project.

**Why:** `react-dom` depends on `scheduler`; many other packages (react-day-picker, wouter, etc.) import `react`. With pnpm's virtual store layout, `id.includes("react")` puts `react`/`react-dom` in `vendor-react`, but `scheduler` and other react-ecosystem packages end up in `vendor`. The cross-chunk circular dep (`vendor → vendor-react → vendor`) causes indeterminate ES module init order in the browser — React's internal state is undefined on first access, causing a React render crash caught by ChunkErrorBoundary as "Something went wrong".

**How to apply:** Keep all `node_modules` in a flat `vendor` chunk (plus specific non-circular splits for charts, icons, query, dates). Do NOT add `vendor-react`.
