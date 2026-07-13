import {
  useGetDashboardKpis,
  getGetDashboardKpisQueryKey,
  useGetDashboardRecentActivity,
  useGetDashboardHeadcountByDepartment,
  useGetDashboardEmployeeStatusBreakdown,
  useGetDashboardExpiringCertifications,
  getGetDashboardExpiringCertificationsQueryKey,
} from "@workspace/api-client-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Users, UserCheck, Clock, UserPlus,
  Activity, BadgeCheck, FileText, ChevronRight,
  ArrowUpRight, ArrowDownRight, ClipboardList,
  BarChart2, Headphones, GitBranch,
  CheckSquare, Award, Calendar, Building2,
  Banknote, UserX, TrendingUp, Briefcase,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { ClockInWidget } from "@/components/attendance/ClockInWidget";
import { useCurrentHrmsUser } from "@/lib/useCurrentHrmsUser";
import { usePermission } from "@/lib/useMyPermissions";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

const HR_ADMIN_ROLES = ["customer_admin", "hr_manager", "hr_executive"] as const;
const MANAGER_ROLES  = ["customer_admin", "hr_manager", "hr_executive", "hod", "payroll_admin"] as const;

const STATUS_PALETTE: Record<string, { bar: string; bg: string; text: string }> = {
  "Active":              { bar: "#10b981", bg: "bg-emerald-500", text: "text-emerald-700" },
  "Pre-Joining":         { bar: "#3b82f6", bg: "bg-blue-500",    text: "text-blue-700" },
  "Notice Period":       { bar: "#f59e0b", bg: "bg-amber-500",   text: "text-amber-700" },
  "On Leave of Absence": { bar: "#8b5cf6", bg: "bg-violet-500",  text: "text-violet-700" },
  "Suspended":           { bar: "#ef4444", bg: "bg-red-500",     text: "text-red-700" },
  "Separated":           { bar: "#9ca3af", bg: "bg-gray-400",    text: "text-gray-600" },
  "Probation":           { bar: "#06b6d4", bg: "bg-cyan-500",    text: "text-cyan-700" },
};

// ─── Gradient KPI Hero Card ────────────────────────────────────────────────────
function HeroKpiCard({
  icon: Icon,
  label,
  value,
  sub,
  from,
  to,
  shadow,
  trendUp,
  trendLabel,
  loading,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  from: string;
  to: string;
  shadow: string;
  trendUp?: boolean;
  trendLabel?: string;
  loading?: boolean;
}) {
  return (
    <div
      className={cn("relative rounded-2xl p-5 text-white overflow-hidden cursor-pointer group transition-all hover:-translate-y-0.5", shadow)}
      style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
    >
      <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-white/10 blur-2xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-20 h-20 rounded-full bg-black/10 blur-xl pointer-events-none" />
      <div className="relative flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
          <Icon className="w-5 h-5 text-white" />
        </div>
        {trendLabel && !loading && (
          <div className={cn(
            "flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-sm",
          )}>
            {trendUp
              ? <ArrowUpRight className="w-3.5 h-3.5" />
              : <ArrowDownRight className="w-3.5 h-3.5" />}
            {trendUp ? "↑" : "↓"} {trendLabel}
          </div>
        )}
        <ChevronRight className="w-4 h-4 text-white/50 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
      </div>
      <div className="relative">
        <p className="text-sm font-medium text-white/70 mb-1">{label}</p>
        {loading ? (
          <div className="h-10 w-24 rounded-lg bg-white/20 animate-pulse" />
        ) : (
          <p className="text-4xl font-bold tracking-tight tabular-nums">{value}</p>
        )}
        {sub && !loading && (
          <p className="text-xs text-white/60 mt-1.5">{sub}</p>
        )}
      </div>
    </div>
  );
}

// ─── Secondary Quick Stat Card ─────────────────────────────────────────────────
function QuickStatCard({
  icon: Icon,
  iconBg,
  iconColor,
  label,
  value,
  href,
  loading,
}: {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string | number;
  href?: string;
  loading?: boolean;
}) {
  const inner = (
    <div className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-gray-100 hover:shadow-md hover:border-gray-200 transition-all cursor-pointer group">
      <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0", iconBg)}>
        <Icon className={cn("w-5 h-5", iconColor)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500 leading-none mb-1">{label}</p>
        {loading ? (
          <Skeleton className="h-6 w-10" />
        ) : (
          <p className="text-xl font-bold text-gray-800 tabular-nums leading-none">{value}</p>
        )}
      </div>
      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-0.5 transition-all shrink-0" />
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

// ─── Quick Action Button ───────────────────────────────────────────────────────
function QuickActionBtn({
  icon: Icon,
  label,
  iconBg,
  iconColor,
  href,
}: {
  icon: React.ElementType;
  label: string;
  iconBg: string;
  iconColor: string;
  href: string;
}) {
  return (
    <Link href={href}>
      <div className="flex flex-col items-center gap-2.5 p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer group">
        <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm", iconBg)}>
          <Icon className={cn("w-5 h-5", iconColor)} />
        </div>
        <span className="text-xs font-medium text-gray-600 text-center leading-tight">{label}</span>
      </div>
    </Link>
  );
}

// ─── Department Headcount Chart ────────────────────────────────────────────────
function DeptHeadcountChart() {
  const { data: rawDepts } = useGetDashboardHeadcountByDepartment();
  const depts = Array.isArray(rawDepts) ? rawDepts : [];
  const top8 = depts.slice(0, 8);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 h-full">
      <div className="flex items-start justify-between mb-1">
        <div>
          <p className="text-base font-semibold text-gray-800">Headcount by Department</p>
          <p className="text-xs text-gray-500 mt-0.5">Current workforce distribution</p>
        </div>
        <Link href="/employees">
          <span className="text-xs font-semibold text-violet-600 hover:text-violet-800 flex items-center gap-1">
            View All <ChevronRight className="w-3.5 h-3.5" />
          </span>
        </Link>
      </div>

      {!top8.length ? (
        <div className="h-52 flex flex-col items-center justify-center text-gray-400 gap-2">
          <Building2 className="w-8 h-8 opacity-40" />
          <span className="text-sm">No department data yet</span>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={top8} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="deptGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#7c3aed" stopOpacity={1} />
                <stop offset="100%" stopColor="#a78bfa" stopOpacity={0.7} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis
              dataKey="departmentName"
              tick={{ fontSize: 10, fill: "#9ca3af" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: string) => v.length > 8 ? v.slice(0, 7) + "…" : v}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              allowDecimals={false}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: 10,
                fontSize: 13,
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              }}
              cursor={{ fill: "#f5f3ff" }}
            />
            <Bar dataKey="count" fill="url(#deptGrad)" radius={[6, 6, 0, 0]} name="Employees" maxBarSize={44} />
          </BarChart>
        </ResponsiveContainer>
      )}

      {top8.length > 0 && (
        <div className="mt-2 pt-3 border-t border-gray-50">
          <p className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wide">Budget Utilization</p>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-violet-500 to-violet-400 rounded-full" style={{ width: "0%" }} />
            </div>
            <span className="text-xs font-semibold text-violet-600">0%</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Workforce Summary (right panel) ──────────────────────────────────────────
function WorkforceSummary({ kpis, loading }: { kpis: Record<string, number> | undefined; loading: boolean }) {
  const { data: statusRaw } = useGetDashboardEmployeeStatusBreakdown();
  const statuses = Array.isArray(statusRaw) ? statusRaw : [];
  const total = statuses.reduce((s, r) => s + (r.count ?? 0), 0);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 h-full flex flex-col">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-base font-semibold text-gray-800">Workforce Summary</p>
          <p className="text-xs text-gray-500 mt-0.5">Across all departments</p>
        </div>
        <Link href="/employees">
          <span className="text-xs font-semibold text-violet-600 hover:text-violet-800 flex items-center gap-1">
            All Employees <ChevronRight className="w-3.5 h-3.5" />
          </span>
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}
        </div>
      ) : (
        <>
          <div className="mb-2">
            <p className="text-4xl font-bold text-gray-800 tabular-nums">{kpis?.totalHeadcount ?? 0}</p>
            <p className="text-sm text-gray-500 mt-0.5">Total headcount</p>
          </div>

          <div className="space-y-3 flex-1">
            {statuses.map((s) => {
              const pct = total > 0 ? Math.round((s.count / total) * 100) : 0;
              const pal = STATUS_PALETTE[s.status] ?? { bar: "#9ca3af", bg: "bg-gray-400", text: "text-gray-600" };
              return (
                <div key={s.status}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <span className={cn("w-2 h-2 rounded-full inline-block", pal.bg)} />
                      <span className="text-sm text-gray-700">{s.status}</span>
                    </div>
                    <span className={cn("text-sm font-bold", pal.text)}>{s.count.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, background: pal.bar }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3">
              <p className="text-xs text-emerald-600 font-medium mb-0.5">Joiners (30d)</p>
              <p className="text-xl font-bold text-emerald-700 tabular-nums">
                {kpis?.newJoinersThisMonth ?? 0}
              </p>
            </div>
            <div className="rounded-xl bg-red-50 border border-red-100 p-3">
              <p className="text-xs text-red-500 font-medium mb-0.5">On Leave Now</p>
              <p className="text-xl font-bold text-red-600 tabular-nums">
                {kpis?.onLeaveToday ?? 0}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Status Aging Summary (like Aging Summary in reference) ───────────────────
function StatusAgingPanel({ kpis, loading }: { kpis: Record<string, number> | undefined; loading: boolean }) {
  const { data: statusRaw } = useGetDashboardEmployeeStatusBreakdown();
  const statuses = Array.isArray(statusRaw) ? statusRaw : [];

  const noticePeriod = statuses.find((s) => s.status === "Notice Period")?.count ?? 0;
  const preJoining   = statuses.find((s) => s.status === "Pre-Joining")?.count ?? 0;
  const activeCount  = statuses.find((s) => s.status === "Active")?.count ?? 0;
  const totalCount   = kpis?.totalHeadcount ?? 0;

  const attritionRate = kpis?.attritionRate ?? 0;
  const attendanceRate = totalCount > 0 && activeCount > 0
    ? parseFloat(((activeCount / totalCount) * 100).toFixed(1))
    : kpis?.attendanceRateToday ?? 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-base font-semibold text-gray-800">Workforce Health</p>
          <p className="text-xs text-gray-500 mt-0.5">Active, pipeline & attrition</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                <span className="text-sm font-medium text-gray-700">Active Employees</span>
              </div>
              <span className="text-sm font-bold text-emerald-700">{activeCount.toLocaleString("en-IN")}</span>
            </div>
            <div className="flex items-center gap-2 mb-1">
              <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${attendanceRate}%` }} />
              </div>
              <span className="text-xs text-gray-500 tabular-nums">{attendanceRate}%</span>
            </div>
            <p className="text-xs text-gray-400">• Active · • In Probation · • WFH</p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
                <span className="text-sm font-medium text-gray-700">Pre-Joining Pipeline</span>
              </div>
              <span className="text-sm font-bold text-blue-700">{preJoining.toLocaleString("en-IN")}</span>
            </div>
            <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full"
                style={{ width: `${totalCount > 0 ? Math.round((preJoining / totalCount) * 100) : 0}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                <span className="text-sm font-medium text-gray-700">Notice Period</span>
              </div>
              <span className="text-sm font-bold text-amber-700">{noticePeriod.toLocaleString("en-IN")}</span>
            </div>
            <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full"
                style={{ width: `${totalCount > 0 ? Math.round((noticePeriod / totalCount) * 100) : 0}%` }}
              />
            </div>
          </div>

          <div className="pt-2 mt-1 border-t border-dashed border-gray-100 flex items-center gap-2 text-sm">
            {noticePeriod > 0 && (
              <div className="flex items-center gap-1.5 text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-1.5">
                <UserX className="w-3.5 h-3.5 shrink-0" />
                <span className="text-xs font-medium">{noticePeriod} leaving soon</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 text-gray-500 bg-gray-50 border border-gray-100 rounded-lg px-3 py-1.5">
              <TrendingUp className="w-3.5 h-3.5 shrink-0" />
              <span className="text-xs font-medium">Attrition {attritionRate}%</span>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-violet-500" />
            <span className="text-sm font-semibold text-gray-700">Compliance Status</span>
          </div>
          <span className="text-xs text-violet-600 font-semibold">{format(new Date(), "MMM yyyy")}</span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="text-center p-2 bg-gray-50 rounded-lg">
            <p className="text-gray-500 mb-1">Onboarding</p>
            <span className={cn("font-semibold px-2 py-0.5 rounded-full text-[10px]", preJoining > 0 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700")}>
              {preJoining > 0 ? "Pending" : "Done"}
            </span>
          </div>
          <div className="text-center p-2 bg-gray-50 rounded-lg">
            <p className="text-gray-500 mb-1">Certifications</p>
            <span className="font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px]">Active</span>
          </div>
          <div className="text-center p-2 bg-gray-50 rounded-lg">
            <p className="text-gray-500 mb-1">Payroll</p>
            <span className="font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px]">Filed</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Recent Activity Feed ──────────────────────────────────────────────────────
const MODULE_ICON: Record<string, { icon: React.ElementType; bg: string; color: string }> = {
  Employees:   { icon: Users,         bg: "bg-blue-100",   color: "text-blue-600" },
  Leave:       { icon: Calendar,      bg: "bg-green-100",  color: "text-green-600" },
  Payroll:     { icon: Banknote,      bg: "bg-violet-100", color: "text-violet-600" },
  Attendance:  { icon: Clock,         bg: "bg-amber-100",  color: "text-amber-600" },
  Recruitment: { icon: Briefcase,     bg: "bg-pink-100",   color: "text-pink-600" },
  Performance: { icon: TrendingUp,    bg: "bg-cyan-100",   color: "text-cyan-600" },
  Onboarding:  { icon: UserPlus,      bg: "bg-orange-100", color: "text-orange-600" },
  Helpdesk:    { icon: Headphones,    bg: "bg-red-100",    color: "text-red-600" },
  Documents:   { icon: FileText,      bg: "bg-teal-100",   color: "text-teal-600" },
};

const ACTION_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  CREATE:   { bg: "bg-green-50 border border-green-200",  text: "text-green-700",  label: "Created" },
  UPDATE:   { bg: "bg-blue-50 border border-blue-200",    text: "text-blue-700",   label: "Updated" },
  DELETE:   { bg: "bg-red-50 border border-red-200",      text: "text-red-700",    label: "Deleted" },
  APPROVE:  { bg: "bg-emerald-50 border border-emerald-200", text: "text-emerald-700", label: "Approved" },
  REJECT:   { bg: "bg-red-50 border border-red-200",      text: "text-red-700",    label: "Rejected" },
  SUBMIT:   { bg: "bg-amber-50 border border-amber-200",  text: "text-amber-700",  label: "Submitted" },
  LOGIN:    { bg: "bg-gray-50 border border-gray-200",    text: "text-gray-600",   label: "Login" },
  LOGOUT:   { bg: "bg-gray-50 border border-gray-200",    text: "text-gray-600",   label: "Logout" },
};

function RecentActivityFeed() {
  const { data: activityRaw } = useGetDashboardRecentActivity({ limit: 8 });
  const activity = Array.isArray(activityRaw) ? activityRaw : [];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 h-full flex flex-col">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-base font-semibold text-gray-800">Recent Activity</p>
          <p className="text-xs text-gray-500 mt-0.5">Latest system events</p>
        </div>
        <Link href="/audit-logs">
          <span className="text-xs font-semibold text-violet-600 hover:text-violet-800 flex items-center gap-1">
            View All <ChevronRight className="w-3.5 h-3.5" />
          </span>
        </Link>
      </div>

      {!activity.length ? (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-2 py-8">
          <Activity className="w-8 h-8 opacity-30" />
          <span className="text-sm">No recent activity</span>
        </div>
      ) : (
        <div className="flex-1 divide-y divide-gray-50 overflow-y-auto">
          {activity.map((item) => {
            const mod  = MODULE_ICON[item.module] ?? { icon: Activity, bg: "bg-gray-100", color: "text-gray-500" };
            const act  = ACTION_BADGE[item.type?.toUpperCase?.()] ?? null;
            const ModIcon = mod.icon;
            return (
              <div key={item.id} className="py-3 flex items-start gap-3 group">
                <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5", mod.bg)}>
                  <ModIcon className={cn("w-4 h-4", mod.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700 leading-snug">
                    <span className="font-medium text-gray-900">{item.actorName}</span>
                    {" · "}
                    <span className="text-gray-500">{item.module}</span>
                    {item.description?.includes("#") && (
                      <span className="text-gray-400 text-xs">
                        {" · "}
                        {item.description.split("#")[1]?.split(" ")[0] ? `#${item.description.split("#")[1].split(" ")[0]}` : ""}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                  </p>
                </div>
                {act && (
                  <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 mt-1", act.bg, act.text)}>
                    {act.label}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Expiring Certs (compact) ──────────────────────────────────────────────────
function ExpiringCertsCompact() {
  const { data: certsRaw, isLoading } = useGetDashboardExpiringCertifications(
    { days: 60 },
    { query: { queryKey: getGetDashboardExpiringCertificationsQueryKey({ days: 60 }) } },
  );
  const certs = Array.isArray(certsRaw) ? certsRaw : [];
  if (!isLoading && !certs.length) return null;

  return (
    <div className="bg-white rounded-2xl border border-amber-100 p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <BadgeCheck className="w-4 h-4 text-amber-500" />
          <span className="text-sm font-semibold text-gray-800">Expiring Certifications</span>
          <span className="text-[10px] font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
            {certs.length} in 60d
          </span>
        </div>
        <Link href="/employees">
          <span className="text-xs font-semibold text-violet-600 hover:text-violet-800 flex items-center gap-1">
            View All <ChevronRight className="w-3.5 h-3.5" />
          </span>
        </Link>
      </div>
      <div className="divide-y divide-gray-50">
        {isLoading
          ? [0, 1].map((i) => <Skeleton key={i} className="h-10 w-full my-1" />)
          : certs.slice(0, 4).map((c) => {
              const isExpired = c.daysUntilExpiry < 0;
              const isUrgent  = !isExpired && c.daysUntilExpiry <= 7;
              return (
                <div key={c.id} className="py-2.5 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                    <Award className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{c.employeeName}</p>
                    <p className="text-xs text-gray-500 truncate">{c.name}</p>
                  </div>
                  <span className={cn(
                    "text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0",
                    isExpired ? "bg-red-100 text-red-700" :
                    isUrgent  ? "bg-orange-100 text-orange-700" :
                    "bg-yellow-100 text-yellow-700"
                  )}>
                    {isExpired ? `${Math.abs(c.daysUntilExpiry)}d ago` : `${c.daysUntilExpiry}d left`}
                  </span>
                </div>
              );
            })
        }
      </div>
    </div>
  );
}

// ─── Employee Self-Service View ────────────────────────────────────────────────
function EmployeeView({ firstName, greeting }: { firstName: string; greeting: string }) {
  const today = format(new Date(), "EEEE, MMMM d, yyyy");
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-2xl font-bold text-gray-800">{greeting}{firstName ? `, ${firstName}` : ""}!</p>
          <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" /> {today}
          </p>
        </div>
      </div>
      <div className="grid md:grid-cols-3 gap-5">
        <div className="md:col-span-1">
          <ClockInWidget />
        </div>
        <div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-3 content-start">
          {[
            { icon: Calendar,    label: "My Leave",      href: "/leave",              iconBg: "bg-green-100",  iconColor: "text-green-600" },
            { icon: FileText,    label: "My Payslip",    href: "/payroll/payslips",   iconBg: "bg-violet-100", iconColor: "text-violet-600" },
            { icon: CheckSquare, label: "My Attendance", href: "/my-attendance",      iconBg: "bg-amber-100",  iconColor: "text-amber-600" },
            { icon: Clock,       label: "WFH Request",   href: "/wfh",                iconBg: "bg-blue-100",   iconColor: "text-blue-600" },
            { icon: Headphones,  label: "Helpdesk",      href: "/helpdesk",           iconBg: "bg-red-100",    iconColor: "text-red-600" },
            { icon: FileText,    label: "Documents",     href: "/documents",          iconBg: "bg-teal-100",   iconColor: "text-teal-600" },
          ].map((a) => (
            <Link key={a.label} href={a.href}>
              <div className="flex items-center gap-3 p-3.5 bg-white rounded-xl border border-gray-100 hover:shadow-md hover:border-gray-200 transition-all cursor-pointer">
                <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", a.iconBg)}>
                  <a.icon className={cn("w-4 h-4", a.iconColor)} />
                </div>
                <span className="text-sm font-medium text-gray-700">{a.label}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
      <RecentActivityFeed />
    </div>
  );
}

// ─── Main Dashboard ────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { hrmsUser } = useCurrentHrmsUser();
  const role = hrmsUser?.role ?? "employee";

  const isEmployee   = role === "employee";
  const isHod        = role === "hod";
  const isAnyManager = (MANAGER_ROLES as readonly string[]).includes(role);
  const isHrAdmin    = (HR_ADMIN_ROLES as readonly string[]).includes(role);
  const showClockWidget = !!hrmsUser?.employeeId;

  const needsKpis = isAnyManager || isHod;
  const { data: kpisRaw, isLoading: kpisLoading } = useGetDashboardKpis({
    query: { enabled: needsKpis, queryKey: getGetDashboardKpisQueryKey() },
  });
  const kpis = kpisRaw as Record<string, number> | undefined;

  const canLeave       = usePermission("leave", "view");
  const canAttendance  = usePermission("attendance", "view");
  const canPayroll     = usePermission("payroll", "view");
  const canEmployees   = usePermission("employees", "view");
  const canRecruitment = usePermission("recruitment", "view");
  const canCerts       = usePermission("employees", "approve");

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  const firstName = hrmsUser?.name?.split(" ")[0] ?? "";
  const today = format(new Date(), "EEEE, MMMM d, yyyy");

  if (isEmployee && !isHod && !isAnyManager) {
    return (
      <div className="max-w-4xl mx-auto">
        <EmployeeView firstName={firstName} greeting={greeting} />
      </div>
    );
  }

  const attritionRate = kpis?.attritionRate ?? 0;

  const quickActions = [
    canEmployees   && { icon: UserPlus,      label: "Add Employee",   href: "/employees/new",   iconBg: "bg-violet-100", iconColor: "text-violet-600" },
    canLeave       && { icon: CheckSquare,   label: "Approvals",      href: "/approvals",       iconBg: "bg-green-100",  iconColor: "text-green-600" },
    showClockWidget && { icon: Clock,         label: "Attendance",     href: "/attendance",      iconBg: "bg-blue-100",   iconColor: "text-blue-600" },
    canPayroll     && { icon: Banknote,       label: "Payroll",        href: "/payroll",         iconBg: "bg-amber-100",  iconColor: "text-amber-600" },
                       { icon: GitBranch,     label: "Org Chart",      href: "/org-chart",       iconBg: "bg-cyan-100",   iconColor: "text-cyan-600" },
    canRecruitment && { icon: Briefcase,      label: "Recruitment",    href: "/recruitment",     iconBg: "bg-pink-100",   iconColor: "text-pink-600" },
                       { icon: BarChart2,     label: "Reports",        href: "/analytics",       iconBg: "bg-orange-100", iconColor: "text-orange-600" },
                       { icon: Headphones,    label: "Helpdesk",       href: "/helpdesk",        iconBg: "bg-red-100",    iconColor: "text-red-600" },
  ].filter(Boolean) as { icon: React.ElementType; label: string; href: string; iconBg: string; iconColor: string }[];

  return (
    <div className="space-y-5">

      {/* ── Welcome Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            {greeting}{firstName ? `, ${firstName}` : ""}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            {today} · at a glance
          </p>
        </div>
        {showClockWidget && (
          <div className="hidden lg:block">
            <ClockInWidget />
          </div>
        )}
      </div>

      {/* ── 4 Hero KPI Cards ── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <HeroKpiCard
          icon={Users}
          label="Total Headcount"
          value={kpisLoading ? "—" : (kpis?.totalHeadcount ?? 0)}
          sub={`Active: ${kpis?.activeEmployees ?? 0}`}
          from="#7c3aed"
          to="#6d28d9"
          shadow="shadow-lg shadow-violet-500/25"
          trendUp={attritionRate < 5}
          trendLabel={attritionRate < 5 ? "Healthy" : "High attrition"}
          loading={kpisLoading}
        />
        <HeroKpiCard
          icon={UserCheck}
          label="Active Employees"
          value={kpisLoading ? "—" : (kpis?.activeEmployees ?? 0)}
          sub="Currently working"
          from="#0891b2"
          to="#0e7490"
          shadow="shadow-lg shadow-cyan-500/25"
          trendUp
          trendLabel="Up"
          loading={kpisLoading}
        />
        <HeroKpiCard
          icon={UserPlus}
          label="New Joiners MTD"
          value={kpisLoading ? "—" : (kpis?.newJoinersThisMonth ?? 0)}
          sub="Joined this month"
          from="#059669"
          to="#047857"
          shadow="shadow-lg shadow-emerald-500/25"
          trendUp={(kpis?.newJoinersThisMonth ?? 0) > 0}
          trendLabel={(kpis?.newJoinersThisMonth ?? 0) > 0 ? "Up" : "Flat"}
          loading={kpisLoading}
        />
        <HeroKpiCard
          icon={Clock}
          label="On Leave Today"
          value={kpisLoading ? "—" : (kpis?.onLeaveToday ?? 0)}
          sub="Absence of leave"
          from="#d97706"
          to="#b45309"
          shadow="shadow-lg shadow-amber-500/25"
          trendUp={false}
          trendLabel="Down"
          loading={kpisLoading}
        />
      </div>

      {/* ── Today's Priorities (HR only) ── */}
      {isHrAdmin && (kpis?.pendingApprovals ?? 0) > 0 && (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-amber-200 flex items-center justify-center shrink-0">
              <ClipboardList className="w-4 h-4 text-amber-700" />
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-800">
                {kpis?.pendingApprovals} item{(kpis?.pendingApprovals ?? 0) !== 1 ? "s" : ""} need your attention
              </p>
              <p className="text-xs text-amber-600 flex flex-wrap gap-2 mt-0.5">
                {(kpis?.pendingLeaveCount ?? 0) > 0 && <span>{kpis?.pendingLeaveCount} leave</span>}
                {(kpis?.pendingWfhCount ?? 0) > 0 && <span>· {kpis?.pendingWfhCount} WFH</span>}
                {(kpis?.pendingExpenseCount ?? 0) > 0 && <span>· {kpis?.pendingExpenseCount} expense</span>}
                {(kpis?.pendingRegCount ?? 0) > 0 && <span>· {kpis?.pendingRegCount} regularization</span>}
              </p>
            </div>
          </div>
          <Link href="/approvals">
            <button className="shrink-0 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-lg transition-colors">
              Review Now →
            </button>
          </Link>
        </div>
      )}

      {/* ── Secondary Quick Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <QuickStatCard
          icon={Calendar}
          iconBg="bg-green-100"
          iconColor="text-green-600"
          label="Pending Leaves"
          value={kpis?.pendingLeaveCount ?? 0}
          href="/approvals"
          loading={kpisLoading}
        />
        <QuickStatCard
          icon={ClipboardList}
          iconBg="bg-violet-100"
          iconColor="text-violet-600"
          label="All Pending"
          value={kpis?.pendingApprovals ?? 0}
          href="/approvals"
          loading={kpisLoading}
        />
        <QuickStatCard
          icon={UserX}
          iconBg="bg-amber-100"
          iconColor="text-amber-600"
          label="Notice Period"
          value={kpis?.noticePeriodCount ?? 0}
          href="/employees"
          loading={kpisLoading}
        />
        <QuickStatCard
          icon={Briefcase}
          iconBg="bg-pink-100"
          iconColor="text-pink-600"
          label="Open Positions"
          value={kpis?.openPositions ?? 0}
          href="/recruitment"
          loading={kpisLoading}
        />
        <QuickStatCard
          icon={Users}
          iconBg="bg-blue-100"
          iconColor="text-blue-600"
          label="Departments"
          value={kpis?.departmentCount ?? 0}
          href="/departments"
          loading={kpisLoading}
        />
        <QuickStatCard
          icon={BadgeCheck}
          iconBg="bg-orange-100"
          iconColor="text-orange-600"
          label="Certs Expiring"
          value={kpis?.certsExpiringCount ?? 0}
          href="/employees"
          loading={kpisLoading}
        />
      </div>

      {/* ── Quick Actions ── */}
      <div className="bg-white rounded-2xl border border-gray-100 px-4 py-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 px-2">Quick Actions</p>
        <div className="grid grid-cols-4 sm:grid-cols-8 divide-x divide-gray-100">
          {quickActions.slice(0, 8).map((a) => (
            <QuickActionBtn key={a.label} {...a} />
          ))}
        </div>
      </div>

      {/* ── Charts Row ── */}
      <div className="grid lg:grid-cols-5 gap-5">
        <div className="lg:col-span-3">
          <DeptHeadcountChart />
        </div>
        <div className="lg:col-span-2">
          <WorkforceSummary kpis={kpis} loading={kpisLoading} />
        </div>
      </div>

      {/* ── Bottom Row ── */}
      <div className="grid lg:grid-cols-5 gap-5">
        <div className="lg:col-span-2">
          <StatusAgingPanel kpis={kpis} loading={kpisLoading} />
        </div>
        <div className="lg:col-span-3">
          <RecentActivityFeed />
        </div>
      </div>

      {/* ── Expiring Certifications (HR Admins only) ── */}
      {(isHrAdmin || canCerts) && <ExpiringCertsCompact />}

    </div>
  );
}

