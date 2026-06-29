---
name: Dashboard role-split
description: How the dashboard adapts per role; which APIs are gated and why.
---

## Rule
Dashboard renders exactly one of four role-specific sections based on the user's role.
KPI and chart APIs are NOT called for employees (enabled: needsKpis flag).

## Role → view mapping
- employee        → EmployeeView (clock widget + quick-action cards + scoped activity)
- hod             → HodView (4 team KPIs + quick actions + activity)
- payroll_admin   → PayrollView (4 payroll KPIs + quick actions + activity)
- hr_manager,
  hr_executive,
  customer_admin  → HrAdminView (full 8 KPIs + charts + certs + activity)

## Gating logic
```ts
const needsKpis = isAnyManager || isHod; // false for employee
useGetDashboardKpis({ query: { enabled: needsKpis } });
// HeadcountCharts and ExpiringCerts are components only mounted inside HrAdminView
```

**Why:** Employees have no business seeing total headcount, attrition rate, etc.
Unnecessary API calls also add latency and server load.

**How to apply:** Add new role sections at the bottom of dashboard.tsx with `{isNewRole && (...)}` blocks. Keep role constants at the top (HR_ADMIN_ROLES, MANAGER_ROLES).
