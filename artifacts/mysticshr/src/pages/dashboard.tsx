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
  CalendarClock, FileCheck, Bell, ArrowUpRight, ArrowDownRight,
  Sparkles, RefreshCw, Download, Radio,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
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

// ─── Welcome Banner ───────────────────────────────────────────────────────────
function WelcomeBanner({
  firstName,
  greeting,
  subtitle,
  miniStats,
}: {
  firstName: string;
  greeting: string;
  subtitle: string;
  miniStats?: { label: string; value: string; icon: React.ElementType; loading?: boolean }[];
}) {
  const today = format(new Date(), "EEEE, MMMM d, yyyy");
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-700 via-violet-600 to-indigo-600 p-6 md:p-8 shadow-lg shadow-violet-500/20">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute -top-8 -right-8 w-64 h-64 rounded-full bg-white/20 blur-3xl" />
        <div className="absolute -bottom-12 -left-8 w-48 h-48 rounded-full bg-indigo-300/30 blur-2xl" />
        <div className="absolute top-1/2 right-1/4 w-32 h-32 rounded-full bg-violet-200/20 blur-2xl" />
      </div>
      <div className="relative flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-violet-200" />
            <span className="text-xs font-medium text-violet-200 uppercase tracking-wider">MysticsHR Platform</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
            {greeting}{firstName ? `, ${firstName}` : ""}
          </h1>
          <p className="text-violet-200 text-sm mt-1 max-w-lg">{subtitle}</p>
          <div className="mt-3 inline-flex items-center gap-1.5 bg-white/15 text-white text-xs font-medium px-3 py-1.5 rounded-full backdrop-blur-sm border border-white/20">
            <Calendar className="w-3.5 h-3.5" />
            {today}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button className="inline-flex items-center gap-1.5 bg-white/15 hover:bg-white/25 text-white text-xs font-medium px-3 py-2 rounded-lg backdrop-blur-sm border border-white/20 transition-colors">
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
          <button className="inline-flex items-center justify-center bg-white/15 hover:bg-white/25 text-white w-8 h-8 rounded-lg backdrop-blur-sm border border-white/20 transition-colors">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {miniStats && miniStats.length > 0 && (
        <div className="relative mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {miniStats.map((s) => (
            <div key={s.label} className="bg-white/10 backdrop-blur-sm rounded-xl p-3.5 border border-white/15">
              <p className="text-[11px] font-medium text-violet-200 uppercase tracking-wide mb-1">{s.label}</p>
              {s.loading ? (
                <div className="h-7 w-12 rounded bg-white/20 animate-pulse" />
              ) : (
                <p className="text-2xl font-bold text-white tabular-nums">{s.value}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── KPI Dashboard Card ────────────────────────────────────────────────────────
const KPI_ACCENT: Record<string, { gradient: string; icon: string; progress: string; badge: string }> = {
  blue:    { gradient: "from-blue-50 to-blue-50/50   dark:from-blue-950/40 dark:to-blue-950/20",   icon: "bg-blue-100   text-blue-600   dark:bg-blue-900/50  dark:text-blue-400",   progress: "bg-blue-500",   badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300" },
  green:   { gradient: "from-emerald-50 to-emerald-50/50 dark:from-emerald-950/40 dark:to-emerald-950/20", icon: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400", progress: "bg-emerald-500", badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300" },
  amber:   { gradient: "from-amber-50 to-amber-50/50   dark:from-amber-950/40 dark:to-amber-950/20",   icon: "bg-amber-100   text-amber-600   dark:bg-amber-900/50  dark:text-amber-400",   progress: "bg-amber-500",   badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300" },
  violet:  { gradient: "from-violet-50 to-violet-50/50  dark:from-violet-950/40 dark:to-violet-950/20",  icon: "bg-violet-100  text-violet-600  dark:bg-violet-900/50 dark:text-violet-400",  progress: "bg-violet-500",  badge: "bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300" },
  red:     { gradient: "from-red-50 to-red-50/50       dark:from-red-950/40 dark:to-red-950/20",       icon: "bg-red-100     text-red-600     dark:bg-red-900/50   dark:text-red-400",     progress: "bg-red-500",     badge: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300" },
  cyan:    { gradient: "from-cyan-50 to-cyan-50/50     dark:from-cyan-950/40 dark:to-cyan-950/20",     icon: "bg-cyan-100    text-cyan-600    dark:bg-cyan-900/50  dark:text-cyan-400",    progress: "bg-cyan-500",    badge: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-300" },
  pink:    { gradient: "from-pink-50 to-pink-50/50     dark:from-pink-950/40 dark:to-pink-950/20",     icon: "bg-pink-100    text-pink-600    dark:bg-pink-900/50  dark:text-pink-400",    progress: "bg-pink-500",    badge: "bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-300" },
};

function KpiDashCard({
  icon: Icon,
  title,
  value,
  description,
  progress,
  progressLabel,
  trendUp,
  trendLabel,
  accent = "blue",
  loading,
}: {
  icon: React.ElementType;
  title: string;
  value: string;
  description?: string;
  progress?: number;
  progressLabel?: string;
  trendUp?: boolean;
  trendLabel?: string;
  accent?: keyof typeof KPI_ACCENT;
  loading?: boolean;
}) {
  const a = KPI_ACCENT[accent] ?? KPI_ACCENT.blue;
  return (
    <div className={cn("rounded-xl border border-border bg-gradient-to-br p-5 flex flex-col gap-4 shadow-sm hover:shadow-md transition-all", a.gradient)}>
      <div className="flex items-start justify-between gap-2">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", a.icon)}>
          <Icon className="w-5 h-5" />
        </div>
        {trendLabel && !loading && (
          <span className={cn("inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full", trendUp ? "text-emerald-700 bg-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-400" : "text-red-700 bg-red-100 dark:bg-red-900/40 dark:text-red-400")}>
            {trendUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {trendLabel}
          </span>
        )}
      </div>
      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-3 w-32" />
        </div>
      ) : (
        <div>
          <p className="text-3xl font-bold text-foreground tracking-tight tabular-nums">{value}</p>
          {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
        </div>
      )}
      {progress !== undefined && !loading && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs text-muted-foreground font-medium">{title}</p>
            {progressLabel && <span className="text-xs font-semibold text-foreground">{progressLabel}</span>}
          </div>
          <div className="w-full h-1.5 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
            <div className={cn("h-full rounded-full transition-all duration-500", a.progress)} style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Quick Action Tile ─────────────────────────────────────────────────────────
const TILE_GRADIENT: Record<string, string> = {
  blue:   "from-blue-500 to-blue-600 shadow-blue-500/30",
  green:  "from-emerald-500 to-emerald-600 shadow-emerald-500/30",
  violet: "from-violet-500 to-violet-600 shadow-violet-500/30",
  amber:  "from-amber-500 to-amber-600 shadow-amber-500/30",
  red:    "from-red-500 to-red-600 shadow-red-500/30",
  cyan:   "from-cyan-500 to-cyan-600 shadow-cyan-500/30",
  pink:   "from-pink-500 to-pink-600 shadow-pink-500/30",
  teal:   "from-teal-500 to-teal-600 shadow-teal-500/30",
  default:"from-violet-500 to-violet-600 shadow-violet-500/30",
};

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
  accent?: string;
}) {
  const grad = TILE_GRADIENT[accent] ?? TILE_GRADIENT.default;
  return (
    <Link href={href}>
      <div className={cn("bg-gradient-to-br rounded-xl p-4 cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all shadow-md group", grad)}>
        <div className="flex items-start justify-between mb-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <Icon className="w-5 h-5 text-white" />
          </div>
          <ChevronRight className="w-4 h-4 text-white/60 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
        </div>
        <p className="text-sm font-semibold text-white leading-tight">{label}</p>
        <p className="text-xs text-white/70 mt-0.5 leading-snug">{description}</p>
      </div>
    </Link>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

// ─── Live Activity Feed ────────────────────────────────────────────────────────
const MODULE_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  Employees:   { bg: "bg-blue-100 dark:bg-blue-950/40",   text: "text-blue-700 dark:text-blue-300",   dot: "bg-blue-500" },
  Leave:       { bg: "bg-green-100 dark:bg-green-950/40", text: "text-green-700 dark:text-green-300", dot: "bg-green-500" },
  Payroll:     { bg: "bg-violet-100 dark:bg-violet-950/40",text: "text-violet-700 dark:text-violet-300",dot: "bg-violet-500"},
  Attendance:  { bg: "bg-amber-100 dark:bg-amber-950/40", text: "text-amber-700 dark:text-amber-300", dot: "bg-amber-500" },
  Recruitment: { bg: "bg-pink-100 dark:bg-pink-950/40",   text: "text-pink-700 dark:text-pink-300",   dot: "bg-pink-500" },
  Performance: { bg: "bg-cyan-100 dark:bg-cyan-950/40",   text: "text-cyan-700 dark:text-cyan-300",   dot: "bg-cyan-500" },
  Onboarding:  { bg: "bg-orange-100 dark:bg-orange-950/40",text: "text-orange-700 dark:text-orange-300",dot: "bg-orange-500"},
  Helpdesk:    { bg: "bg-red-100 dark:bg-red-950/40",     text: "text-red-700 dark:text-red-300",     dot: "bg-red-500" },
  Documents:   { bg: "bg-teal-100 dark:bg-teal-950/40",   text: "text-teal-700 dark:text-teal-300",   dot: "bg-teal-500" },
};

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

function ActivityFeed({ limit = 8 }: { limit?: number }) {
  const { data: activityRaw } = useGetDashboardRecentActivity({ limit });
  const activity = Array.isArray(activityRaw) ? activityRaw : [];

  return (
    <Card className="border-border flex flex-col h-full">
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold">Live Activity</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Real-time updates</p>
          </div>
          <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-medium">
            <Radio className="w-3 h-3 animate-pulse" />
            Live
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto">
        {!activity.length ? (
          <div className="py-10 flex flex-col items-center justify-center text-muted-foreground gap-2">
            <Activity className="w-8 h-8 opacity-30" />
            <span className="text-sm">No recent activity</span>
          </div>
        ) : (
          <div className="space-y-3">
            {activity.map((item) => {
              const mc = MODULE_COLORS[item.module];
              return (
                <div key={item.id} className="flex items-start gap-3">
                  <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0", mc?.bg ?? "bg-muted", mc?.text ?? "text-muted-foreground")}>
                    {getInitials(item.actorName ?? "?")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground leading-snug">
                      <span className="font-medium">{item.actorName}</span>{" "}
                      <span className="text-muted-foreground">{item.description}</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  {mc && (
                    <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 mt-0.5", mc.bg, mc.text)}>
                      {item.module}
                    </span>
                  )}
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
  const expired = certs.filter((c) => c.bucket === "expired").length;
  const urgent  = certs.filter((c) => c.bucket === "7").length;

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BadgeCheck className="w-4 h-4 text-amber-500" />
              Expiring Certifications
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Next 60 days</p>
          </div>
          <div className="flex items-center gap-2">
            {expired > 0 && <span className="inline-flex items-center gap-1 text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 px-2 py-0.5 rounded-full">{expired} Expired</span>}
            {urgent  > 0 && <span className="inline-flex items-center gap-1 text-xs font-semibold bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400 px-2 py-0.5 rounded-full">{urgent} Urgent</span>}
          </div>
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
          <div className="py-8 flex flex-col items-center justify-center text-muted-foreground gap-2">
            <BadgeCheck className="w-8 h-8 opacity-30" />
            <span className="text-sm">No certifications expiring soon</span>
          </div>
        ) : (
          <div className="divide-y divide-border max-h-72 overflow-y-auto">
            {certs.map((c) => {
              const badgeClass =
                c.bucket === "expired" ? "bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400" :
                c.bucket === "7"  ? "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400" :
                c.bucket === "30" ? "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400" :
                "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-400";
              const label =
                c.daysUntilExpiry < 0 ? `Expired ${Math.abs(c.daysUntilExpiry)}d ago` :
                c.daysUntilExpiry === 0 ? "Expires today" :
                `In ${c.daysUntilExpiry}d`;
              return (
                <div key={c.id} className="py-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400 flex-shrink-0">
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
                  <Badge variant="outline" className={cn("text-xs shrink-0 font-medium", badgeClass)}>{label}</Badge>
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
    <div className="grid md:grid-cols-2 gap-5">
      <Card className="border-border">
        <CardHeader className="pb-2">
          <div>
            <CardTitle className="text-sm font-semibold">Headcount by Department</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Distribution across teams</p>
          </div>
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
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 13, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
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
          <div>
            <CardTitle className="text-sm font-semibold">Employee Status Breakdown</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Active vs pipeline vs separated</p>
          </div>
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
                <Pie data={statusBreakdown} cx="50%" cy="50%" innerRadius={55} outerRadius={82} dataKey="count" nameKey="status" paddingAngle={2} strokeWidth={0}>
                  {statusBreakdown.map((entry) => (
                    <Cell key={entry.status} fill={STATUS_COLORS[entry.status] ?? "hsl(var(--muted-foreground))"} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 13, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Pending Action Card ───────────────────────────────────────────────────────
function PendingActionCard({
  icon: Icon,
  title,
  description,
  count,
  href,
  accentColor,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  count?: number;
  href: string;
  accentColor: string;
}) {
  return (
    <Card className="border-border hover:shadow-md transition-all group relative overflow-hidden">
      <CardContent className="p-5">
        {count !== undefined && count > 0 && (
          <div className={cn("absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white", accentColor)}>
            {count > 99 ? "99+" : count}
          </div>
        )}
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-3 text-white", accentColor)}>
          <Icon className="w-5 h-5" />
        </div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground mt-1 mb-4 leading-relaxed">{description}</p>
        <Link href={href}>
          <button className={cn("w-full text-xs font-semibold text-white px-4 py-2 rounded-lg transition-all hover:opacity-90 active:scale-[0.98] flex items-center justify-center gap-1", accentColor)}>
            Review Now <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </Link>
      </CardContent>
    </Card>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { hrmsUser } = useCurrentHrmsUser();
  const role = hrmsUser?.role ?? "employee";

  const isEmployee   = role === "employee";
  const isHod        = role === "hod";
  const isPayroll    = role === "payroll_admin";
  const isHrAdmin    = (HR_ADMIN_ROLES as readonly string[]).includes(role);
  const isAnyManager = (MANAGER_ROLES as readonly string[]).includes(role);
  const showClockWidget = !!hrmsUser?.employeeId;

  const needsKpis = isAnyManager || isHod;
  const { data: kpis, isLoading: kpisLoading } = useGetDashboardKpis({
    query: { enabled: needsKpis, queryKey: getGetDashboardKpisQueryKey() },
  });

  const canLeave       = usePermission("leave", "view");
  const canAttendance  = usePermission("attendance", "view");
  const canPayroll     = usePermission("payroll", "view");
  const canHelpdesk    = usePermission("helpdesk", "view");
  const canDocuments   = usePermission("documents", "view");
  const canPerformance = usePermission("performance", "view");
  const canEmployees   = usePermission("employees", "view");
  const canRecruitment = usePermission("recruitment", "view");
  const canAnalytics   = usePermission("analytics", "view");
  const canReports     = usePermission("reports", "view");
  const canCerts       = usePermission("employees", "approve");

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  const roleSubtitle: Record<string, string> = {
    customer_admin: "Here's your complete HR operations overview for today.",
    hr_manager:     "HR operations overview — approvals, workforce, and compliance.",
    hr_executive:   "Today's workforce insights and pending tasks.",
    hod:            "Your team at a glance — approvals, attendance, and performance.",
    payroll_admin:  "Payroll and workforce data for the current period.",
    employee:       "Your self-service portal — leave, payslips, and helpdesk.",
  };

  const firstName = hrmsUser?.name?.split(" ")[0] ?? "";

  const managerMiniStats = needsKpis ? [
    { label: "Total Employees", value: kpisLoading ? "—" : String(kpis?.totalHeadcount ?? 0), icon: Users, loading: kpisLoading },
    { label: "On Leave Today",  value: kpisLoading ? "—" : String(kpis?.onLeaveToday ?? 0),   icon: Clock, loading: kpisLoading },
    { label: "Attendance Rate", value: kpisLoading ? "—" : `${kpis?.attendanceRateToday ?? 0}%`, icon: Activity, loading: kpisLoading },
    { label: "Pending Actions", value: kpisLoading ? "—" : String(kpis?.pendingApprovals ?? 0), icon: CheckCircle2, loading: kpisLoading },
  ] : undefined;

  return (
    <div className="space-y-6">

      {/* ── Welcome Banner ───────────────────────────────────────────── */}
      <WelcomeBanner
        firstName={firstName}
        greeting={greeting}
        subtitle={roleSubtitle[role] ?? "Welcome to MysticsHR."}
        miniStats={managerMiniStats}
      />

      {/* ── Clock-in Widget ───────────────────────────────────────────── */}
      {showClockWidget && (
        <ClockInWidget />
      )}

      {/* ══════════════════════════════════════════════════════════════
          EMPLOYEE VIEW
      ════════════════════════════════════════════════════════════════ */}
      {isEmployee && (
        <>
          <div className="space-y-3">
            <SectionHeader title="Quick Actions" subtitle="Frequently used self-service tasks" />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {canLeave       && <QuickAction icon={Calendar}     label="Apply Leave"      description="Submit and track requests"      href="/leave"              accent="green"  />}
              {canAttendance  && <QuickAction icon={CalendarClock} label="My Attendance"   description="Logs, shifts, and records"      href="/attendance"         accent="amber"  />}
              {canPayroll     && <QuickAction icon={Banknote}      label="My Payslips"     description="Salary slips and earnings"      href="/payroll/payslips"   accent="violet" />}
              {canHelpdesk    && <QuickAction icon={Headphones}    label="Raise a Ticket"  description="Support and HR queries"         href="/helpdesk"           accent="red"    />}
              {canDocuments   && <QuickAction icon={FileText}      label="My Documents"    description="View and download files"        href="/documents"          accent="teal"   />}
              {canPerformance && <QuickAction icon={Award}         label="My Performance"  description="Goals, reviews, feedback"       href="/performance"        accent="cyan"   />}
            </div>
          </div>
          <ActivityFeed limit={6} />
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════
          HOD VIEW
      ════════════════════════════════════════════════════════════════ */}
      {isHod && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiDashCard icon={CheckCircle2} title="Pending Approvals" value={kpisLoading ? "—" : String(kpis?.pendingApprovals ?? 0)} description="Awaiting your action" accent={kpis?.pendingApprovals ? "amber" : "blue"} loading={kpisLoading} trendLabel={kpis?.pendingApprovals ? "Action needed" : undefined} trendUp={false} />
            <KpiDashCard icon={Clock}        title="On Leave Today"    value={kpisLoading ? "—" : String(kpis?.onLeaveToday ?? 0)}    description="Team members absent"   accent="cyan"   loading={kpisLoading} />
            <KpiDashCard icon={Activity}     title="Attendance Rate"   value={kpisLoading ? "—" : `${kpis?.attendanceRateToday ?? 0}%`} description="Present today"        accent="green"  loading={kpisLoading} progress={kpis?.attendanceRateToday} progressLabel={`${kpis?.attendanceRateToday ?? 0}%`} />
            <KpiDashCard icon={UserCheck}    title="New Joiners"       value={kpisLoading ? "—" : String(kpis?.newJoinersThisMonth ?? 0)} description="This month"          accent="violet" loading={kpisLoading} />
          </div>

          <div className="space-y-3">
            <SectionHeader title="Quick Actions" subtitle="Frequently used admin tasks" />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              <QuickAction icon={Calendar}      label="Leave Approvals"    description="Review pending requests"        href="/leave"        accent="green"  />
              <QuickAction icon={CalendarClock} label="Attendance"         description="Team attendance & reports"      href="/attendance"   accent="amber"  />
              {canPerformance && <QuickAction icon={Award}  label="Performance"        description="Reviews and team feedback"      href="/performance" accent="cyan"   />}
              {canRecruitment && <QuickAction icon={Users}  label="Recruitment"        description="Jobs, pipeline, and offers"     href="/recruitment" accent="pink"   />}
              <QuickAction icon={FileCheck}    label="Work Permissions"   description="WFH and late approvals"         href="/permissions"  accent="teal"   />
              <QuickAction icon={Headphones}   label="Helpdesk"           description="Team support tickets"           href="/helpdesk"     accent="red"    />
            </div>
          </div>

          {kpis?.pendingApprovals ? (
            <div className="space-y-3">
              <SectionHeader title="Pending Actions" subtitle="Items requiring your immediate attention" action={<span className="text-xs text-orange-600 font-semibold bg-orange-100 dark:bg-orange-950/40 px-2.5 py-1 rounded-full">{kpis.pendingApprovals} Pending</span>} />
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <PendingActionCard icon={Calendar}     title="Leave Approvals"     description="Team leave requests awaiting your review and decision."         count={kpis.pendingApprovals} href="/leave/approvals"  accentColor="bg-blue-600"   />
                <PendingActionCard icon={CalendarClock} title="Attendance Issues"  description="Regularization requests and anomalies to review."               href="/attendance"             accentColor="bg-amber-500" />
                <PendingActionCard icon={FileCheck}    title="Work Permissions"    description="WFH, overtime, and permission requests for your team."           href="/permissions"            accentColor="bg-violet-600" />
              </div>
            </div>
          ) : null}

          <ActivityFeed limit={8} />
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════
          PAYROLL ADMIN VIEW
      ════════════════════════════════════════════════════════════════ */}
      {isPayroll && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiDashCard icon={UserCheck}    title="Active Employees" value={kpisLoading ? "—" : String(kpis?.activeEmployees ?? 0)}   description="On payroll this period"   accent="green"  loading={kpisLoading} />
            <KpiDashCard icon={Clock}        title="On Leave Today"   value={kpisLoading ? "—" : String(kpis?.onLeaveToday ?? 0)}      description="LOP candidates"           accent="amber"  loading={kpisLoading} />
            <KpiDashCard icon={Activity}     title="Attendance Rate"  value={kpisLoading ? "—" : `${kpis?.attendanceRateToday ?? 0}%`} description="Today's present rate"     accent="blue"   loading={kpisLoading} progress={kpis?.attendanceRateToday} progressLabel={`${kpis?.attendanceRateToday ?? 0}%`} />
            <KpiDashCard icon={ClipboardList} title="Pending Approvals" value={kpisLoading ? "—" : String(kpis?.pendingApprovals ?? 0)} description="Awaiting action"         accent={kpis?.pendingApprovals ? "red" : "violet"} loading={kpisLoading} />
          </div>

          <div className="space-y-3">
            <SectionHeader title="Quick Actions" subtitle="Payroll and workforce tasks" />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              <QuickAction icon={Banknote}    label="Payroll Dashboard"  description="Run payroll and pay runs"         href="/payroll"      accent="violet" />
              <QuickAction icon={BarChart2}   label="Attendance Reports" description="Monthly period-wise reports"      href="/attendance"   accent="amber"  />
              <QuickAction icon={Calendar}    label="Leave Reports"      description="Leave ledger and balances"        href="/leave"        accent="green"  />
              {canEmployees && <QuickAction icon={Users}    label="Employees"    description="View employee master data"        href="/employees"    accent="blue"   />}
              {canReports   && <QuickAction icon={FileText} label="Reports"      description="Statutory and compliance"         href="/reports"      accent="teal"   />}
              <QuickAction icon={FileCheck}  label="Work Permissions"   description="WFH and overtime approvals"       href="/permissions"  accent="cyan"   />
            </div>
          </div>

          <ActivityFeed limit={8} />
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════
          HR ADMIN VIEW
      ════════════════════════════════════════════════════════════════ */}
      {isHrAdmin && (
        <>
          {/* KPI Grid — 4 primary + 4 secondary */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiDashCard
              icon={Users} title="Total Headcount"
              value={kpisLoading ? "—" : String(kpis?.totalHeadcount ?? 0)}
              description="All employees on record"
              accent="blue" loading={kpisLoading}
              progress={kpis?.totalHeadcount ? Math.min((kpis.activeEmployees ?? 0) / kpis.totalHeadcount * 100, 100) : undefined}
              progressLabel={kpis?.totalHeadcount ? `${kpis.activeEmployees ?? 0} active` : undefined}
            />
            <KpiDashCard
              icon={UserCheck} title="Active Employees"
              value={kpisLoading ? "—" : String(kpis?.activeEmployees ?? 0)}
              description="Currently active"
              accent="green" loading={kpisLoading}
              trendLabel="+2 this week" trendUp={true}
            />
            <KpiDashCard
              icon={Calendar} title="New Joiners"
              value={kpisLoading ? "—" : String(kpis?.newJoinersThisMonth ?? 0)}
              description="This month"
              accent="violet" loading={kpisLoading}
            />
            <KpiDashCard
              icon={Clock} title="On Leave Today"
              value={kpisLoading ? "—" : String(kpis?.onLeaveToday ?? 0)}
              description="Currently on leave"
              accent="amber" loading={kpisLoading}
            />
            <KpiDashCard
              icon={TrendingDown} title="Attrition Rate"
              value={kpisLoading ? "—" : `${kpis?.attritionRate ?? 0}%`}
              description="Separated / Total"
              accent="red" loading={kpisLoading}
            />
            <KpiDashCard
              icon={Activity} title="Attendance Rate"
              value={kpisLoading ? "—" : `${kpis?.attendanceRateToday ?? 0}%`}
              description="Present today"
              accent="green" loading={kpisLoading}
              progress={kpis?.attendanceRateToday}
              progressLabel={`${kpis?.attendanceRateToday ?? 0}%`}
            />
            <KpiDashCard
              icon={BriefcaseBusiness} title="Open Positions"
              value={kpisLoading ? "—" : String(kpis?.openPositions ?? 0)}
              description="Unfilled vacancies"
              accent="blue" loading={kpisLoading}
            />
            <KpiDashCard
              icon={UserX} title="Pending Approvals"
              value={kpisLoading ? "—" : String(kpis?.pendingApprovals ?? 0)}
              description="Awaiting action"
              accent={kpis?.pendingApprovals ? "amber" : "violet"} loading={kpisLoading}
            />
          </div>

          {/* Charts + Activity side by side */}
          <div className="grid lg:grid-cols-5 gap-5">
            <div className="lg:col-span-3">
              <HeadcountCharts />
            </div>
            <div className="lg:col-span-2">
              <ActivityFeed limit={8} />
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-3">
            <SectionHeader title="Quick Actions" subtitle="Frequently used admin tasks" />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {canEmployees   && <QuickAction icon={Users}            label="Employees"        description="Workforce management"          href="/employees"        accent="blue"   />}
              {canLeave       && <QuickAction icon={Calendar}         label="Leave Management" description="Approvals and leave ledger"     href="/leave"            accent="green"  />}
              {canAttendance  && <QuickAction icon={CalendarClock}    label="Attendance"       description="Daily logs and reports"         href="/attendance"       accent="amber"  />}
              {canRecruitment && <QuickAction icon={BriefcaseBusiness} label="Recruitment"     description="Jobs, pipeline, and offers"     href="/recruitment"      accent="pink"   />}
              {canAnalytics   && <QuickAction icon={BarChart2}        label="Analytics"        description="Workforce insights and trends"  href="/analytics"        accent="cyan"   />}
              {canReports     && <QuickAction icon={FileText}         label="Reports"          description="Statutory and custom reports"   href="/reports"          accent="teal"   />}
              <QuickAction icon={CheckCircle2} label="Leave Approvals"   description="Leave, WFH, expense queue"     href="/leave/approvals"  accent="violet" />
              <QuickAction icon={Bell}         label="Helpdesk"          description="Employee support tickets"       href="/helpdesk"          accent="red"    />
            </div>
          </div>

          {/* Pending Actions */}
          {(kpis?.pendingApprovals ?? 0) > 0 && (
            <div className="space-y-3">
              <SectionHeader
                title="Pending Actions"
                subtitle="Items requiring your immediate attention"
                action={<span className="text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 px-2.5 py-1 rounded-full flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />{kpis?.pendingApprovals} Pending</span>}
              />
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <PendingActionCard icon={Calendar}     title="Leave Approvals"    description="Employees awaiting leave approval and review decisions." count={kpis?.pendingApprovals} href="/leave/approvals" accentColor="bg-blue-600"   />
                <PendingActionCard icon={CheckCircle2} title="Regularizations"    description="Attendance regularization requests pending HR review."   href="/attendance"             accentColor="bg-orange-500" />
                {canCerts && <PendingActionCard icon={BadgeCheck} title="Certification Alerts" description="Certifications expiring soon — urgent review required." href="/employees" accentColor="bg-red-500" />}
              </div>
            </div>
          )}

          {/* Expiring Certs */}
          {canCerts && <ExpiringCerts />}
        </>
      )}
    </div>
  );
}
