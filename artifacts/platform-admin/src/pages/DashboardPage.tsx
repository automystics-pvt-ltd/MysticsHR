import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Building2, Users, UserCheck, ShieldCheck, Clock,
  TrendingUp, PauseCircle, Archive, FlaskConical,
} from "lucide-react";

const PLAN_COLORS: Record<string, string> = {
  trial: "bg-slate-500/15 text-slate-400",
  starter: "bg-green-500/15 text-green-400",
  professional: "bg-blue-500/15 text-blue-400",
  enterprise: "bg-purple-500/15 text-purple-400",
  custom: "bg-orange-500/15 text-orange-400",
  none: "bg-muted text-muted-foreground",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  trial: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  suspended: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  archived: "bg-muted text-muted-foreground border-border",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function KpiCard({ icon: Icon, label, value, sub, iconColor, href }: {
  icon: typeof Building2; label: string; value: number | undefined;
  sub?: string; iconColor: string; href?: string;
}) {
  const content = (
    <Card className="bg-card border-card-border hover:border-primary/30 transition-colors">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
            <p className="text-3xl font-bold text-foreground mt-1.5">
              {value == null ? <Skeleton className="h-9 w-16" /> : value.toLocaleString()}
            </p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <div className={`w-9 h-9 rounded-lg ${iconColor} flex items-center justify-center flex-shrink-0`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
  if (href) return <Link href={href} className="block">{content}</Link>;
  return content;
}

function MiniKpi({ label, value, color }: { label: string; value: number | undefined; color: string }) {
  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/40">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-sm font-bold ${color}`}>{value ?? "—"}</span>
    </div>
  );
}

export function DashboardPage() {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ["platform-analytics"],
    queryFn: () => api.analytics(),
    refetchInterval: 60_000,
  });

  const { data: logs, isLoading: logsLoading } = useQuery({
    queryKey: ["platform-audit-logs-recent"],
    queryFn: () => api.auditLogs({ limit: 8, offset: 0 }),
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Platform-wide overview — live data</p>
      </div>

      {/* Primary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={Building2} label="Total Tenants" href="/tenants"
          value={analytics?.tenants.total}
          sub={`${analytics?.tenants.active ?? "—"} active`}
          iconColor="bg-blue-500/15 text-blue-400" />
        <KpiCard icon={Users} label="HRMS Users"
          value={analytics?.hrmsUsers.total}
          sub={`${analytics?.hrmsUsers.active ?? "—"} active`}
          iconColor="bg-emerald-500/15 text-emerald-400" />
        <KpiCard icon={UserCheck} label="Employees"
          value={analytics?.employees.total}
          iconColor="bg-amber-500/15 text-amber-400" />
        <KpiCard icon={ShieldCheck} label="Platform Admins" href="/admins"
          value={analytics?.platformAdmins.total}
          iconColor="bg-purple-500/15 text-purple-400" />
      </div>

      {/* Tenant Status Breakdown */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MiniKpi label="Active Tenants" value={analytics?.tenants.active} color="text-emerald-400" />
        <MiniKpi label="On Trial" value={analytics?.tenants.trial} color="text-blue-400" />
        <MiniKpi label="Suspended" value={analytics?.tenants.suspended} color="text-amber-400" />
        <MiniKpi label="Archived" value={analytics?.tenants.archived} color="text-muted-foreground" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Plan Distribution */}
        <Card className="bg-card border-card-border">
          <CardHeader className="pb-3 border-b border-border px-5 pt-5">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-sm font-semibold">Plan Distribution</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-3">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)
            ) : !analytics?.planDistribution?.length ? (
              <p className="text-sm text-muted-foreground text-center py-4">No plan data yet</p>
            ) : (
              analytics.planDistribution.map((p) => {
                const total = analytics.tenants.total || 1;
                const pct = Math.round((p.count / total) * 100);
                return (
                  <div key={p.planName}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PLAN_COLORS[p.planType] ?? PLAN_COLORS.none}`}>
                          {p.planName}
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-foreground">{p.count} <span className="text-xs text-muted-foreground font-normal">tenants</span></span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5">
                      <div className="h-1.5 rounded-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Recent Tenants */}
        <Card className="bg-card border-card-border">
          <CardHeader className="pb-3 border-b border-border px-5 pt-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                <CardTitle className="text-sm font-semibold">Recent Tenants</CardTitle>
              </div>
              <Link href="/tenants" className="text-xs text-primary hover:underline">View all</Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-5 space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
            ) : !analytics?.recentTenants?.length ? (
              <p className="text-sm text-muted-foreground text-center py-8">No tenants yet</p>
            ) : (
              <ul className="divide-y divide-border">
                {analytics.recentTenants.map((t) => (
                  <li key={t.id} className="flex items-center justify-between px-5 py-3 hover:bg-accent/30 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <Link href={`/tenants/${t.id}`} className="font-medium text-sm text-foreground hover:text-primary transition-colors truncate">{t.name}</Link>
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${STATUS_COLORS[t.status] ?? ""}`}>
                        {t.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                      {t.planName && (
                        <span className="text-xs text-muted-foreground">{t.planName}</span>
                      )}
                      <time className="text-xs text-muted-foreground">{fmtDate(t.createdAt)}</time>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Audit Activity */}
      <Card className="bg-card border-card-border">
        <CardHeader className="pb-3 border-b border-border px-5 pt-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-sm font-semibold">Recent Platform Activity</CardTitle>
            </div>
            <Link href="/audit-logs" className="text-xs text-primary hover:underline">View all</Link>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {logsLoading ? (
            <div className="p-5 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}</div>
          ) : !logs?.data.length ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No audit activity yet</div>
          ) : (
            <ul className="divide-y divide-border">
              {logs.data.map((log) => (
                <li key={log.id} className="flex items-center justify-between px-5 py-3 hover:bg-accent/30 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono bg-muted text-muted-foreground flex-shrink-0">
                      {log.action}
                    </span>
                    {log.module && <span className="text-xs text-muted-foreground truncate">{log.module}</span>}
                    {log.userEmail && <span className="text-xs text-muted-foreground truncate hidden sm:block">{log.userEmail}</span>}
                  </div>
                  <time className="text-xs text-muted-foreground flex-shrink-0 ml-3">{fmtTime(log.createdAt)}</time>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
