export const MODULE_REGISTRY = [
  { key: "dashboard",         label: "Dashboard",             group: "Home" },
  { key: "ess",               label: "ESS Portal",            group: "Home" },
  { key: "employees",         label: "Employees",             group: "Workforce" },
  { key: "org-chart",         label: "Org Chart",             group: "Workforce" },
  { key: "departments",       label: "Departments",           group: "Workforce" },
  { key: "branches",          label: "Branches",              group: "Workforce" },
  { key: "designations",      label: "Designations",          group: "Workforce" },
  { key: "recruitment",       label: "Recruitment",           group: "Talent Acquisition" },
  { key: "pre-onboarding",    label: "Pre-Onboarding",        group: "Talent Acquisition" },
  { key: "onboarding",        label: "Onboarding",            group: "Talent Acquisition" },
  { key: "shifts",            label: "Shifts",                group: "Time & Attendance" },
  { key: "attendance",        label: "Attendance",            group: "Time & Attendance" },
  { key: "leave",             label: "Leave",                 group: "Time & Attendance" },
  { key: "work-permissions",  label: "Permissions",           group: "Time & Attendance" },
  { key: "payroll",           label: "Payroll",               group: "Payroll" },
  { key: "performance",       label: "Performance",           group: "Performance" },
  { key: "helpdesk",          label: "Helpdesk",              group: "Employee Services" },
  { key: "documents",         label: "Documents",             group: "Employee Services" },
  { key: "communications",    label: "Communications",        group: "Employee Services" },
  { key: "exit",              label: "Exit & Offboarding",    group: "Separation" },
  { key: "analytics",         label: "Analytics",             group: "Insights" },
  { key: "reports",           label: "Reports",               group: "Insights" },
  { key: "users",             label: "Users",                 group: "Administration" },
  { key: "roles-permissions", label: "Roles & Permissions",   group: "Administration" },
  { key: "audit-logs",        label: "Audit Logs",            group: "Administration" },
  { key: "system-config",     label: "System Configuration",  group: "Administration" },
  { key: "api-keys",          label: "API Keys",              group: "Administration" },
] as const;

export type ModuleKey = (typeof MODULE_REGISTRY)[number]["key"];

export const PERMISSION_ACTIONS = [
  "view", "create", "edit", "delete", "approve",
  "export", "print", "reports", "settings", "admin",
] as const;
export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];

export type PermissionMap = Partial<Record<string, string[]>>;
