import {
  useGetDashboardKpis,
  getGetDashboardKpisQueryKey,
  useGetDashboardRecentActivity,
  useGetDashboardHeadcountByDepartment,
  useGetDashboardEmployeeStatusBreakdown,
  useGetDashboardExpiringCertifications,
  getGetDashboardExpiringCertificationsQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  Users, UserCheck, TrendingDown, Calendar, BriefcaseBusiness, Clock,
  UserX, Activity, BadgeCheck, FileText, Headphones, BarChart2,
  CheckCircle2, ChevronRight, Banknote, ClipboardList, Award,
  CalendarClock, FileCheck, Bell,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/stat-card";
import { ClockInWidget } from "@/components/attendance/ClockInWidget";
import { useCurrentHrmsUser } from "@/lib/useCurrentHrmsUser";
import { usePermission } from "@/lib/useMyPermissions";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const HR_ADMIN_ROLES = ["customer_admin", "hr_manager", "hr_executive"] as const;
const MANAGER_ROLES = ["customer_admin", "hr_manager", "hr_executive", "hod", "payroll_admin"] as const;

const STATUS_COLORS: Record<string, string> = {
  "Active": "hsl(145 58% 36%)",
  "Pre-Joining": "hsl(217 91% 60%)",
  "Notice Period": "hsl(38 92% 50%)",
  "On Leave of Absence": "hsl(262 80% 50%)",
  "Suspended": "hsl(0 72% 51%)",
  "Separated": "hsl(0 0% 60%)",
};

const MODULE_COLORS: Record<string, string> = {
  Employees: "bg-blue-500",
  Leave: "bg-green-500",
  Payroll: "bg-violet-500",
  Attendance: "bg-amber-500",
  Recruitment: "bg-pink-500",
  Performance: "bg-cyan-500",
  Onboarding: "bg-orange-500",
  Helpdesk: "bg-red-500",
  Documents: "bg-teal-500",
};

// ─── Quick Action Card ────────────────────────────────────────────────────────
function QuickAction({
  icon: Icon,
  label,
  description,
  href,
  accent = "default",
}: {
  icon: React.ElementType;
  label: string;
  description: string;
  href: string;
  accent?: "blue" | "green" | "violet" | "amber" | "red" | "cyan" | "pink" | "teal" | "default";
}) {
  const accentMap: Record<string, string> = {
    blue:    "text-blue-600   bg-blue-50   dark:bg-blue-950/40   dark:text-blue-400",
    green:   "text-green-600  bg-green-50  dark:bg-green-950/40  dark:text-green-400",
    violet:  "text-violet-600 bg-violet-50 dark:bg-violet-950/40 dark:text-violet-400",
    amber:   "text-amber-600  bg-amber-50  dark:bg-amber-950/40  dark:text-amber-400",
    red:     "text-red-600    bg-red-50    dark:bg-red-950/40    dark:text-red-400",
    cyan:    "text-cyan-600   bg-cyan-50   dark:bg-cyan-950/40   dark:text-cyan-400",
    pink:    "text-pink-600   bg-pink-50   dark:bg-pink-950/40   dark:text-pink-400",
    teal:    "text-teal-600   bg-teal-50   dark:bg-teal-950/40   dark:text-teal-400",
    default: "text-primary    bg-primary/10",
  };
  return (
    <Link href={href}>
      <Card className="border-border hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer group">
        <CardContent className="p-4 flex items-center gap-3">
          <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0", accentMap[accent])}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">{label}</p>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{description}</p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
        </CardContent>
      </Card>
    </Link>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">{title}</h2>
      {action}
    </div>
  );
}

// ─── Recent Activity Feed ─────────────────────────────────────────────────────
function ActivityFeed({ limit = 8 }: { limit?: number }) {
  const { data: activityRaw } = useGetDashboardRecentActivity({ limit });
  const activity = Array.isArray(activityRaw) ? activityRaw : [];

  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {!activity.length ? (
          <div className="py-10 flex flex-col items-center justify-center text-muted-foreground gap-2">
            <Activity className="w-8 h-8 opacity-30" />
            <span className="text-sm">No recent activity</span>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {activity.map((item) => {
              const dotColor = MODULE_COLORS[item.module] ?? "bg-muted-foreground";
              return (
                <div key={item.id} className="py-3 flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${dotColor}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground leading-snug">{item.description}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {item.actorName} · {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded font-medium shrink-0 mt-0.5">
                    {item.module}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Expiring Certifications ──────────────────────────────────────────────────
function ExpiringCerts() {
  const { data: expiringCertsRaw, isLoading } = useGetDashboardExpiringCertifications(
    { days: 60 },
    { query: { queryKey: getGetDashboardExpiringCertificationsQueryKey({ days: 60 }) } }
  );
  const certs = Array.isArray(expiringCertsRaw) ? expiringCertsRaw : [];

  return (
    <Card className="border-border">
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <BadgeCheck className="w-4 h-4 text-primary" />
          Expiring Certifications
        </CardTitle>
        <div className="flex items-center gap-3 flex-wrap">
          {[
            { bucket: "expired", color: "bg-red-500",    label: "Expired" },
            { bucket: "7",       color: "bg-orange-500", label: "≤7d" },
            { bucket: "30",      color: "bg-amber-500",  label: "≤30d" },
            { bucket: "60",      color: "bg-yellow-500", label: "≤60d" },
          ].map(({ bucket, color, label }) => {
            const count = certs.filter((c) => c.bucket === bucket).length;
            if (!count) return null;
            return (
              <span key={bucket} className="flex items-center gap-1 text-xs text-muted-foreground">
                <span className={`w-2 h-2 rounded-full ${color}`} />
                {label} <span className="font-medium text-foreground">{count}</span>
              </span>
            );
          })}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="w-8 h-8 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-48" />
                  <Skeleton className="h-2.5 w-36" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            ))}
          </div>
        ) : !certs.length ? (
          <div className="py-10 flex flex-col items-center justify-center text-muted-foreground gap-2">
            <BadgeCheck className="w-8 h-8 opacity-30" />
            <span className="text-sm">No certifications expiring in the next 60 days</span>
          </div>
        ) : (
          <div className="divide-y divide-border max-h-80 overflow-y-auto">
            {certs.map((c) => {
              const badgeClass =
                c.bucket === "expired" ? "bg-red-500/10 text-red-600 border-red-500/30" :
                c.bucket === "7" ? "bg-orange-500/10 text-orange-600 border-orange-500/30" :
                c.bucket === "30" ? "bg-amber-500/10 text-amber-700 border-amber-500/30" :
                "bg-yellow-500/10 text-yellow-700 border-yellow-500/30";
              const label =
                c.daysUntilExpiry < 0 ? `Expired ${Math.abs(c.daysUntilExpiry)}d ago` :
                c.daysUntilExpiry === 0 ? "Expires today" :
                `In ${c.daysUntilExpiry}d`;
              return (
                <div key={c.id} className="py-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                    <BadgeCheck className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {c.name}
                      <span className="text-muted-foreground font-normal"> · {c.issuingOrganization}</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      <Link href={`/employees/${c.employeeId}`} className="hover:underline text-primary font-medium">
                        {c.employeeName}
                      </Link>
                      {c.departmentName ? ` · ${c.departmentName}` : ""} · expires {c.expiryDate}
                    </p>
                  </div>
                  <Badge variant="outline" className={`text-xs shrink-0 font-medium border ${badgeClass}`}>{label}</Badge>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Headcount Charts ─────────────────────────────────────────────────────────
function HeadcountCharts() {
  const { data: headcountRaw } = useGetDashboardHeadcountByDepartment();
  const { data: statusBreakdownRaw } = useGetDashboardEmployeeStatusBreakdown();
  const headcount = Array.isArray(headcountRaw) ? headcountRaw : [];
  const statusBreakdown = Array.isArray(statusBreakdownRaw) ? statusBreakdownRaw : [];

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-foreground">Headcount by Department</CardTitle>
        </CardHeader>
        <CardContent>
          {!headcount.length ? (
            <div className="h-48 flex flex-col items-center justify-center text-muted-foreground gap-2">
              <Users className="w-8 h-8 opacity-30" />
              <span className="text-sm">No department data yet</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={headcount} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="departmentName" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 13,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                  }}
                  cursor={{ fill: "hsl(var(--muted))" }}
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Headcount" maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-foreground">Employee Status Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {!statusBreakdown.length ? (
            <div className="h-48 flex flex-col items-center justify-center text-muted-foreground gap-2">
              <Activity className="w-8 h-8 opacity-30" />
              <span className="text-sm">No status data yet</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={statusBreakdown}
                  cx="50%" cy="50%"
                  innerRadius={55} outerRadius={82}
                  dataKey="count" nameKey="status"
                  paddingAngle={2} strokeWidth={0}
                >
                  {statusBreakdown.map((entry) => (
                    <Cell key={entry.status} fill={STATUS_COLORS[entry.status] ?? "hsl(var(--muted-foreground))"} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 13,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { hrmsUser } = useCurrentHrmsUser();
  const role = hrmsUser?.role ?? "employee";

  const isEmployee    = role === "employee";
  const isHod         = role === "hod";
  const isPayroll     = role === "payroll_admin";
  const isHrAdmin     = (HR_ADMIN_ROLES as readonly string[]).includes(role);
  const isAnyManager  = (MANAGER_ROLES as readonly string[]).includes(role);
  const showClockWidget = !!hrmsUser?.employeeId;

  // Only load expensive KPIs for roles that need them
  const needsKpis = isAnyManager || isHod;
  const { data: kpis, isLoading: kpisLoading } = useGetDashboardKpis({
    query: { enabled: needsKpis, queryKey: getGetDashboardKpisQueryKey() },
  });

  // Permission gates for quick actions
  const canLeave      = usePermission("leave", "view");
  const canAttendance = usePermission("attendance", "view");
  const canPayroll    = usePermission("payroll", "view");
  const canHelpdesk   = usePermission("helpdesk", "view");
  const canDocuments  = usePermission("documents", "view");
  const canPerformance= usePermission("performance", "view");
  const canEmployees  = usePermission("employees", "view");
  const canRecruitment= usePermission("recruitment", "view");
  const canAnalytics  = usePermission("analytics", "view");
  const canReports    = usePermission("reports", "view");
  const canCerts      = usePermission("employees", "approve");

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  const roleSubtitle: Record<string, string> = {
    customer_admin: "Complete HR operations overview for today.",
    hr_manager:     "HR operations overview — approvals, workforce, and compliance.",
    hr_executive:   "Today's workforce insights and pending tasks.",
    hod:            "Your team at a glance — approvals, attendance, and performance.",
    payroll_admin:  "Payroll and workforce data for the current period.",
    employee:       "Your self-service portal — leave, payslips, and helpdesk.",
  };

  const firstName = hrmsUser?.name?.split(" ")[0] ?? "";

  return (
    <div className="space-y-6">
      {/* ── Page Header ─────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">
          {greeting}{firstName ? `, ${firstName}` : ""}
        </h1>
        <p className="text-muted-foreground mt-0.5 text-sm">
          {roleSubtitle[role] ?? "Welcome to MysticsHR."}
        </p>
      </div>

      {/* ── Clock-in Widget (anyone with employeeId) ─────────────── */}
      {showClockWidget && (
        <div className={cn("grid gap-4", isEmployee ? "md:grid-cols-1" : "md:grid-cols-2")}>
          <ClockInWidget />
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          EMPLOYEE VIEW — self-service focused
      ══════════════════════════════════════════════════════════════ */}
      {isEmployee && (
        <>
          <div className="space-y-3">
            <SectionHeader title="Quick Actions" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {canLeave && (
                <QuickAction
                  icon={Calendar}
                  label="Apply Leave"
                  description="Submit leave requests and check balance"
                  href="/leave"
                  accent="green"
                />
              )}
              {canAttendance && (
                <QuickAction
                  icon={CalendarClock}
                  label="My Attendance"
                  description="View your attendance log and shifts"
                  href="/attendance"
                  accent="amber"
                />
              )}
              {canPayroll && (
                <QuickAction
                  icon={Banknote}
                  label="My Payslips"
                  description="Download salary slips and view earnings"
                  href="/payroll/payslips"
                  accent="violet"
                />
              )}
              {canHelpdesk && (
                <QuickAction
                  icon={Headphones}
                  label="Raise a Ticket"
                  description="Get support for HR queries and issues"
                  href="/helpdesk"
                  accent="red"
                />
              )}
              {canDocuments && (
                <QuickAction
                  icon={FileText}
                  label="My Documents"
                  description="View and download your HR documents"
                  href="/documents"
                  accent="teal"
                />
              )}
              {canPerformance && (
                <QuickAction
                  icon={Award}
                  label="My Performance"
                  description="Goals, reviews, and feedback"
                  href="/performance"
                  accent="cyan"
                />
              )}
            </div>
          </div>
          <ActivityFeed limit={6} />
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════
          HOD VIEW — team approvals and oversight
      ══════════════════════════════════════════════════════════════ */}
      {isHod && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Pending Approvals"
              value={kpisLoading ? "—" : String(kpis?.pendingApprovals ?? 0)}
              icon={CheckCircle2}
              description="Awaiting your action"
              loading={kpisLoading}
              accent={kpis?.pendingApprovals ? "amber" : "default"}
            />
            <StatCard
              title="On Leave Today"
              value={kpisLoading ? "—" : String(kpis?.onLeaveToday ?? 0)}
              icon={Clock}
              description="Team members absent"
              loading={kpisLoading}
              accent="blue"
            />
            <StatCard
              title="Attendance Rate"
              value={kpisLoading ? "—" : `${kpis?.attendanceRateToday ?? 0}%`}
              icon={Activity}
              description="Present today"
              loading={kpisLoading}
              accent="green"
            />
            <StatCard
              title="New Joiners"
              value={kpisLoading ? "—" : String(kpis?.newJoinersThisMonth ?? 0)}
              icon={UserCheck}
              description="This month"
              loading={kpisLoading}
              accent="violet"
            />
          </div>

          <div className="space-y-3">
            <SectionHeader title="Quick Actions" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <QuickAction icon={Calendar}      label="Leave Approvals"     description="Review pending leave requests"    href="/leave"        accent="green"  />
              <QuickAction icon={CalendarClock} label="Attendance"          description="Team attendance view and reports"  href="/attendance"   accent="amber"  />
              {canPerformance && <QuickAction icon={Award}   label="Performance Reviews" description="Review and provide team feedback" href="/performance" accent="cyan"   />}
              {canRecruitment && <QuickAction icon={Users}   label="Recruitment"         description="Job openings and candidates"       href="/recruitment" accent="pink"   />}
              <QuickAction icon={FileCheck}    label="Work Permissions"    description="Approve WFH and late requests"    href="/permissions" accent="teal" />
              <QuickAction icon={Headphones}   label="Helpdesk"           description="Support tickets in your team"      href="/helpdesk"     accent="red"    />
            </div>
          </div>

          <ActivityFeed limit={8} />
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════
          PAYROLL ADMIN VIEW
      ══════════════════════════════════════════════════════════════ */}
      {isPayroll && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Active Employees"
              value={kpisLoading ? "—" : String(kpis?.activeEmployees ?? 0)}
              icon={UserCheck}
              description="On payroll this period"
              loading={kpisLoading}
              accent="green"
            />
            <StatCard
              title="On Leave Today"
              value={kpisLoading ? "—" : String(kpis?.onLeaveToday ?? 0)}
              icon={Clock}
              description="LOP candidates"
              loading={kpisLoading}
              accent="amber"
            />
            <StatCard
              title="Attendance Rate"
              value={kpisLoading ? "—" : `${kpis?.attendanceRateToday ?? 0}%`}
              icon={Activity}
              description="Today's present rate"
              loading={kpisLoading}
              accent="blue"
            />
            <StatCard
              title="Pending Approvals"
              value={kpisLoading ? "—" : String(kpis?.pendingApprovals ?? 0)}
              icon={ClipboardList}
              description="Awaiting action"
              loading={kpisLoading}
              accent={kpis?.pendingApprovals ? "red" : "default"}
            />
          </div>

          <div className="space-y-3">
            <SectionHeader title="Quick Actions" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <QuickAction icon={Banknote}    label="Payroll Dashboard"   description="Run payroll and view pay runs"         href="/payroll"      accent="violet" />
              <QuickAction icon={BarChart2}   label="Attendance Reports"  description="Monthly and period-wise reports"       href="/attendance"   accent="amber"  />
              <QuickAction icon={Calendar}    label="Leave Reports"       description="Leave ledger and balance reports"      href="/leave"        accent="green"  />
              {canEmployees && <QuickAction icon={Users}   label="Employees"    description="View employee master data"             href="/employees"    accent="blue"   />}
              {canReports && <QuickAction    icon={FileText} label="Reports"    description="Statutory and compliance reports"      href="/reports"      accent="teal"   />}
              <QuickAction icon={FileCheck}  label="Work Permissions"    description="WFH and overtime approval queue"       href="/permissions" accent="cyan" />
            </div>
          </div>

          <ActivityFeed limit={8} />
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════
          HR ADMIN VIEW (hr_manager, hr_executive, customer_admin)
      ══════════════════════════════════════════════════════════════ */}
      {isHrAdmin && (
        <>
          {/* Full KPI grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Headcount"
              value={kpisLoading ? "—" : String(kpis?.totalHeadcount ?? 0)}
              icon={Users}
              description="All employees"
              loading={kpisLoading}
              accent="blue"
            />
            <StatCard
              title="Active Employees"
              value={kpisLoading ? "—" : String(kpis?.activeEmployees ?? 0)}
              icon={UserCheck}
              description="Currently active"
              loading={kpisLoading}
              accent="green"
            />
            <StatCard
              title="New Joiners"
              value={kpisLoading ? "—" : String(kpis?.newJoinersThisMonth ?? 0)}
              icon={Calendar}
              description="This month"
              loading={kpisLoading}
              accent="violet"
            />
            <StatCard
              title="On Leave Today"
              value={kpisLoading ? "—" : String(kpis?.onLeaveToday ?? 0)}
              icon={Clock}
              description="Currently on leave"
              loading={kpisLoading}
              accent="amber"
            />
            <StatCard
              title="Attrition Rate"
              value={kpisLoading ? "—" : `${kpis?.attritionRate ?? 0}%`}
              icon={TrendingDown}
              description="Separated / Total"
              loading={kpisLoading}
              accent="red"
            />
            <StatCard
              title="Attendance Rate"
              value={kpisLoading ? "—" : `${kpis?.attendanceRateToday ?? 0}%`}
              icon={Activity}
              description="Present today"
              loading={kpisLoading}
              accent="green"
            />
            <StatCard
              title="Open Positions"
              value={kpisLoading ? "—" : String(kpis?.openPositions ?? 0)}
              icon={BriefcaseBusiness}
              description="Unfilled vacancies"
              loading={kpisLoading}
              accent="blue"
            />
            <StatCard
              title="Pending Approvals"
              value={kpisLoading ? "—" : String(kpis?.pendingApprovals ?? 0)}
              icon={UserX}
              description="Awaiting action"
              loading={kpisLoading}
              accent={kpis?.pendingApprovals ? "amber" : "default"}
            />
          </div>

          {/* Quick Actions */}
          <div className="space-y-3">
            <SectionHeader title="Quick Actions" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {canEmployees   && <QuickAction icon={Users}       label="Employees"        description="Workforce management"            href="/employees"        accent="blue"   />}
              {canLeave       && <QuickAction icon={Calendar}    label="Leave Management" description="Approvals and leave ledger"       href="/leave"            accent="green"  />}
              {canAttendance  && <QuickAction icon={CalendarClock} label="Attendance"     description="Daily logs and reports"           href="/attendance"       accent="amber"  />}
              {canRecruitment && <QuickAction icon={BriefcaseBusiness} label="Recruitment" description="Jobs, pipeline, and offers"     href="/recruitment"      accent="pink"   />}
              {canAnalytics   && <QuickAction icon={BarChart2}   label="Analytics"        description="Workforce insights and trends"    href="/analytics"        accent="cyan"   />}
              {canReports     && <QuickAction icon={FileText}    label="Reports"          description="Statutory and custom reports"     href="/reports"          accent="teal"   />}
              <QuickAction icon={CheckCircle2} label="Leave Approvals"     description="Leave, WFH, expense queue"           href="/leave/approvals"  accent="violet" />
              <QuickAction icon={Bell}         label="Helpdesk"           description="Employee support tickets"            href="/helpdesk"          accent="red"    />
            </div>
          </div>

          {/* Charts */}
          <HeadcountCharts />

          {/* Expiring Certifications */}
          {canCerts && <ExpiringCerts />}

          {/* Activity */}
          <ActivityFeed limit={10} />
        </>
      )}
    </div>
  );
}
