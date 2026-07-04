import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, fmtMoney } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp, IndianRupee, CheckCircle2, AlertTriangle, Clock, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const PLAN_COLORS: Record<string, string> = {
  trial: "bg-slate-400",
  starter: "bg-green-400",
  professional: "bg-blue-400",
  enterprise: "bg-purple-400",
  custom: "bg-orange-400",
};

const STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  trial: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  suspended: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  archived: "bg-muted text-muted-foreground border-border",
};

function MonthBar({ month, invoiced, collected, maxVal }: { month: string; invoiced: number; collected: number; maxVal: number }) {
  const invoicedPct = maxVal > 0 ? (invoiced / maxVal) * 100 : 0;
  const collectedPct = maxVal > 0 ? (collected / maxVal) * 100 : 0;
  const label = month.slice(0, 7); // YYYY-MM
  const shortLabel = new Date(label + "-01").toLocaleDateString(undefined, { month: "short", year: "2-digit" });

  return (
    <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
      <div className="relative w-full flex flex-col justify-end gap-0.5" style={{ height: 80 }}>
        <div
          className="w-full rounded-sm bg-primary/20 absolute bottom-0"
          style={{ height: `${invoicedPct}%` }}
        />
        <div
          className="w-full rounded-sm bg-emerald-500 absolute bottom-0"
          style={{ height: `${collectedPct}%` }}
        />
      </div>
      <span className="text-[10px] text-muted-foreground whitespace-nowrap">{shortLabel}</span>
    </div>
  );
}

export function BillingReportsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["billing-reports"],
    queryFn: () => api.getBillingReports(),
  });

  const enforceM = useMutation({
    mutationFn: () => api.enforceSubscriptions(),
    onSuccess: (r) => {
      void qc.invalidateQueries({ queryKey: ["billing-reports"] });
      void qc.invalidateQueries({ queryKey: ["platform-invoices"] });
      void qc.invalidateQueries({ queryKey: ["platform-tenants"] });
      toast({
        title: "Enforcement complete",
        description: `${r.invoicesMarkedOverdue} invoices marked overdue • ${r.tenantsSuspended} tenants suspended`,
      });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const overall = data?.overall;
  const monthly = data?.monthly ?? [];
  const byPlan = data?.byPlan ?? [];
  const topTenants = data?.topTenants ?? [];

  const maxMonthly = Math.max(...monthly.map(m => m.invoiced), 1);
  const collectionRate = overall && overall.totalInvoiced > 0
    ? Math.round((overall.totalCollected / overall.totalInvoiced) * 100)
    : 0;

  return (
    <div className="p-6 space-y-6 max-w-[1100px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Billing Reports
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Revenue analytics and subscription health</p>
        </div>
        <Button size="sm" variant="outline" className="gap-2 h-8 text-xs"
          onClick={() => enforceM.mutate()} disabled={enforceM.isPending}>
          <RefreshCw className={`w-3.5 h-3.5 ${enforceM.isPending ? "animate-spin" : ""}`} />
          Enforce Subscriptions
        </Button>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-4 gap-3">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="bg-card border-card-border">
                <CardContent className="p-4">
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-7 w-32" />
                </CardContent>
              </Card>
            ))
          : [
              {
                label: "Total Invoiced",
                value: fmtMoney(overall?.totalInvoiced ?? 0),
                sub: `${overall?.invoiceCount ?? 0} invoices`,
                icon: IndianRupee, color: "text-foreground",
              },
              {
                label: "Total Collected",
                value: fmtMoney(overall?.totalCollected ?? 0),
                sub: `${overall?.paidCount ?? 0} paid`,
                icon: CheckCircle2, color: "text-emerald-400",
              },
              {
                label: "Collection Rate",
                value: `${collectionRate}%`,
                sub: overall?.totalPending ? `${fmtMoney(overall.totalPending)} pending` : "No pending",
                icon: TrendingUp, color: collectionRate >= 80 ? "text-emerald-400" : collectionRate >= 50 ? "text-amber-400" : "text-red-400",
              },
              {
                label: "Overdue",
                value: fmtMoney(overall?.totalOverdue ?? 0),
                sub: `${overall?.overdueCount ?? 0} overdue invoices`,
                icon: AlertTriangle, color: (overall?.overdueCount ?? 0) > 0 ? "text-red-400" : "text-muted-foreground",
              },
            ].map(({ label, value, sub, icon: Icon, color }) => (
              <Card key={label} className="bg-card border-card-border">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={`w-3.5 h-3.5 ${color}`} />
                    <span className="text-xs text-muted-foreground">{label}</span>
                  </div>
                  <p className={`text-xl font-bold ${color}`}>{value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
                </CardContent>
              </Card>
            ))}
      </div>

      {/* Monthly Revenue Chart */}
      <Card className="bg-card border-card-border">
        <CardHeader className="pb-3 border-b border-border px-5 pt-5">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">Monthly Revenue (Last 12 Months)</CardTitle>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded-sm bg-primary/30 inline-block" />Invoiced</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded-sm bg-emerald-500 inline-block" />Collected</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-5">
          {isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : monthly.length === 0 ? (
            <div className="h-24 flex items-center justify-center text-sm text-muted-foreground">
              No invoice data yet
            </div>
          ) : (
            <div className="flex items-end gap-1.5 h-28 pt-2">
              {monthly.map(m => (
                <MonthBar
                  key={m.month}
                  month={m.month}
                  invoiced={m.invoiced}
                  collected={m.collected}
                  maxVal={maxMonthly}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Plan Revenue + Top Tenants */}
      <div className="grid grid-cols-2 gap-5">
        {/* Revenue by Plan */}
        <Card className="bg-card border-card-border">
          <CardHeader className="pb-3 border-b border-border px-5 pt-5">
            <CardTitle className="text-sm font-semibold">Revenue by Plan</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-xs font-semibold text-muted-foreground px-5">Plan</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground">Invoiced</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground">Collected</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground text-right pr-5">Invoices</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading
                  ? Array.from({ length: 4 }).map((_, i) => (
                      <TableRow key={i} className="border-border">
                        <TableCell className="px-5"><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell className="pr-5"><Skeleton className="h-4 w-8" /></TableCell>
                      </TableRow>
                    ))
                  : byPlan.map(p => (
                      <TableRow key={p.planName} className="border-border hover:bg-muted/30">
                        <TableCell className="px-5">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${PLAN_COLORS[p.planType] ?? "bg-muted"}`} />
                            <span className="text-sm text-foreground">{p.planName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm font-medium">{fmtMoney(p.invoiced)}</TableCell>
                        <TableCell>
                          <span className="text-sm text-emerald-400">{fmtMoney(p.collected)}</span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground text-right pr-5">{p.count}</TableCell>
                      </TableRow>
                    ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Top Tenants */}
        <Card className="bg-card border-card-border">
          <CardHeader className="pb-3 border-b border-border px-5 pt-5">
            <CardTitle className="text-sm font-semibold">Top Tenants by Revenue</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-xs font-semibold text-muted-foreground px-5">Tenant</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground">Status</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground text-right pr-5">Paid</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i} className="border-border">
                        <TableCell className="px-5"><Skeleton className="h-4 w-28" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        <TableCell className="pr-5"><Skeleton className="h-4 w-20" /></TableCell>
                      </TableRow>
                    ))
                  : topTenants.length === 0
                  ? (
                    <TableRow className="border-border hover:bg-transparent">
                      <TableCell colSpan={3} className="text-center py-8 text-sm text-muted-foreground px-5">
                        No payment data yet
                      </TableCell>
                    </TableRow>
                  )
                  : topTenants.map((t, i) => (
                      <TableRow key={t.tenantId} className="border-border hover:bg-muted/30">
                        <TableCell className="px-5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-muted-foreground w-4">#{i + 1}</span>
                            <span className="text-sm text-foreground truncate max-w-[140px]">{t.tenantName}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-xs capitalize ${STATUS_STYLES[t.tenantStatus] ?? ""}`}>
                            {t.tenantStatus}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right pr-5">
                          <span className="text-sm font-semibold text-emerald-400">{fmtMoney(t.totalPaid)}</span>
                        </TableCell>
                      </TableRow>
                    ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Pending Invoices Alert */}
      {!isLoading && (overall?.overdueCount ?? 0) > 0 && (
        <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-300">
              {overall!.overdueCount} overdue invoice{overall!.overdueCount !== 1 ? "s" : ""} requiring attention
            </p>
            <p className="text-xs text-red-400/70 mt-0.5">
              Total overdue: {fmtMoney(overall!.totalOverdue)} • Run "Enforce Subscriptions" to auto-suspend non-paying tenants after their grace period
            </p>
          </div>
          <Button size="sm" variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10 shrink-0"
            onClick={() => enforceM.mutate()} disabled={enforceM.isPending}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${enforceM.isPending ? "animate-spin" : ""}`} />
            Enforce Now
          </Button>
        </div>
      )}
    </div>
  );
}
