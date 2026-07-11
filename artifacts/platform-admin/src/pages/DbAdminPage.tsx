import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, DbTable, DbColumn, DbSchema, DbRowsResponse, DbAuditEntry, IntegrityCheck, DbStats } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Database, Search, RefreshCw, ChevronLeft, ChevronRight, Plus, Pencil, Trash2,
  Archive, Play, Download, Upload, CheckCircle2, AlertTriangle, XCircle,
  Table2, Code2, ArchiveIcon, Globe, Layers, FileUp, Shield, Wrench, ScrollText, Skull,
  ChevronUp, ChevronDown, ChevronsUpDown, X, RotateCcw, Zap, Info,
} from "lucide-react";

// ─── API helpers ─────────────────────────────────────────────────────────────

const BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? `${window.location.origin}/api`;

async function dbFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
  if (!res.ok) {
    let msg = res.statusText;
    try { const b = await res.json(); msg = b.error ?? b.message ?? msg; } catch {}
    throw Object.assign(new Error(msg), { status: res.status });
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

const dbApi = {
  tables: () => dbFetch<{ data: DbTable[] }>("/platform/db/tables"),
  schema: (table: string) => dbFetch<DbSchema>(`/platform/db/tables/${table}/schema`),
  rows: (table: string, params: Record<string, string | number>) => {
    const q = new URLSearchParams(Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)]))).toString();
    return dbFetch<DbRowsResponse>(`/platform/db/tables/${table}/rows?${q}`);
  },
  createRow: (table: string, data: Record<string, unknown>) =>
    dbFetch(`/platform/db/tables/${table}/rows`, { method: "POST", body: JSON.stringify(data) }),
  updateRow: (table: string, id: unknown, data: Record<string, unknown>) =>
    dbFetch(`/platform/db/tables/${table}/rows/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteRow: (table: string, id: unknown) =>
    dbFetch(`/platform/db/tables/${table}/rows/${id}`, { method: "DELETE" }),
  archiveRow: (table: string, id: unknown, reason: string) =>
    dbFetch(`/platform/db/tables/${table}/rows/${id}/archive`, { method: "POST", body: JSON.stringify({ reason }) }),
  archives: (table: string, page: number) =>
    dbFetch<{ data: Record<string, unknown>[]; total: number }>(`/platform/db/archives?table=${table}&page=${page}`),
  allArchives: (page: number) =>
    dbFetch<{ data: Record<string, unknown>[]; total: number }>(`/platform/db/archives?page=${page}`),
  sql: (query: string, readOnly: boolean) =>
    dbFetch<{ rows: Record<string, unknown>[]; row_count: number; elapsed_ms: number }>(
      "/platform/db/sql", { method: "POST", body: JSON.stringify({ query, read_only: readOnly }) }
    ),
  search: (q: string) => dbFetch<{ data: { table: string; rows: Record<string, unknown>[] }[]; query: string }>(`/platform/db/search?q=${encodeURIComponent(q)}`),
  bulk: (table: string, ids: unknown[], action: string, reason?: string) =>
    dbFetch<{ ok: boolean; affected: number }>("/platform/db/bulk", { method: "POST", body: JSON.stringify({ table, ids, action, reason }) }),
  integrity: () => dbFetch<{ checks: IntegrityCheck[]; overall: string; checked_at: string }>("/platform/db/integrity", { method: "POST" }),
  vacuum: (table?: string) => dbFetch<{ ok: boolean; message: string }>("/platform/db/maintenance/vacuum", { method: "POST", body: JSON.stringify({ table }) }),
  reindex: (table: string) => dbFetch<{ ok: boolean; message: string }>("/platform/db/maintenance/reindex", { method: "POST", body: JSON.stringify({ table }) }),
  cleanupSessions: () => dbFetch<{ ok: boolean; message: string }>("/platform/db/maintenance/cleanup-sessions", { method: "POST" }),
  cleanupAuditLogs: (days: number) => dbFetch<{ ok: boolean; message: string; deleted: number }>("/platform/db/maintenance/cleanup-audit-logs", { method: "POST", body: JSON.stringify({ days }) }),
  auditLog: (params: Record<string, string | number>) => {
    const q = new URLSearchParams(Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)]))).toString();
    return dbFetch<{ data: DbAuditEntry[]; total: number; page: number; limit: number }>(`/platform/db/audit-log?${q}`);
  },
  stats: () => dbFetch<DbStats>("/platform/db/stats"),
  truncate: (table: string, confirmText: string) =>
    dbFetch<{ ok: boolean; message: string; deleted_count: number }>("/platform/db/danger/truncate", {
      method: "POST", body: JSON.stringify({ table, confirm_text: confirmText }),
    }),
  exportUrl: (table: string, search?: string) =>
    `${BASE}/platform/db/export/${table}${search ? `?search=${encodeURIComponent(search)}` : ""}`,
};

// ─── TABS ─────────────────────────────────────────────────────────────────────

const TABS = [
  { id: "browser",    icon: Table2,      label: "Record Browser" },
  { id: "sql",        icon: Code2,       label: "SQL Console" },
  { id: "archives",   icon: ArchiveIcon, label: "Archives" },
  { id: "search",     icon: Globe,       label: "Global Search" },
  { id: "bulk",       icon: Layers,      label: "Bulk Operations" },
  { id: "import",     icon: FileUp,      label: "Import / Export" },
  { id: "integrity",  icon: Shield,      label: "Integrity" },
  { id: "maint",      icon: Wrench,      label: "Maintenance" },
  { id: "audit",      icon: ScrollText,  label: "DB Audit Log" },
  { id: "danger",     icon: Skull,       label: "Danger Zone" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function fmtBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

// ─── Row Editor Dialog ────────────────────────────────────────────────────────

function RowEditorDialog({
  open, onClose, table, columns, row, isCreate,
  onSave,
}: {
  open: boolean; onClose: () => void; table: string;
  columns: DbColumn[]; row: Record<string, unknown> | null; isCreate: boolean;
  onSave: (data: Record<string, unknown>) => Promise<void>;
}) {
  const [form, setForm] = useState<Record<string, string>>(() => {
    const base: Record<string, string> = {};
    for (const col of columns) {
      const v = row?.[col.column_name];
      base[col.column_name] = v !== null && v !== undefined
        ? (typeof v === "object" ? JSON.stringify(v) : String(v))
        : "";
    }
    return base;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const editableCols = isCreate
    ? columns.filter((c) => c.column_name !== "id" && !c.column_default?.includes("nextval"))
    : columns.filter((c) => c.column_name !== "id");

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const data: Record<string, unknown> = {};
      for (const col of editableCols) {
        const v = form[col.column_name];
        if (v === "" || v === undefined) continue;
        if (col.data_type === "jsonb" || col.data_type === "json") {
          try { data[col.column_name] = JSON.parse(v); } catch { data[col.column_name] = v; }
        } else if (["integer","bigint","smallint","numeric","real","double precision"].includes(col.data_type)) {
          data[col.column_name] = Number(v);
        } else if (col.data_type === "boolean") {
          data[col.column_name] = v === "true" || v === "1" || v === "yes";
        } else {
          data[col.column_name] = v;
        }
      }
      await onSave(data);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isCreate ? "Create Record" : "Edit Record"} — <span className="text-primary font-mono text-sm">{table}</span></DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          {editableCols.map((col) => (
            <div key={col.column_name} className="space-y-1">
              <Label className="text-xs text-muted-foreground font-mono">
                {col.column_name}
                <span className="ml-1 opacity-60">{col.data_type}</span>
                {col.is_nullable === "NO" && <span className="ml-1 text-destructive">*</span>}
              </Label>
              {col.data_type === "jsonb" || col.data_type === "json" ? (
                <Textarea
                  className="font-mono text-xs h-20"
                  value={form[col.column_name] ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, [col.column_name]: e.target.value }))}
                />
              ) : col.data_type === "boolean" ? (
                <select
                  className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                  value={form[col.column_name] ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, [col.column_name]: e.target.value }))}>
                  <option value="">— null —</option>
                  <option value="true">true</option>
                  <option value="false">false</option>
                </select>
              ) : (
                <Input
                  className="font-mono text-xs"
                  value={form[col.column_name] ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, [col.column_name]: e.target.value }))}
                />
              )}
            </div>
          ))}
        </div>
        {error && <p className="text-xs text-destructive bg-destructive/10 rounded px-3 py-2">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={() => void handleSave()} disabled={saving}>
            {saving ? "Saving…" : isCreate ? "Create Record" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── 1. Record Browser ───────────────────────────────────────────────────────

function RecordBrowserTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tableSearch, setTableSearch] = useState("");
  const [rowSearch, setRowSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sortCol, setSortCol] = useState("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [subTab, setSubTab] = useState<"data" | "schema">("data");
  const [editRow, setEditRow] = useState<Record<string, unknown> | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [archiveRow, setArchiveRow] = useState<Record<string, unknown> | null>(null);
  const [archiveReason, setArchiveReason] = useState("");
  const [deleteRow, setDeleteRow] = useState<Record<string, unknown> | null>(null);

  const { data: tablesData, isLoading: tablesLoading } = useQuery({
    queryKey: ["db-tables"],
    queryFn: dbApi.tables,
    staleTime: 30000,
  });

  const { data: schemaData } = useQuery({
    queryKey: ["db-schema", selectedTable],
    queryFn: () => dbApi.schema(selectedTable!),
    enabled: !!selectedTable,
  });

  const { data: rowsData, isLoading: rowsLoading, refetch: refetchRows } = useQuery({
    queryKey: ["db-rows", selectedTable, rowSearch, page, sortCol, sortDir],
    queryFn: () => dbApi.rows(selectedTable!, { search: rowSearch, page, limit: 50, sort: sortCol, dir: sortDir }),
    enabled: !!selectedTable,
    staleTime: 5000,
  });

  const filteredTables = (tablesData?.data ?? []).filter((t) =>
    t.table_name.toLowerCase().includes(tableSearch.toLowerCase())
  );

  const columns = schemaData?.columns ?? [];

  function handleSort(col: string) {
    if (sortCol === col) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
    setPage(1);
  }

  function SortIcon({ col }: { col: string }) {
    if (sortCol !== col) return <ChevronsUpDown className="w-3 h-3 opacity-30" />;
    return sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
  }

  async function handleCreate(data: Record<string, unknown>) {
    await dbApi.createRow(selectedTable!, data);
    void qc.invalidateQueries({ queryKey: ["db-rows", selectedTable] });
    void qc.invalidateQueries({ queryKey: ["db-tables"] });
    toast({ title: "Record created" });
  }

  async function handleUpdate(data: Record<string, unknown>) {
    await dbApi.updateRow(selectedTable!, editRow!.id, data);
    void qc.invalidateQueries({ queryKey: ["db-rows", selectedTable] });
    toast({ title: "Record updated" });
  }

  async function handleArchiveConfirm() {
    await dbApi.archiveRow(selectedTable!, archiveRow!.id, archiveReason);
    void qc.invalidateQueries({ queryKey: ["db-rows", selectedTable] });
    toast({ title: "Record archived" });
    setArchiveRow(null);
    setArchiveReason("");
  }

  async function handleDeleteConfirm() {
    await dbApi.deleteRow(selectedTable!, deleteRow!.id);
    void qc.invalidateQueries({ queryKey: ["db-rows", selectedTable] });
    void qc.invalidateQueries({ queryKey: ["db-tables"] });
    toast({ title: "Record deleted", variant: "destructive" });
    setDeleteRow(null);
  }

  function cellValue(v: unknown): string {
    if (v === null || v === undefined) return "";
    if (typeof v === "object") return JSON.stringify(v).slice(0, 80);
    return String(v).slice(0, 80);
  }

  const rows = rowsData?.data ?? [];
  const allCols = rows.length > 0 ? Object.keys(rows[0]) : columns.map((c) => c.column_name);

  return (
    <div className="flex h-full overflow-hidden">
      {/* Table sidebar */}
      <div className="w-64 flex-shrink-0 flex flex-col border-r border-border overflow-hidden" style={{ background: "hsl(228 30% 7%)" }}>
        <div className="p-3 border-b border-border">
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-background/60">
            <Search className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <input
              className="flex-1 bg-transparent text-xs outline-none text-foreground placeholder:text-muted-foreground/60"
              placeholder="Filter tables…"
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
            />
            {tableSearch && (
              <button onClick={() => setTableSearch("")}><X className="w-3 h-3 text-muted-foreground" /></button>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto py-1">
          {tablesLoading ? (
            <div className="p-3 space-y-1">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-7 w-full rounded" />)}</div>
          ) : filteredTables.map((t) => (
            <button
              key={t.table_name}
              onClick={() => { setSelectedTable(t.table_name); setPage(1); setRowSearch(""); setSortCol(""); }}
              className="w-full flex items-center justify-between px-3 py-[7px] text-left transition-colors"
              style={selectedTable === t.table_name ? {
                background: "hsl(217 80% 52% / 0.15)",
                color: "hsl(213 60% 90%)",
              } : { color: "hsl(220 15% 52%)" }}
              onMouseEnter={(e) => { if (selectedTable !== t.table_name) (e.currentTarget as HTMLElement).style.background = "hsl(228 20% 10%)"; }}
              onMouseLeave={(e) => { if (selectedTable !== t.table_name) (e.currentTarget as HTMLElement).style.background = ""; }}
            >
              <span className="text-xs font-mono truncate">{t.table_name}</span>
              <span className="text-[10px] ml-2 flex-shrink-0 tabular-nums opacity-60">{t.row_count}</span>
            </button>
          ))}
        </div>
        <div className="px-3 py-2 border-t border-border">
          <p className="text-[10px] text-muted-foreground/50">{filteredTables.length} tables</p>
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!selectedTable ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Table2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm">Select a table from the sidebar to browse its records</p>
            </div>
          </div>
        ) : (
          <>
            {/* Table header */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-card/30">
              <div className="flex items-center gap-3">
                <h2 className="font-mono text-sm font-semibold text-foreground">{selectedTable}</h2>
                {rowsData && <Badge variant="outline" className="text-[10px]">{rowsData.total} rows</Badge>}
                {/* Sub-tabs */}
                <div className="flex gap-1 ml-2">
                  {(["data", "schema"] as const).map((t) => (
                    <button key={t} onClick={() => setSubTab(t)}
                      className="px-3 py-1 rounded text-[11px] font-medium capitalize transition-colors"
                      style={subTab === t ? { background: "hsl(217 80% 52% / 0.2)", color: "hsl(213 70% 85%)" } : { color: "hsl(220 15% 50%)" }}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {subTab === "data" && (
                  <>
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-background/60 border border-border">
                      <Search className="w-3.5 h-3.5 text-muted-foreground" />
                      <input
                        className="bg-transparent text-xs outline-none w-44 text-foreground placeholder:text-muted-foreground/60"
                        placeholder="Search across all columns…"
                        value={rowSearch}
                        onChange={(e) => { setRowSearch(e.target.value); setPage(1); }}
                      />
                      {rowSearch && <button onClick={() => setRowSearch("")}><X className="w-3 h-3 text-muted-foreground" /></button>}
                    </div>
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => void refetchRows()}>
                      <RefreshCw className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => {
                      const url = dbApi.exportUrl(selectedTable, rowSearch);
                      window.open(url, "_blank");
                    }}>
                      <Download className="w-3 h-3" />CSV
                    </Button>
                    <Button size="sm" className="h-7 text-xs gap-1" onClick={() => setCreateOpen(true)}>
                      <Plus className="w-3 h-3" />New
                    </Button>
                  </>
                )}
              </div>
            </div>

            {subTab === "schema" ? (
              <div className="flex-1 overflow-auto p-4 space-y-4">
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Columns</h3>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border">
                        {["Column","Type","Nullable","Default"].map((h) => (
                          <th key={h} className="text-left py-2 px-3 text-muted-foreground font-medium">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {columns.map((col, i) => (
                        <tr key={col.column_name} className={i % 2 === 0 ? "bg-card/20" : ""}>
                          <td className="py-2 px-3 font-mono font-semibold text-foreground">{col.column_name}</td>
                          <td className="py-2 px-3 text-blue-400 font-mono">{col.data_type}</td>
                          <td className="py-2 px-3">{col.is_nullable === "YES" ? <span className="text-muted-foreground">nullable</span> : <span className="text-amber-400">NOT NULL</span>}</td>
                          <td className="py-2 px-3 font-mono text-muted-foreground">{col.column_default ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {schemaData && schemaData.indexes.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Indexes</h3>
                    <div className="space-y-1">
                      {schemaData.indexes.map((idx) => (
                        <div key={idx.indexname} className="bg-card/30 rounded px-3 py-2">
                          <p className="text-xs font-mono font-semibold text-foreground">{idx.indexname}</p>
                          <p className="text-[11px] font-mono text-muted-foreground mt-0.5">{idx.indexdef}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-auto">
                  {rowsLoading ? (
                    <div className="p-4 space-y-2">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-9 w-full rounded" />)}</div>
                  ) : rows.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center h-full text-muted-foreground text-sm">
                      {rowSearch ? "No rows match your search" : "This table is empty"}
                    </div>
                  ) : (
                    <table className="w-full text-xs border-collapse">
                      <thead className="sticky top-0 z-10" style={{ background: "hsl(228 28% 8%)" }}>
                        <tr className="border-b border-border">
                          <th className="w-8 py-2 px-2 text-center text-muted-foreground font-medium">#</th>
                          {allCols.map((col) => (
                            <th key={col} onClick={() => handleSort(col)}
                              className="text-left py-2 px-3 text-muted-foreground font-medium cursor-pointer hover:text-foreground whitespace-nowrap">
                              <div className="flex items-center gap-1">{col}<SortIcon col={col} /></div>
                            </th>
                          ))}
                          <th className="w-20 py-2 px-3 text-center text-muted-foreground font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row, i) => (
                          <tr key={i} className="border-b border-border/40 hover:bg-card/30 group">
                            <td className="py-2 px-2 text-center text-muted-foreground/50 tabular-nums">{(page - 1) * 50 + i + 1}</td>
                            {allCols.map((col) => (
                              <td key={col} className="py-2 px-3 font-mono max-w-[200px] truncate" title={String(row[col] ?? "")}>
                                {row[col] === null ? <span className="text-muted-foreground/40 italic">null</span>
                                  : typeof row[col] === "boolean" ? <span className={row[col] ? "text-green-400" : "text-red-400"}>{String(row[col])}</span>
                                  : cellValue(row[col])}
                              </td>
                            ))}
                            <td className="py-2 px-3">
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => setEditRow(row)} className="p-1 rounded hover:bg-blue-500/20 hover:text-blue-400 transition-colors" title="Edit">
                                  <Pencil className="w-3 h-3" />
                                </button>
                                <button onClick={() => setArchiveRow(row)} className="p-1 rounded hover:bg-amber-500/20 hover:text-amber-400 transition-colors" title="Archive">
                                  <Archive className="w-3 h-3" />
                                </button>
                                <button onClick={() => setDeleteRow(row)} className="p-1 rounded hover:bg-red-500/20 hover:text-red-400 transition-colors" title="Delete">
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Pagination */}
                {rowsData && rowsData.pages > 1 && (
                  <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-card/20">
                    <p className="text-xs text-muted-foreground">
                      {(page - 1) * 50 + 1}–{Math.min(page * 50, rowsData.total)} of {rowsData.total} rows
                    </p>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="outline" className="h-6 w-6 p-0" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                        <ChevronLeft className="w-3 h-3" />
                      </Button>
                      <span className="text-xs text-muted-foreground px-2">Page {page} / {rowsData.pages}</span>
                      <Button size="sm" variant="outline" className="h-6 w-6 p-0" disabled={page === rowsData.pages} onClick={() => setPage((p) => p + 1)}>
                        <ChevronRight className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* Edit / Create dialogs */}
      {editRow && columns.length > 0 && (
        <RowEditorDialog
          open={!!editRow} onClose={() => setEditRow(null)}
          table={selectedTable!} columns={columns} row={editRow} isCreate={false}
          onSave={handleUpdate}
        />
      )}
      {createOpen && columns.length > 0 && (
        <RowEditorDialog
          open={createOpen} onClose={() => setCreateOpen(false)}
          table={selectedTable!} columns={columns} row={null} isCreate={true}
          onSave={handleCreate}
        />
      )}

      {/* Archive dialog */}
      <Dialog open={!!archiveRow} onOpenChange={(o) => { if (!o) setArchiveRow(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Archive Record</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">The record will be moved to the archive store. It won't be deleted from the database but will be flagged as archived.</p>
          <div className="space-y-1.5">
            <Label className="text-xs">Reason (optional)</Label>
            <Textarea
              placeholder="Why are you archiving this record?"
              value={archiveReason}
              onChange={(e) => setArchiveReason(e.target.value)}
              className="h-20"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setArchiveRow(null)}>Cancel</Button>
            <Button variant="secondary" onClick={() => void handleArchiveConfirm()}><Archive className="w-3.5 h-3.5 mr-1.5" />Archive</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteRow} onOpenChange={(o) => { if (!o) setDeleteRow(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Record?</AlertDialogTitle>
            <AlertDialogDescription>This permanently deletes the record from the database. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => void handleDeleteConfirm()}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── 2. SQL Console ──────────────────────────────────────────────────────────

function SqlConsoleTab() {
  const [query, setQuery] = useState("SELECT * FROM tenants LIMIT 10;");
  const [readOnly, setReadOnly] = useState(true);
  const [result, setResult] = useState<{ rows: Record<string, unknown>[]; row_count: number; elapsed_ms: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const { toast } = useToast();

  async function runQuery() {
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const res = await dbApi.sql(query, readOnly);
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Query failed");
    } finally {
      setRunning(false);
    }
  }

  const cols = result?.rows[0] ? Object.keys(result.rows[0]) : [];

  return (
    <div className="flex flex-col h-full p-4 gap-4">
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-semibold">SQL Console</h2>
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
          <input type="checkbox" checked={readOnly} onChange={(e) => setReadOnly(e.target.checked)} />
          Read-only (SELECT only)
        </label>
        {!readOnly && (
          <Badge variant="destructive" className="text-[10px]">WRITE MODE — mutations are logged</Badge>
        )}
      </div>
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-border" style={{ background: "hsl(228 30% 7%)" }}>
          <span className="text-[10px] text-muted-foreground font-mono">SQL Query</span>
          <Button size="sm" className="h-6 text-xs gap-1" onClick={() => void runQuery()} disabled={running}>
            <Play className="w-3 h-3" />{running ? "Running…" : "Run"}
          </Button>
        </div>
        <Textarea
          className="font-mono text-xs border-0 rounded-none resize-none focus-visible:ring-0 bg-card/30"
          style={{ minHeight: 180 }}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); void runQuery(); } }}
          placeholder="-- Press Ctrl+Enter to run&#10;SELECT * FROM tenants LIMIT 10;"
        />
      </div>
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3">
          <p className="text-xs font-mono text-destructive">{error}</p>
        </div>
      )}
      {result && (
        <div className="flex-1 flex flex-col overflow-hidden rounded-lg border border-border">
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-border" style={{ background: "hsl(228 30% 7%)" }}>
            <span className="text-[10px] text-muted-foreground">{result.row_count} row{result.row_count !== 1 ? "s" : ""} · {result.elapsed_ms}ms</span>
            <Button size="sm" variant="outline" className="h-5 text-[10px] gap-1" onClick={() => {
              const csvLines = [cols.join(","), ...result.rows.map((r) => cols.map((c) => `"${String(r[c] ?? "").replace(/"/g, '""')}"`).join(","))].join("\n");
              const blob = new Blob([csvLines], { type: "text/csv" });
              const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "query-result.csv"; a.click();
            }}>
              <Download className="w-3 h-3" />CSV
            </Button>
          </div>
          <div className="flex-1 overflow-auto">
            {result.rows.length === 0 ? (
              <div className="flex items-center justify-center h-20 text-muted-foreground text-sm">Query returned 0 rows</div>
            ) : (
              <table className="w-full text-xs border-collapse">
                <thead className="sticky top-0" style={{ background: "hsl(228 28% 8%)" }}>
                  <tr className="border-b border-border">
                    {cols.map((c) => <th key={c} className="text-left py-2 px-3 text-muted-foreground font-medium font-mono whitespace-nowrap">{c}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((row, i) => (
                    <tr key={i} className="border-b border-border/40 hover:bg-card/30">
                      {cols.map((c) => (
                        <td key={c} className="py-2 px-3 font-mono max-w-[300px] truncate" title={String(row[c] ?? "")}>
                          {row[c] === null ? <span className="text-muted-foreground/40 italic">null</span>
                            : typeof row[c] === "object" ? JSON.stringify(row[c]).slice(0, 60)
                            : String(row[c])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 3. Archives ─────────────────────────────────────────────────────────────

function ArchivesTab() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ["db-archives", page],
    queryFn: () => dbApi.allArchives(page),
  });
  const rows = data?.data ?? [];
  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Archived Records</h2>
        <Badge variant="outline">{data?.total ?? 0} total</Badge>
      </div>
      {isLoading ? <Skeleton className="h-40 w-full" /> : rows.length === 0 ? (
        <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">No archived records</div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-xs">
            <thead style={{ background: "hsl(228 28% 8%)" }}>
              <tr className="border-b border-border">
                {["ID","Table","Record ID","Reason","Archived By","Date"].map((h) => (
                  <th key={h} className="text-left py-2 px-3 text-muted-foreground font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-b border-border/40 hover:bg-card/30">
                  <td className="py-2 px-3 font-mono">{String(r.id)}</td>
                  <td className="py-2 px-3 font-mono text-blue-400">{String(r.table_name)}</td>
                  <td className="py-2 px-3 font-mono">{String(r.record_id)}</td>
                  <td className="py-2 px-3 text-muted-foreground">{String(r.reason || "—")}</td>
                  <td className="py-2 px-3 text-muted-foreground">{String(r.admin_email)}</td>
                  <td className="py-2 px-3 text-muted-foreground">{new Date(String(r.created_at)).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data && Math.ceil(data.total / 50) > 1 && (
        <div className="flex items-center gap-2 justify-end">
          <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft className="w-3 h-3" /></Button>
          <span className="text-xs text-muted-foreground">Page {page}</span>
          <Button size="sm" variant="outline" disabled={page * 50 >= (data?.total ?? 0)} onClick={() => setPage((p) => p + 1)}><ChevronRight className="w-3 h-3" /></Button>
        </div>
      )}
    </div>
  );
}

// ─── 4. Global Search ────────────────────────────────────────────────────────

function GlobalSearchTab() {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<{ table: string; rows: Record<string, unknown>[] }[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function doSearch() {
    if (query.trim().length < 2) return;
    setSearching(true); setError(null); setResults(null);
    try {
      const res = await dbApi.search(query.trim());
      setResults(res.data);
    } catch (e) { setError(e instanceof Error ? e.message : "Search failed"); }
    finally { setSearching(false); }
  }

  return (
    <div className="p-4 space-y-4">
      <div>
        <h2 className="text-sm font-semibold mb-1">Global Search</h2>
        <p className="text-xs text-muted-foreground">Search text across all tables (up to 5 matches per table, first 30 tables)</p>
      </div>
      <div className="flex gap-2">
        <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-card/30">
          <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <input
            className="flex-1 bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground/60"
            placeholder="Search across all columns in all tables…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void doSearch(); }}
          />
        </div>
        <Button onClick={() => void doSearch()} disabled={searching || query.trim().length < 2}>
          {searching ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Search"}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {results !== null && (
        results.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">No matches found for "{query}"</div>
        ) : (
          <div className="space-y-4">
            {results.map(({ table, rows }) => (
              <div key={table} className="rounded-lg border border-border overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2 border-b border-border" style={{ background: "hsl(228 28% 8%)" }}>
                  <Table2 className="w-3.5 h-3.5 text-primary" />
                  <span className="font-mono text-xs font-semibold">{table}</span>
                  <Badge variant="outline" className="text-[10px]">{rows.length} match{rows.length !== 1 ? "es" : ""}</Badge>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <tbody>
                      {rows.slice(0, 3).map((row, i) => (
                        <tr key={i} className="border-b border-border/40">
                          {Object.entries(row).slice(0, 6).map(([k, v]) => (
                            <td key={k} className="py-2 px-3">
                              <span className="text-muted-foreground font-mono">{k}: </span>
                              <span className="font-mono">{String(v ?? "").slice(0, 50)}</span>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}

// ─── 5. Bulk Operations ──────────────────────────────────────────────────────

function BulkOperationsTab() {
  const [selectedTable, setSelectedTable] = useState("");
  const [idsText, setIdsText] = useState("");
  const [action, setAction] = useState<"delete" | "archive">("archive");
  const [reason, setReason] = useState("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const { toast } = useToast();
  const { data: tablesData } = useQuery({ queryKey: ["db-tables"], queryFn: dbApi.tables });

  async function runBulk() {
    const ids = idsText.split(/[\n,\s]+/).map((s) => s.trim()).filter(Boolean).map((s) => isNaN(Number(s)) ? s : Number(s));
    if (!selectedTable || ids.length === 0) return;
    setRunning(true); setResult(null);
    try {
      const res = await dbApi.bulk(selectedTable, ids, action, reason);
      setResult(`✓ ${action === "delete" ? "Deleted" : "Archived"} ${res.affected} record(s)`);
      toast({ title: `Bulk ${action} complete`, description: `${res.affected} record(s) affected` });
    } catch (e) {
      setResult(`✗ ${e instanceof Error ? e.message : "Failed"}`);
    } finally { setRunning(false); }
  }

  return (
    <div className="p-4 max-w-xl space-y-4">
      <div>
        <h2 className="text-sm font-semibold mb-1">Bulk Operations</h2>
        <p className="text-xs text-muted-foreground">Delete or archive multiple records by ID at once</p>
      </div>
      <div className="space-y-3 p-4 rounded-lg border border-border bg-card/20">
        <div className="space-y-1">
          <Label className="text-xs">Table</Label>
          <select className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
            value={selectedTable} onChange={(e) => setSelectedTable(e.target.value)}>
            <option value="">— select table —</option>
            {(tablesData?.data ?? []).map((t) => <option key={t.table_name} value={t.table_name}>{t.table_name}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Record IDs (comma, space, or newline separated)</Label>
          <Textarea className="font-mono text-xs h-24" placeholder="1, 2, 3&#10;4&#10;5" value={idsText} onChange={(e) => setIdsText(e.target.value)} />
        </div>
        <div className="flex gap-3">
          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
            <input type="radio" value="archive" checked={action === "archive"} onChange={() => setAction("archive")} />
            Archive
          </label>
          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
            <input type="radio" value="delete" checked={action === "delete"} onChange={() => setAction("delete")} />
            <span className="text-destructive font-medium">Delete (permanent)</span>
          </label>
        </div>
        {action === "archive" && (
          <div className="space-y-1">
            <Label className="text-xs">Reason (optional)</Label>
            <Input className="text-xs" placeholder="Why are you archiving these records?" value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
        )}
        {result && (
          <p className={`text-xs font-mono px-3 py-2 rounded ${result.startsWith("✓") ? "bg-green-500/10 text-green-400" : "bg-destructive/10 text-destructive"}`}>{result}</p>
        )}
        <Button
          variant={action === "delete" ? "destructive" : "default"}
          className="w-full" disabled={!selectedTable || !idsText.trim() || running}
          onClick={() => void runBulk()}>
          {running ? "Processing…" : `Bulk ${action === "delete" ? "Delete" : "Archive"}`}
        </Button>
      </div>
    </div>
  );
}

// ─── 6. Import / Export ──────────────────────────────────────────────────────

function ImportExportTab() {
  const { data: tablesData } = useQuery({ queryKey: ["db-tables"], queryFn: dbApi.tables });
  const [exportTable, setExportTable] = useState("");
  const [exportSearch, setExportSearch] = useState("");

  return (
    <div className="p-4 max-w-xl space-y-6">
      <div>
        <h2 className="text-sm font-semibold mb-1">Import / Export</h2>
        <p className="text-xs text-muted-foreground">Export any table as CSV. Import via SQL Console.</p>
      </div>
      <div className="space-y-3 p-4 rounded-lg border border-border bg-card/20">
        <h3 className="text-xs font-semibold flex items-center gap-1.5"><Download className="w-3.5 h-3.5" />Export Table as CSV</h3>
        <div className="space-y-1">
          <Label className="text-xs">Table</Label>
          <select className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
            value={exportTable} onChange={(e) => setExportTable(e.target.value)}>
            <option value="">— select table —</option>
            {(tablesData?.data ?? []).map((t) => <option key={t.table_name} value={t.table_name}>{t.table_name} ({t.row_count} rows)</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Search filter (optional)</Label>
          <Input className="text-xs" placeholder="Only rows matching this text" value={exportSearch} onChange={(e) => setExportSearch(e.target.value)} />
        </div>
        <Button disabled={!exportTable} className="w-full gap-2" onClick={() => window.open(dbApi.exportUrl(exportTable, exportSearch), "_blank")}>
          <Download className="w-4 h-4" />Download CSV
        </Button>
      </div>
      <div className="space-y-3 p-4 rounded-lg border border-border bg-card/20 opacity-60">
        <h3 className="text-xs font-semibold flex items-center gap-1.5"><Upload className="w-3.5 h-3.5" />Import CSV</h3>
        <p className="text-xs text-muted-foreground">To import data, use the SQL Console with INSERT statements or COPY command. Direct CSV upload coming soon.</p>
      </div>
    </div>
  );
}

// ─── 7. Integrity ────────────────────────────────────────────────────────────

function IntegrityTab() {
  const [result, setResult] = useState<{ checks: IntegrityCheck[]; overall: string; checked_at: string } | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runCheck() {
    setRunning(true); setError(null);
    try { setResult(await dbApi.integrity()); }
    catch (e) { setError(e instanceof Error ? e.message : "Check failed"); }
    finally { setRunning(false); }
  }

  const statusIcon = (s: string) => s === "ok"
    ? <CheckCircle2 className="w-4 h-4 text-green-400" />
    : s === "warn" ? <AlertTriangle className="w-4 h-4 text-amber-400" />
    : <XCircle className="w-4 h-4 text-red-400" />;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold mb-0.5">Data Integrity Checks</h2>
          <p className="text-xs text-muted-foreground">Scan for orphaned records, broken references, and data anomalies</p>
        </div>
        <Button onClick={() => void runCheck()} disabled={running} className="gap-2">
          {running ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
          {running ? "Checking…" : "Run Integrity Check"}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {result && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {statusIcon(result.overall)}
            <span>Overall: <strong className={result.overall === "ok" ? "text-green-400" : result.overall === "warn" ? "text-amber-400" : "text-red-400"}>{result.overall.toUpperCase()}</strong></span>
            <span>· Checked at {new Date(result.checked_at).toLocaleTimeString()}</span>
          </div>
          <div className="space-y-2">
            {result.checks.map((check, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card/20">
                {statusIcon(check.status)}
                <div className="flex-1">
                  <p className="text-xs font-medium text-foreground">{check.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{check.message}</p>
                </div>
                {check.count !== undefined && <Badge variant="outline" className="text-[10px]">{check.count}</Badge>}
              </div>
            ))}
          </div>
        </div>
      )}
      {!result && !running && (
        <div className="flex items-center justify-center h-40 text-muted-foreground">
          <div className="text-center">
            <Shield className="w-10 h-10 mx-auto mb-2 opacity-20" />
            <p className="text-sm">Click "Run Integrity Check" to scan the database</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 8. Maintenance ──────────────────────────────────────────────────────────

function MaintenanceTab() {
  const { data: tablesData } = useQuery({ queryKey: ["db-tables"], queryFn: dbApi.tables });
  const [vacuumTable, setVacuumTable] = useState("");
  const [reindexTable, setReindexTable] = useState("");
  const [cleanupDays, setCleanupDays] = useState(365);
  const [results, setResults] = useState<Record<string, string>>({});
  const [running, setRunning] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  async function run(key: string, fn: () => Promise<{ ok: boolean; message: string; deleted?: number }>) {
    setRunning((r) => ({ ...r, [key]: true }));
    try {
      const res = await fn();
      setResults((r) => ({ ...r, [key]: `✓ ${res.message}` }));
      toast({ title: "Done", description: res.message });
    } catch (e) {
      setResults((r) => ({ ...r, [key]: `✗ ${e instanceof Error ? e.message : "Failed"}` }));
    } finally {
      setRunning((r) => ({ ...r, [key]: false }));
    }
  }

  return (
    <div className="p-4 space-y-4 max-w-2xl">
      <div>
        <h2 className="text-sm font-semibold mb-0.5">Maintenance Tools</h2>
        <p className="text-xs text-muted-foreground">VACUUM, REINDEX, and cleanup operations. Run during low-traffic periods.</p>
      </div>
      {[
        {
          key: "vacuum", icon: <RotateCcw className="w-4 h-4" />, title: "VACUUM ANALYZE",
          desc: "Reclaims storage from dead rows and updates query planner statistics.",
          content: (
            <div className="space-y-2">
              <div className="flex gap-2">
                <select className="flex-1 rounded-md border border-input bg-background px-2 py-1.5 text-xs"
                  value={vacuumTable} onChange={(e) => setVacuumTable(e.target.value)}>
                  <option value="">All tables</option>
                  {(tablesData?.data ?? []).map((t) => <option key={t.table_name} value={t.table_name}>{t.table_name}</option>)}
                </select>
                <Button size="sm" disabled={running.vacuum} className="gap-1" onClick={() => void run("vacuum", () => dbApi.vacuum(vacuumTable || undefined))}>
                  {running.vacuum ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                  Run
                </Button>
              </div>
              {results.vacuum && <p className={`text-xs font-mono ${results.vacuum.startsWith("✓") ? "text-green-400" : "text-destructive"}`}>{results.vacuum}</p>}
            </div>
          ),
        },
        {
          key: "reindex", icon: <Zap className="w-4 h-4" />, title: "REINDEX TABLE",
          desc: "Rebuilds all indexes on a table. Fixes index bloat and corruption.",
          content: (
            <div className="space-y-2">
              <div className="flex gap-2">
                <select className="flex-1 rounded-md border border-input bg-background px-2 py-1.5 text-xs"
                  value={reindexTable} onChange={(e) => setReindexTable(e.target.value)}>
                  <option value="">— select table —</option>
                  {(tablesData?.data ?? []).map((t) => <option key={t.table_name} value={t.table_name}>{t.table_name}</option>)}
                </select>
                <Button size="sm" disabled={running.reindex || !reindexTable} className="gap-1"
                  onClick={() => void run("reindex", () => dbApi.reindex(reindexTable))}>
                  {running.reindex ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                  Run
                </Button>
              </div>
              {results.reindex && <p className={`text-xs font-mono ${results.reindex.startsWith("✓") ? "text-green-400" : "text-destructive"}`}>{results.reindex}</p>}
            </div>
          ),
        },
        {
          key: "sessions", icon: <X className="w-4 h-4" />, title: "Clean Expired Sessions",
          desc: "Removes expired session records from the database.",
          content: (
            <div className="space-y-2">
              <Button size="sm" disabled={running.sessions} className="gap-1" onClick={() => void run("sessions", () => dbApi.cleanupSessions())}>
                {running.sessions ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                Run Cleanup
              </Button>
              {results.sessions && <p className={`text-xs font-mono ${results.sessions.startsWith("✓") ? "text-green-400" : "text-destructive"}`}>{results.sessions}</p>}
            </div>
          ),
        },
        {
          key: "auditlogs", icon: <ScrollText className="w-4 h-4" />, title: "Clean Old Audit Logs",
          desc: "Deletes audit log entries older than the specified number of days.",
          content: (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground">Keep last</label>
                <Input type="number" className="w-20 text-xs h-7" value={cleanupDays} onChange={(e) => setCleanupDays(Number(e.target.value))} min={30} />
                <label className="text-xs text-muted-foreground">days</label>
                <Button size="sm" disabled={running.auditlogs} className="gap-1" onClick={() => void run("auditlogs", () => dbApi.cleanupAuditLogs(cleanupDays))}>
                  {running.auditlogs ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                  Run
                </Button>
              </div>
              {results.auditlogs && <p className={`text-xs font-mono ${results.auditlogs.startsWith("✓") ? "text-green-400" : "text-destructive"}`}>{results.auditlogs}</p>}
            </div>
          ),
        },
      ].map(({ key, icon, title, desc, content }) => (
        <div key={key} className="p-4 rounded-lg border border-border bg-card/20 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">{icon}</span>
            <div>
              <h3 className="text-xs font-semibold">{title}</h3>
              <p className="text-[11px] text-muted-foreground">{desc}</p>
            </div>
          </div>
          {content}
        </div>
      ))}
    </div>
  );
}

// ─── 9. DB Audit Log ─────────────────────────────────────────────────────────

function DbAuditLogTab() {
  const [page, setPage] = useState(1);
  const [tableFilter, setTableFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["db-audit-log", page, tableFilter, actionFilter],
    queryFn: () => dbApi.auditLog({ page, limit: 50, table: tableFilter, action: actionFilter }),
  });

  const rows = data?.data ?? [];
  const ACTION_COLORS: Record<string, string> = {
    CREATE: "text-green-400", UPDATE: "text-blue-400", DELETE: "text-red-400",
    ARCHIVE: "text-amber-400", SQL_READ: "text-slate-400", SQL_WRITE: "text-orange-400",
    SQL_ERROR: "text-red-400", VACUUM: "text-purple-400", REINDEX: "text-purple-400",
    TRUNCATE: "text-red-400", BULK_DELETE: "text-red-400", BULK_ARCHIVE: "text-amber-400",
  };

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-sm font-semibold">DB Admin Audit Log</h2>
          <p className="text-xs text-muted-foreground">Every operation performed via DB Admin is recorded here</p>
        </div>
        <div className="flex items-center gap-2">
          <Input className="text-xs w-36 h-7" placeholder="Filter table…" value={tableFilter} onChange={(e) => { setTableFilter(e.target.value); setPage(1); }} />
          <Input className="text-xs w-36 h-7" placeholder="Filter action…" value={actionFilter} onChange={(e) => { setActionFilter(e.target.value); setPage(1); }} />
        </div>
      </div>
      {isLoading ? <Skeleton className="h-40 w-full" /> : rows.length === 0 ? (
        <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">No audit log entries found</div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-xs">
            <thead style={{ background: "hsl(228 28% 8%)" }}>
              <tr className="border-b border-border">
                {["Time","Admin","Action","Table","Details"].map((h) => (
                  <th key={h} className="text-left py-2 px-3 text-muted-foreground font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-b border-border/40 hover:bg-card/30">
                  <td className="py-2 px-3 text-muted-foreground whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="py-2 px-3 font-mono truncate max-w-[160px]">{r.admin_email}</td>
                  <td className={`py-2 px-3 font-mono font-semibold ${ACTION_COLORS[r.action] ?? "text-foreground"}`}>{r.action}</td>
                  <td className="py-2 px-3 font-mono text-blue-400">{r.table_name}</td>
                  <td className="py-2 px-3 font-mono text-muted-foreground truncate max-w-[240px]">
                    {JSON.stringify(r.details).slice(0, 80)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data && Math.ceil(data.total / 50) > 1 && (
        <div className="flex items-center gap-2 justify-end">
          <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft className="w-3 h-3" /></Button>
          <span className="text-xs text-muted-foreground">Page {page} of {Math.ceil(data.total / 50)}</span>
          <Button size="sm" variant="outline" disabled={page * 50 >= (data?.total ?? 0)} onClick={() => setPage((p) => p + 1)}><ChevronRight className="w-3 h-3" /></Button>
        </div>
      )}
    </div>
  );
}

// ─── 10. Danger Zone ─────────────────────────────────────────────────────────

function DangerZoneTab() {
  const { data: tablesData } = useQuery({ queryKey: ["db-tables"], queryFn: dbApi.tables });
  const [truncateTable, setTruncateTable] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const { toast } = useToast();
  const qc = useQueryClient();

  const expectedText = truncateTable ? `TRUNCATE ${truncateTable}` : "";

  async function handleTruncate() {
    if (confirmText !== expectedText) return;
    setRunning(true); setResult(null);
    try {
      const res = await dbApi.truncate(truncateTable, confirmText);
      setResult(`✓ ${res.message}`);
      toast({ title: "Table truncated", description: res.message, variant: "destructive" });
      void qc.invalidateQueries({ queryKey: ["db-tables"] });
      void qc.invalidateQueries({ queryKey: ["db-rows"] });
      setConfirmText(""); setTruncateTable("");
    } catch (e) {
      setResult(`✗ ${e instanceof Error ? e.message : "Failed"}`);
    } finally { setRunning(false); }
  }

  return (
    <div className="p-4 space-y-4 max-w-xl">
      <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
        <Skull className="w-5 h-5 text-red-400 flex-shrink-0" />
        <div>
          <p className="text-xs font-semibold text-red-400">DANGER ZONE — SUPER ADMIN ONLY</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Operations here are irreversible. All actions are permanently logged.</p>
        </div>
      </div>

      <div className="p-4 rounded-lg border border-red-500/20 bg-card/20 space-y-3">
        <div className="flex items-center gap-2">
          <Trash2 className="w-4 h-4 text-red-400" />
          <div>
            <h3 className="text-xs font-semibold text-red-400">TRUNCATE TABLE</h3>
            <p className="text-[11px] text-muted-foreground">Permanently deletes ALL rows in a table. Cannot be undone.</p>
          </div>
        </div>
        <div className="space-y-2">
          <div className="space-y-1">
            <Label className="text-xs">Select Table</Label>
            <select className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
              value={truncateTable} onChange={(e) => { setTruncateTable(e.target.value); setConfirmText(""); setResult(null); }}>
              <option value="">— select table to truncate —</option>
              {(tablesData?.data ?? []).map((t) => <option key={t.table_name} value={t.table_name}>{t.table_name} ({t.row_count} rows)</option>)}
            </select>
          </div>
          {truncateTable && (
            <div className="space-y-1">
              <Label className="text-xs">
                Type <code className="bg-muted px-1 rounded text-red-400 font-mono">{expectedText}</code> to confirm
              </Label>
              <Input
                className="font-mono text-xs border-red-500/30 focus-visible:ring-red-500/30"
                placeholder={expectedText}
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
              />
            </div>
          )}
          {result && <p className={`text-xs font-mono ${result.startsWith("✓") ? "text-green-400" : "text-destructive"}`}>{result}</p>}
          <Button
            variant="destructive" className="w-full gap-2"
            disabled={!truncateTable || confirmText !== expectedText || running}
            onClick={() => void handleTruncate()}>
            <Skull className="w-4 h-4" />
            {running ? "Truncating…" : "TRUNCATE TABLE"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main DB Admin Page ───────────────────────────────────────────────────────

export function DbAdminPage() {
  const [activeTab, setActiveTab] = useState<TabId>("browser");

  const { data: stats } = useQuery({
    queryKey: ["db-stats"],
    queryFn: dbApi.stats,
    staleTime: 60000,
  });

  const tabContent: Record<TabId, React.ReactNode> = {
    browser: <RecordBrowserTab />,
    sql:     <SqlConsoleTab />,
    archives: <ArchivesTab />,
    search:  <GlobalSearchTab />,
    bulk:    <BulkOperationsTab />,
    import:  <ImportExportTab />,
    integrity: <IntegrityTab />,
    maint:   <MaintenanceTab />,
    audit:   <DbAuditLogTab />,
    danger:  <DangerZoneTab />,
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Page header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-border bg-card/20">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <p className="text-xs text-muted-foreground">Platform › DB Admin</p>
            </div>
            <div className="flex items-center gap-3">
              <Database className="w-5 h-5 text-primary" />
              <h1 className="text-lg font-semibold">Database Administration Console</h1>
              <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px]">SUPER ADMIN ONLY</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Full-featured DB management — browse, query, schema inspect, bulk ops, import/export, integrity checks</p>
          </div>
          {stats && (
            <div className="flex items-center gap-4 text-right">
              <div>
                <p className="text-xs text-muted-foreground">DB Size</p>
                <p className="text-sm font-semibold">{stats.db_size}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Tables</p>
                <p className="text-sm font-semibold">{stats.table_count}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Cache Hit</p>
                <p className="text-sm font-semibold">{stats.cache_hit_pct}%</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Active Conn</p>
                <p className="text-sm font-semibold">{stats.active_connections}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex-shrink-0 border-b border-border overflow-x-auto" style={{ background: "hsl(228 28% 6%)" }}>
        <div className="flex min-w-max">
          {TABS.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className="flex items-center gap-2 px-4 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors"
              style={activeTab === id ? {
                borderColor: "hsl(217 91% 62%)",
                color: "hsl(213 60% 88%)",
                background: "hsl(217 80% 52% / 0.08)",
              } : {
                borderColor: "transparent",
                color: "hsl(220 15% 48%)",
              }}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {tabContent[activeTab]}
      </div>
    </div>
  );
}
