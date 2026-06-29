---
name: Sidebar required exports
description: Sidebar.tsx must export both Sidebar and SidebarMenuButton; TopBar.tsx depends on the latter.
---

## Rule
`artifacts/mysticshr/src/components/layout/Sidebar.tsx` must export two named symbols:
- `Sidebar` — the main sidebar component
- `SidebarMenuButton` — a small hamburger button used by TopBar on mobile (`<SidebarMenuButton onOpen={...} />`)

**Why:** `TopBar.tsx` imports `SidebarMenuButton` from `./Sidebar`. If a rewrite of Sidebar.tsx drops this export, the entire app fails with a runtime module error.

**How to apply:** Any time Sidebar.tsx is rewritten or restructured, ensure both exports are present.
