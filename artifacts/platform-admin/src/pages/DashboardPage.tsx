import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Users, UserCheck, ShieldCheck, Clock } from "lucide-react";

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  iconColor,
}: {
  icon: typeof Building2;
  label: string;
  value: number | undefined;
  sub?: string;
  iconColor: string;
}) {
  return (
    <Card className="bg-card border-card-border">
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
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function DashboardPage() {
  const { data: analytics } = useQuery({
    queryKey: ["platform-analytics"],
    queryFn: () => api.analytics(),
  });

  const { data: logs, isLoading: logsLoading } = useQuery({
    queryKey: ["platform-audit-logs-recent"],
    queryFn: () => api.auditLogs({ limit: 10, offset: 0 }),
  });

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Platform-wide overview</p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={Building2}
          label="Total Tenants"
          value={analytics?.tenants.total}
          sub={`${analytics?.tenants.active ?? "—"} active`}
          iconColor="bg-blue-500/15 text-blue-400"
        />
        <KpiCard
          icon={Users}
          label="HRMS Users"
          value={analytics?.hrmsUsers.total}
          sub={`${analytics?.hrmsUsers.active ?? "—"} active`}
          iconColor="bg-emerald-500/15 text-emerald-400"
        />
        <KpiCard
          icon={UserCheck}
          label="Employees"
          value={analytics?.employees.total}
          iconColor="bg-amber-500/15 text-amber-400"
        />
        <KpiCard
          icon={ShieldCheck}
          label="Platform Admins"
          value={analytics?.platformAdmins.total}
          iconColor="bg-purple-500/15 text-purple-400"
        />
      </div>

      {/* Recent Audit Logs */}
      <Card className="bg-card border-card-border">
        <CardHeader className="pb-3 border-b border-border px-5 pt-5">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <CardTitle className="text-sm font-semibold">Recent Activity</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {logsLoading ? (
            <div className="p-5 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </div>
          ) : logs?.data.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No audit activity yet</div>
          ) : (
            <ul className="divide-y divide-border">
              {logs?.data.map((log) => (
                <li key={log.id} className="flex items-center justify-between px-5 py-3 hover:bg-accent/30 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono bg-muted text-muted-foreground flex-shrink-0">
                      {log.action}
                    </span>
                    {log.entityType && (
                      <span className="text-xs text-muted-foreground truncate">
                        {log.entityType}{log.entityId ? ` #${log.entityId}` : ""}
                      </span>
                    )}
                  </div>
                  <time className="text-xs text-muted-foreground flex-shrink-0 ml-3">{formatDate(log.createdAt)}</time>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
