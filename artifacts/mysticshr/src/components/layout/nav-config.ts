import {
  LayoutDashboard,
  Users,
  Building2,
  Briefcase,
  UserPlus,
  ClipboardCheck,
  ClipboardList,
  ShieldCheck,
  Shield,
  FileText,
  Settings,
  Clock,
  CalendarCheck,
  Umbrella,
  CreditCard,
  Timer,
  Banknote,
  Target,
  Home,
  ArrowLeftRight,
  Ticket,
  FileBadge,
  TrendingDown,
  BarChart3,
  Bell,
  Network,
  KeyRound,
  BookOpen,
  MapPin,
  Lock,
  Receipt,
  Inbox,
  type LucideIcon,
} from "lucide-react";

export type Role =
  | "customer_admin"
  | "hr_manager"
  | "hr_executive"
  | "hod"
  | "payroll_admin"
  | "employee";

export const ALL_ROLES: Role[] = [
  "customer_admin",
  "hr_manager",
  "hr_executive",
  "hod",
  "payroll_admin",
  "employee",
];

export interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  roles: Role[];
  moduleKey?: string;
  keywords?: string[];
}

export interface NavGroup {
  id: string;
  label: string;
  defaultOpen?: boolean;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    id: "home",
    label: "Home",
    defaultOpen: true,
    items: [
      {
        name: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
        roles: ALL_ROLES,
        moduleKey: "dashboard",
        keywords: ["overview", "home", "kpi"],
      },
      {
        name: "ESS Portal",
        href: "/ess",
        icon: Home,
        roles: ALL_ROLES,
        moduleKey: "ess",
        keywords: ["self service", "my profile", "employee"],
      },
    ],
  },
  {
    id: "workforce",
    label: "Workforce",
    defaultOpen: true,
    items: [
      {
        name: "Employees",
        href: "/employees",
        icon: Users,
        roles: ["customer_admin", "hr_manager", "hr_executive", "hod", "payroll_admin"],
        moduleKey: "employees",
        keywords: ["staff", "people", "team"],
      },
      {
        name: "Org Chart",
        href: "/org-chart",
        icon: Network,
        roles: ALL_ROLES,
        moduleKey: "org-chart",
        keywords: ["organization", "hierarchy", "reporting"],
      },
      {
        name: "Departments",
        href: "/departments",
        icon: Building2,
        roles: ["customer_admin", "hr_manager", "hr_executive"],
        moduleKey: "departments",
        keywords: ["division", "unit"],
      },
      {
        name: "Branches",
        href: "/branches",
        icon: MapPin,
        roles: ["customer_admin", "hr_manager", "hr_executive"],
        moduleKey: "branches",
        keywords: ["office", "location", "site"],
      },
      {
        name: "Designations",
        href: "/designations",
        icon: Briefcase,
        roles: ["customer_admin", "hr_manager", "hr_executive"],
        moduleKey: "designations",
        keywords: ["job title", "role", "position"],
      },
    ],
  },
  {
    id: "talent",
    label: "Talent Acquisition",
    defaultOpen: false,
    items: [
      {
        name: "Recruitment",
        href: "/recruitment",
        icon: UserPlus,
        roles: ["customer_admin", "hr_manager", "hr_executive", "hod"],
        moduleKey: "recruitment",
        keywords: ["hiring", "requisition", "candidate", "job"],
      },
      {
        name: "Pre-Onboarding",
        href: "/pre-onboarding",
        icon: ClipboardCheck,
        roles: ["customer_admin", "hr_manager", "hr_executive"],
        moduleKey: "pre-onboarding",
        keywords: ["offer", "joining", "documents"],
      },
      {
        name: "Onboarding",
        href: "/onboarding",
        icon: ClipboardList,
        roles: ["customer_admin", "hr_manager", "hr_executive", "hod"],
        moduleKey: "onboarding",
        keywords: ["induction", "joinee", "checklist"],
      },
    ],
  },
  {
    id: "time",
    label: "Time & Attendance",
    defaultOpen: false,
    items: [
      {
        name: "Shifts",
        href: "/shifts",
        icon: Clock,
        roles: ["customer_admin", "hr_manager", "hr_executive", "hod", "payroll_admin"],
        moduleKey: "shifts",
        keywords: ["roster", "schedule"],
      },
      {
        name: "Attendance",
        href: "/attendance",
        icon: CalendarCheck,
        roles: ALL_ROLES,
        moduleKey: "attendance",
        keywords: ["punch", "regularization", "muster"],
      },
      {
        name: "Leave",
        href: "/leave",
        icon: Umbrella,
        roles: ALL_ROLES,
        moduleKey: "leave",
        keywords: ["holiday", "time off", "vacation"],
      },
      {
        name: "Permissions",
        href: "/permissions",
        icon: Timer,
        roles: ALL_ROLES,
        moduleKey: "work-permissions",
        keywords: ["short leave", "outdoor", "comp off"],
      },
      {
        name: "Work From Home",
        href: "/wfh",
        icon: Home,
        roles: ALL_ROLES,
        moduleKey: "wfh",
        keywords: ["wfh", "remote", "work from home"],
      },
      {
        name: "Shift Change",
        href: "/shift-change",
        icon: ArrowLeftRight,
        roles: ALL_ROLES,
        moduleKey: "shift-change",
        keywords: ["shift", "shift change", "schedule change"],
      },
      {
        name: "Approvals",
        href: "/approvals",
        icon: Inbox,
        roles: ["customer_admin", "hr_manager", "hr_executive", "hod"],
        moduleKey: "approvals",
        keywords: ["pending", "approve", "reject", "inbox"],
      },
    ],
  },
  {
    id: "payroll",
    label: "Payroll",
    defaultOpen: false,
    items: [
      {
        name: "Payroll",
        href: "/payroll",
        icon: Banknote,
        roles: ["customer_admin", "hr_manager", "hr_executive", "payroll_admin", "employee"],
        moduleKey: "payroll",
        keywords: ["salary", "payslip", "tax", "ctc"],
      },
    ],
  },
  {
    id: "performance",
    label: "Performance",
    defaultOpen: false,
    items: [
      {
        name: "Performance",
        href: "/performance",
        icon: Target,
        roles: ["customer_admin", "hr_manager", "hr_executive", "hod", "employee"],
        moduleKey: "performance",
        keywords: ["goals", "appraisal", "review", "kra"],
      },
    ],
  },
  {
    id: "services",
    label: "Employee Services",
    defaultOpen: false,
    items: [
      {
        name: "Helpdesk",
        href: "/helpdesk",
        icon: Ticket,
        roles: ALL_ROLES,
        moduleKey: "helpdesk",
        keywords: ["ticket", "support", "issue", "sla"],
      },
      {
        name: "Documents",
        href: "/documents",
        icon: FileBadge,
        roles: ALL_ROLES,
        moduleKey: "documents",
        keywords: ["files", "letters", "certificates"],
      },
      {
        name: "Expense Claims",
        href: "/expense",
        icon: Receipt,
        roles: ALL_ROLES,
        moduleKey: "expense-claims",
        keywords: ["expense", "reimbursement", "claims", "bills"],
      },
      {
        name: "Communications",
        href: "/communications",
        icon: Bell,
        roles: ["customer_admin", "hr_manager"],
        moduleKey: "communications",
        keywords: ["announcements", "notifications", "broadcast"],
      },
    ],
  },
  {
    id: "exit",
    label: "Separation",
    defaultOpen: false,
    items: [
      {
        name: "Exit & Offboarding",
        href: "/exit",
        icon: TrendingDown,
        roles: ALL_ROLES,
        moduleKey: "exit",
        keywords: ["resignation", "clearance", "fnf", "relieving"],
      },
    ],
  },
  {
    id: "insights",
    label: "Insights",
    defaultOpen: false,
    items: [
      {
        name: "Analytics",
        href: "/analytics",
        icon: BarChart3,
        roles: ["customer_admin", "hr_manager", "hr_executive", "hod", "payroll_admin"],
        moduleKey: "analytics",
        keywords: ["dashboard", "metrics", "charts"],
      },
      {
        name: "Reports",
        href: "/reports",
        icon: FileText,
        roles: ["customer_admin", "hr_manager", "hr_executive", "hod", "payroll_admin"],
        moduleKey: "reports",
        keywords: ["export", "download", "summary"],
      },
    ],
  },
  {
    id: "admin",
    label: "Administration",
    defaultOpen: false,
    items: [
      {
        name: "Users",
        href: "/users",
        icon: ShieldCheck,
        roles: ["customer_admin", "hr_manager"],
        moduleKey: "users",
        keywords: ["roles", "access", "rbac"],
      },
      {
        name: "Roles & Permissions",
        href: "/roles-permissions",
        icon: Lock,
        roles: ["customer_admin", "hr_manager"],
        moduleKey: "roles-permissions",
        keywords: ["rbac", "access control", "permissions", "policies"],
      },
      {
        name: "Audit Logs",
        href: "/audit-logs",
        icon: FileText,
        roles: ["customer_admin", "hr_manager"],
        moduleKey: "audit-logs",
        keywords: ["activity", "trail", "history"],
      },
      {
        name: "Settings",
        href: "/settings",
        icon: Settings,
        roles: ["customer_admin", "hr_manager"],
        moduleKey: "system-config",
        keywords: ["configuration", "preferences", "system"],
      },
      {
        name: "Security",
        href: "/settings/security",
        icon: Shield,
        roles: ["customer_admin", "hr_manager", "hr_executive", "hod", "payroll_admin", "employee"],
        keywords: ["password", "mfa", "2fa", "totp", "two-factor", "authenticator"],
      },
      {
        name: "API Keys",
        href: "/settings/api-keys",
        icon: KeyRound,
        roles: ["customer_admin"],
        moduleKey: "api-keys",
        keywords: ["integration", "external", "token", "developer"],
      },
      {
        name: "API Docs",
        href: "/settings/api-docs",
        icon: BookOpen,
        roles: ["customer_admin"],
        keywords: ["openapi", "swagger", "reference", "developer", "integration"],
      },
      {
        name: "Billing & Subscription",
        href: "/billing",
        icon: CreditCard,
        roles: ["customer_admin"],
        moduleKey: "billing",
        keywords: ["plan", "invoice", "payment", "subscription", "razorpay", "stripe", "upgrade", "renewal", "gst"],
      },
    ],
  },
];

export const ALL_NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

export function resolveActiveItem(pathname: string): NavItem | undefined {
  let best: NavItem | undefined;
  for (const item of ALL_NAV_ITEMS) {
    if (pathname === item.href || pathname.startsWith(item.href + "/")) {
      if (!best || item.href.length > best.href.length) best = item;
    }
  }
  return best;
}

export function filterNavByRole(role: Role): NavGroup[] {
  return NAV_GROUPS
    .map((g) => ({ ...g, items: g.items.filter((i) => i.roles.includes(role)) }))
    .filter((g) => g.items.length > 0);
}

export function filterNavByPermissions(permissionsMap: Record<string, string[]>): NavGroup[] {
  return NAV_GROUPS
    .map((g) => ({
      ...g,
      items: g.items.filter((i) => {
        if (!i.moduleKey) return true;
        // If module is not in the permissions map, fall back to role-based visibility (show it)
        if (!(i.moduleKey in permissionsMap)) return true;
        return (permissionsMap[i.moduleKey] ?? []).includes("view");
      }),
    }))
    .filter((g) => g.items.length > 0);
}
