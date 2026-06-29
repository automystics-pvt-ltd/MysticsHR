import { 
  useGetDashboardKpis, 
  useGetDashboardRecentActivity, 
  useGetDashboardHeadcountByDepartment,
  useGetDashboardEmployeeStatusBreakdown,
  useGetDashboardExpiringCertifications,
  getGetDashboardExpiringCertificationsQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend 
} from "recharts";
import { Users, UserCheck, TrendingDown, Calendar, BriefcaseBusiness, Clock, UserX, Activity, BadgeCheck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/stat-card";
import { ClockInWidget } from "@/components/attendance/ClockInWidget";
import { useCurrentHrmsUser } from "@/lib/useCurrentHrmsUser";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";

const HR_READ_ROLES = ["customer_admin", "hr_manager", "hr_executive", "hod", "payroll_admin"] as const;

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

export default function DashboardPage() {
  const { data: kpis, isLoading: kpisLoading } = useGetDashboardKpis();
  const { data: activityRaw } = useGetDashboardRecentActivity({ limit: 8 });
  const activity = Array.isArray(activityRaw) ? activityRaw : [];
  const { data: headcountRaw } = useGetDashboardHeadcountByDepartment();
  const headcount = Array.isArray(headcountRaw) ? headcountRaw : [];
  const { data: statusBreakdownRaw } = useGetDashboardEmployeeStatusBreakdown();
  const statusBreakdown = Array.isArray(statusBreakdownRaw) ? statusBreakdownRaw : [];
  const { hrmsUser } = useCurrentHrmsUser();
  const showClockWidget = !!hrmsUser?.employeeId;
  const canSeeExpiringCerts = hrmsUser?.role != null && (HR_READ_ROLES as readonly string[]).includes(hrmsUser.role);
  const { data: expiringCertsRaw, isLoading: expiringLoading } = useGetDashboardExpiringCertifications(
    { days: 60 },
    { query: { enabled: canSeeExpiringCerts, queryKey: getGetDashboardExpiringCertificationsQueryKey({ days: 60 }) } }
  );
  const expiringCerts = Array.isArray(expiringCertsRaw) ? expiringCertsRaw : [];

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            {greeting}{hrmsUser?.name ? `, ${hrmsUser.name.split(" ")[0]}` : ""}
          </h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Here's your HR operations overview for today.
          </p>
        </div>
      </div>

      {/* Clock-in widget */}
      {showClockWidget && (
        <div className="grid md:grid-cols-2 gap-4">
          <ClockInWidget />
        </div>
      )}

      {/* KPI Grid */}
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
          description="Active / Total today"
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

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-foreground">Headcount by Department</CardTitle>
          </CardHeader>
          <CardContent>
            {!headcount?.length ? (
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
                      boxShadow: "0 4px 12px rgba(0,0,0,0.08)"
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
            {!statusBreakdown?.length ? (
              <div className="h-48 flex flex-col items-center justify-center text-muted-foreground gap-2">
                <Activity className="w-8 h-8 opacity-30" />
                <span className="text-sm">No status data yet</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={statusBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={82}
                    dataKey="count"
                    nameKey="status"
                    paddingAngle={2}
                    strokeWidth={0}
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
                      boxShadow: "0 4px 12px rgba(0,0,0,0.08)"
                    }} 
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Expiring Certifications */}
      {canSeeExpiringCerts && (
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BadgeCheck className="w-4 h-4 text-primary" />
              Expiring Certifications
            </CardTitle>
            <div className="flex items-center gap-3 flex-wrap">
              {[
                { bucket: "expired", color: "bg-red-500", label: "Expired", count: expiringCerts.filter(c => c.bucket === "expired").length },
                { bucket: "7", color: "bg-orange-500", label: "≤7d", count: expiringCerts.filter(c => c.bucket === "7").length },
                { bucket: "30", color: "bg-amber-500", label: "≤30d", count: expiringCerts.filter(c => c.bucket === "30").length },
                { bucket: "60", color: "bg-yellow-500", label: "≤60d", count: expiringCerts.filter(c => c.bucket === "60").length },
              ].map(({ bucket, color, label, count }) => count > 0 && (
                <span key={bucket} className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span className={`w-2 h-2 rounded-full ${color}`} />
                  {label} <span className="font-medium text-foreground">{count}</span>
                </span>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            {expiringLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
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
            ) : !expiringCerts.length ? (
              <div className="py-10 flex flex-col items-center justify-center text-muted-foreground gap-2">
                <BadgeCheck className="w-8 h-8 opacity-30" />
                <span className="text-sm">No certifications expiring in the next 60 days</span>
              </div>
            ) : (
              <div className="divide-y divide-border max-h-80 overflow-y-auto">
                {expiringCerts.map((c) => {
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
      )}

      {/* Recent Activity */}
      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {!activity?.length ? (
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
    </div>
  );
}
