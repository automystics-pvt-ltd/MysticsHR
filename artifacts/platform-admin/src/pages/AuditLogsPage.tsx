import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown, ChevronsUpDown, X, Shield, User } from "lucide-react";

const PAGE_SIZE = 50;

type SortField = "id" | "createdAt" | "tenantId";
type SortDir = "asc" | "desc";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

function SortIcon({ field, current, dir }: { field: SortField; current: SortField; dir: SortDir }) {
  if (field !== current) return <ChevronsUpDown className="w-3 h-3 ml-1 text-muted-foreground/50 inline" />;
  return dir === "asc"
    ? <ChevronUp className="w-3 h-3 ml-1 text-primary inline" />
    : <ChevronDown className="w-3 h-3 ml-1 text-primary inline" />;
}

const ACTION_LABELS: Record<string, string> = {
  "tenant.created": "Tenant Created",
  "tenant.updated": "Tenant Updated",
  "tenant.plan_changed": "Plan Changed",
  "tenant.status_changed": "Status Changed",
  "tenant.archived": "Tenant Archived",
  "tenant.config_updated": "Modules Updated",
  "tenant.theme_updated": "Theme Updated",
  "tenant.billing_updated": "Billing Updated",
  "tenant.user_created": "User Created",
  "tenant.user_toggled": "User Toggled",
  "tenant.user_role_changed": "Role Changed",
  "tenant.user_password_reset": "Password Reset",
  "login": "Login",
  "logout": "Logout",
  "password.changed": "Password Changed",
};

const MODULE_COLORS: Record<string, string> = {
  subscription: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  tenant: "bg-slate-500/10 text-slate-600 dark:text-slate-400",
  modules: "bg-green-500/10 text-green-600 dark:text-green-400",
  theme: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  billing: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  users: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
};

export function AuditLogsPage() {
  const [page, setPage] = useState(0);
  const [tenantFilter, setTenantFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [moduleFilter, setModuleFilter] = useState("");
  const [adminFilter, setAdminFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("desc"); }
    setPage(0);
  }

  const tenantId =
    tenantFilter.trim() !== "" && !Number.isNaN(Number(tenantFilter))
      ? Number(tenantFilter)
      : undefined;

  const hasFilters = tenantFilter || actionFilter || moduleFilter || adminFilter || dateFrom || dateTo;

  function clearFilters() {
    setTenantFilter(""); setActionFilter(""); setModuleFilter(""); setAdminFilter("");
    setDateFrom(""); setDateTo(""); setPage(0);
  }

  const { data, isLoading } = useQuery({
    queryKey: ["platform-audit-logs", page, tenantId, actionFilter, moduleFilter, adminFilter, dateFrom, dateTo, sortField, sortDir],
    queryFn: () =>
      api.auditLogs({
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
        tenantId,
        action: actionFilter || undefined,
        module: moduleFilter || undefined,
        platformAdminEmail: adminFilter || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        sortField,
        sortDir,
      }),
  });

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const thClass =
    "text-muted-foreground text-xs uppercase tracking-wider font-medium cursor-pointer select-none hover:text-foreground transition-colors";

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Audit Logs</h1>
        <p className="text-sm text-muted-foreground mt-0.5">All platform admin and HRMS user actions across tenants</p>
      </div>

      {/* Filters */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Tenant ID"
            className="h-8 text-sm w-28"
            value={tenantFilter}
            onChange={(e) => { setTenantFilter(e.target.value); setPage(0); }}
          />
          <Input
            placeholder="Action (e.g. plan)"
            className="h-8 text-sm w-40"
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setPage(0); }}
          />
          <Input
            placeholder="Module (e.g. subscription)"
            className="h-8 text-sm w-44"
            value={moduleFilter}
            onChange={(e) => { setModuleFilter(e.target.value); setPage(0); }}
          />
          <Input
            placeholder="Platform admin email"
            className="h-8 text-sm w-48"
            value={adminFilter}
            onChange={(e) => { setAdminFilter(e.target.value); setPage(0); }}
          />
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground whitespace-nowrap">From</span>
            <Input
              type="date"
              className="h-8 text-sm w-36"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(0); }}
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground whitespace-nowrap">To</span>
            <Input
              type="date"
              className="h-8 text-sm w-36"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(0); }}
            />
          </div>
          {hasFilters && (
            <Button variant="ghost" size="sm" className="h-8 text-xs gap-1" onClick={clearFilters}>
              <X className="w-3 h-3" /> Clear
            </Button>
          )}
          <span className="text-xs text-muted-foreground ml-auto">
            {total.toLocaleString()} record{total !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      <div className="bg-card border border-card-border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className={`${thClass} w-14`} onClick={() => toggleSort("id")}>
                ID <SortIcon field="id" current={sortField} dir={sortDir} />
              </TableHead>
              <TableHead className={`${thClass} w-20`} onClick={() => toggleSort("tenantId")}>
                Tenant <SortIcon field="tenantId" current={sortField} dir={sortDir} />
              </TableHead>
              <TableHead className="text-muted-foreground text-xs uppercase tracking-wider font-medium">Actor</TableHead>
              <TableHead className="text-muted-foreground text-xs uppercase tracking-wider font-medium">Action</TableHead>
              <TableHead className="text-muted-foreground text-xs uppercase tracking-wider font-medium">Module</TableHead>
              <TableHead className="text-muted-foreground text-xs uppercase tracking-wider font-medium">Details</TableHead>
              <TableHead className={`${thClass}`} onClick={() => toggleSort("createdAt")}>
                Time <SortIcon field="createdAt" current={sortField} dir={sortDir} />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 10 }).map((_, i) => (
                  <TableRow key={i} className="border-border">
                    <TableCell colSpan={7}><Skeleton className="h-5 w-full" /></TableCell>
                  </TableRow>
                ))
              : data?.data.map((log) => {
                  const isPlatformAdmin = !!log.platformAdminEmail;
                  const actor = isPlatformAdmin ? log.platformAdminEmail : (log.userEmail ?? (log.userId ? `User #${log.userId}` : "—"));
                  const actionLabel = ACTION_LABELS[log.action] ?? log.action;
                  const moduleStyle = MODULE_COLORS[log.module ?? ""] ?? "bg-muted text-muted-foreground";
                  return (
                    <TableRow key={log.id} className="border-border hover:bg-accent/20 transition-colors text-sm">
                      <TableCell className="text-muted-foreground font-mono text-xs">{log.id}</TableCell>
                      <TableCell className="text-muted-foreground font-mono text-xs">{log.tenantId}</TableCell>
                      <TableCell className="text-xs">
                        <div className="flex items-center gap-1.5">
                          {isPlatformAdmin ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 text-xs font-medium whitespace-nowrap">
                              <Shield className="w-3 h-3" /> Platform Admin
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 text-xs font-medium whitespace-nowrap">
                              <User className="w-3 h-3" /> HRMS User
                            </span>
                          )}
                          <span className="text-muted-foreground truncate max-w-[160px]" title={actor ?? ""}>{actor}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded text-foreground whitespace-nowrap">{actionLabel}</code>
                      </TableCell>
                      <TableCell>
                        {log.module ? (
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${moduleStyle}`}>{log.module}</span>
                        ) : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-xs max-w-xs">
                        {log.newValue ? (
                          <span className="text-foreground truncate block max-w-[220px]" title={log.newValue}>{log.newValue}</span>
                        ) : log.recordId ? (
                          <span className="text-muted-foreground">#{log.recordId}</span>
                        ) : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs whitespace-nowrap">{fmtDate(log.createdAt)}</TableCell>
                    </TableRow>
                  );
                })}
          </TableBody>
        </Table>
        {!isLoading && data?.data.length === 0 && (
          <div className="py-12 text-center text-sm text-muted-foreground">No audit records found.</div>
        )}
      </div>

      {/* Pagination */}
      {total > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Page {page + 1} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline" size="sm" className="h-8 gap-1"
              disabled={page === 0} onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Previous
            </Button>
            <Button
              variant="outline" size="sm" className="h-8 gap-1"
              disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
