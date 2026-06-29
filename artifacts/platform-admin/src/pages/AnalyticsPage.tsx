import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Building2, Users, CreditCard, TrendingUp } from "lucide-react";

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

function StatBlock({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">{label}</span>
      <span className="text-2xl font-bold text-foreground mt-1">{typeof value === "number" ? value.toLocaleString() : value}</span>
      {sub && <span className="text-xs text-muted-foreground mt-0.5">{sub}</span>}
    </div>
  );
}

export function AnalyticsPage() {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ["platform-analytics"],
    queryFn: () => api.analytics(),
    refetchInterval: 60_000,
  });

  const { data: plansData } = useQuery({
    queryKey: ["platform-plans"],
    queryFn: () => api.listPlans(),
  });

  const tenantTotal = analytics?.tenants.total ?? 1;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Analytics</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Platform-wide insights across all tenants</p>
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Building2, label: "Total Tenants", v: analytics?.tenants.total, sub: `${analytics?.tenants.active ?? 0} active`, c: "bg-blue-500/15 text-blue-400" },
          { icon: Users, label: "Total Users", v: analytics?.hrmsUsers.total, sub: `${analytics?.hrmsUsers.active ?? 0} active`, c: "bg-emerald-500/15 text-emerald-400" },
          { icon: TrendingUp, label: "Employees", v: analytics?.employees.total, c: "bg-amber-500/15 text-amber-400" },
          { icon: CreditCard, label: "Plans Defined", v: plansData?.total, c: "bg-purple-500/15 text-purple-400" },
        ].map(({ icon: Icon, label, v, sub, c }) => (
          <Card key={label} className="bg-card border-card-border">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
                  <p className="text-3xl font-bold text-foreground mt-1.5">
                    {v == null ? <Skeleton className="h-9 w-16" /> : v.toLocaleString()}
                  </p>
                  {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
                </div>
                <div className={`w-9 h-9 rounded-lg ${c} flex items-center justify-center flex-shrink-0`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tenant Status Distribution */}
        <Card className="bg-card border-card-border">
          <CardHeader className="pb-3 border-b border-border px-5 pt-5">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-sm font-semibold">Tenant Status Distribution</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            {isLoading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />) : (
              [
                { key: "active", label: "Active", value: analytics?.tenants.active ?? 0 },
                { key: "trial", label: "Trial", value: analytics?.tenants.trial ?? 0 },
                { key: "suspended", label: "Suspended", value: analytics?.tenants.suspended ?? 0 },
                { key: "archived", label: "Archived", value: analytics?.tenants.archived ?? 0 },
              ].map(({ key, label, value }) => {
                const pct = tenantTotal > 0 ? Math.round((value / tenantTotal) * 100) : 0;
                return (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-1.5">
                      <Badge variant="outline" className={`text-xs capitalize ${STATUS_COLORS[key] ?? ""}`}>{label}</Badge>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">{value}</span>
                        <span className="text-xs text-muted-foreground w-8 text-right">{pct}%</span>
                      </div>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div className="h-2 rounded-full bg-primary transition-all duration-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Plan Distribution */}
        <Card className="bg-card border-card-border">
          <CardHeader className="pb-3 border-b border-border px-5 pt-5">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-sm font-semibold">Plan Distribution</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            {isLoading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />) :
              !analytics?.planDistribution?.length ? (
                <p className="text-sm text-muted-foreground text-center py-4">No plan data yet</p>
              ) : (
                analytics.planDistribution.map((p) => {
                  const pct = tenantTotal > 0 ? Math.round((p.count / tenantTotal) * 100) : 0;
                  return (
                    <div key={p.planName}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PLAN_COLORS[p.planType] ?? PLAN_COLORS.none}`}>
                          {p.planName}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-foreground">{p.count}</span>
                          <span className="text-xs text-muted-foreground w-8 text-right">{pct}%</span>
                        </div>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div className="h-2 rounded-full bg-primary transition-all duration-500" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })
              )}
          </CardContent>
        </Card>
      </div>

      {/* User + Employee Stats */}
      <Card className="bg-card border-card-border">
        <CardHeader className="pb-3 border-b border-border px-5 pt-5">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <CardTitle className="text-sm font-semibold">User & Employee Stats</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            <StatBlock label="Total HRMS Users" value={analytics?.hrmsUsers.total ?? 0} />
            <StatBlock label="Active Users" value={analytics?.hrmsUsers.active ?? 0}
              sub={`${analytics?.hrmsUsers.total ? Math.round(((analytics.hrmsUsers.active ?? 0) / analytics.hrmsUsers.total) * 100) : 0}% utilization`} />
            <StatBlock label="Total Employees" value={analytics?.employees.total ?? 0} />
            <StatBlock label="Avg Users/Tenant"
              value={analytics?.tenants.total ? Math.round((analytics.hrmsUsers.total ?? 0) / analytics.tenants.total) : 0} />
          </div>
        </CardContent>
      </Card>

      {/* Subscription Plans Overview */}
      {plansData?.data && plansData.data.length > 0 && (
        <Card className="bg-card border-card-border">
          <CardHeader className="pb-3 border-b border-border px-5 pt-5">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-sm font-semibold">Subscription Plans Overview</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {["Plan", "Type", "Monthly", "Yearly", "Users", "Tenants"].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs text-muted-foreground uppercase tracking-wider font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {plansData.data.map((plan) => (
                  <tr key={plan.id} className="hover:bg-accent/20 transition-colors">
                    <td className="px-5 py-3 font-medium text-foreground">{plan.name}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${PLAN_COLORS[plan.type] ?? PLAN_COLORS.none}`}>
                        {plan.type}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {plan.priceMonthly === 0 ? "Free" : `$${(plan.priceMonthly / 100).toFixed(0)}`}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {plan.priceYearly === 0 ? "—" : `$${(plan.priceYearly / 100).toFixed(0)}`}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {plan.maxUsers === -1 ? "∞" : plan.maxUsers}
                    </td>
                    <td className="px-5 py-3 font-semibold text-foreground">{plan.tenantCount ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
