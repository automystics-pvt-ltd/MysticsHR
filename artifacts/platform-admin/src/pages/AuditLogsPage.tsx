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
import { ChevronLeft, ChevronRight, Search } from "lucide-react";

const PAGE_SIZE = 50;

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function AuditLogsPage() {
  const [page, setPage] = useState(0);
  const [tenantFilter, setTenantFilter] = useState("");

  const tenantId = tenantFilter.trim() !== "" && !Number.isNaN(Number(tenantFilter))
    ? Number(tenantFilter)
    : undefined;

  const { data, isLoading } = useQuery({
    queryKey: ["platform-audit-logs", page, tenantId],
    queryFn: () =>
      api.auditLogs({
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
        tenantId,
      }),
  });

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Audit Logs</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Cross-tenant activity log</p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-shrink-0 w-48">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Filter by Tenant ID"
            className="pl-8 h-8 text-sm"
            value={tenantFilter}
            onChange={(e) => { setTenantFilter(e.target.value); setPage(0); }}
          />
        </div>
        {tenantFilter && (
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setTenantFilter(""); setPage(0); }}>
            Clear
          </Button>
        )}
        <span className="text-xs text-muted-foreground ml-auto">
          {total.toLocaleString()} total record{total !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="bg-card border border-card-border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-muted-foreground text-xs uppercase tracking-wider font-medium w-14">ID</TableHead>
              <TableHead className="text-muted-foreground text-xs uppercase tracking-wider font-medium w-20">Tenant</TableHead>
              <TableHead className="text-muted-foreground text-xs uppercase tracking-wider font-medium">Action</TableHead>
              <TableHead className="text-muted-foreground text-xs uppercase tracking-wider font-medium">Entity</TableHead>
              <TableHead className="text-muted-foreground text-xs uppercase tracking-wider font-medium">User</TableHead>
              <TableHead className="text-muted-foreground text-xs uppercase tracking-wider font-medium">Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 10 }).map((_, i) => (
                  <TableRow key={i} className="border-border">
                    <TableCell colSpan={6}><Skeleton className="h-5 w-full" /></TableCell>
                  </TableRow>
                ))
              : data?.data.map((log) => (
                  <TableRow key={log.id} className="border-border hover:bg-accent/20 transition-colors text-sm">
                    <TableCell className="text-muted-foreground font-mono text-xs">{log.id}</TableCell>
                    <TableCell className="text-muted-foreground font-mono text-xs">{log.tenantId}</TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded text-foreground">{log.action}</code>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {log.entityType
                        ? `${log.entityType}${log.entityId ? ` #${log.entityId}` : ""}`
                        : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {log.performedByUserId ? `User #${log.performedByUserId}` : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs whitespace-nowrap">{fmtDate(log.createdAt)}</TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
        {!isLoading && data?.data.length === 0 && (
          <div className="py-12 text-center text-sm text-muted-foreground">No audit records found.</div>
        )}
      </div>

      {/* Pagination */}
      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Page {page + 1} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
