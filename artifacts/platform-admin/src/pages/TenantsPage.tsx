import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, Tenant, SubscriptionPlan } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Building2, Plus, ChevronRight, MoreHorizontal, Search } from "lucide-react";

const STATUS_TABS = ["all", "active", "trial", "suspended", "archived"] as const;
type StatusTab = typeof STATUS_TABS[number];

const STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  trial: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  suspended: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  archived: "bg-muted text-muted-foreground border-border",
};

const PLAN_STYLES: Record<string, string> = {
  trial: "bg-slate-500/10 text-slate-400",
  starter: "bg-green-500/10 text-green-400",
  professional: "bg-blue-500/10 text-blue-400",
  enterprise: "bg-purple-500/10 text-purple-400",
  custom: "bg-orange-500/10 text-orange-400",
};

const INDUSTRIES = ["Technology","Finance","Healthcare","Education","Manufacturing","Retail","Services","Government","Non-profit","Other"];
const COUNTRIES = ["India","United States","United Kingdom","Singapore","UAE","Australia","Canada","Germany","France","Other"];

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function TenantsPage() {
  const qc = useQueryClient();
  const [statusTab, setStatusTab] = useState<StatusTab>("all");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "", slug: "", status: "active", planId: "",
    contactEmail: "", industry: "", country: "", website: "", notes: "",
  });

  const { data, isLoading } = useQuery({
    queryKey: ["platform-tenants", statusTab],
    queryFn: () => api.listTenants(statusTab === "all" ? undefined : statusTab),
  });

  const { data: plansData } = useQuery({
    queryKey: ["platform-plans"],
    queryFn: () => api.listPlans(),
  });

  const createMutation = useMutation({
    mutationFn: () => api.createTenant({
      name: form.name, slug: form.slug, status: form.status,
      planId: form.planId ? Number(form.planId) : undefined,
      contactEmail: form.contactEmail || undefined,
      industry: form.industry || undefined,
      country: form.country || undefined,
      website: form.website || undefined,
      notes: form.notes || undefined,
    }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["platform-tenants"] });
      void qc.invalidateQueries({ queryKey: ["platform-analytics"] });
      setCreateOpen(false);
      resetForm();
    },
    onError: (err: Error) => setFormError(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) => api.updateTenant(id, data),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["platform-tenants"] }),
  });

  function resetForm() {
    setForm({ name: "", slug: "", status: "active", planId: "", contactEmail: "", industry: "", country: "", website: "", notes: "" });
    setFormError(null);
  }

  const filtered = (data?.data ?? []).filter((t) =>
    !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.slug.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Tenants</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {data ? `${data.total} tenant${data.total !== 1 ? "s" : ""}` : "All customer organisations"}
          </p>
        </div>
        <Button size="sm" className="gap-2" onClick={() => { setCreateOpen(true); resetForm(); }}>
          <Plus className="w-4 h-4" />New Tenant
        </Button>
      </div>

      {/* Status Tabs + Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          {STATUS_TABS.map((tab) => (
            <button key={tab} onClick={() => setStatusTab(tab)}
              className={`px-3 py-1 rounded-md text-xs font-medium capitalize transition-colors ${
                statusTab === tab ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}>
              {tab}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input placeholder="Search tenants…" value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-card-border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              {["Name", "Status", "Plan", "Users", "Industry", "Country", "Created", ""].map((h) => (
                <TableHead key={h} className="text-muted-foreground text-xs uppercase tracking-wider font-medium">{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? Array.from({ length: 4 }).map((_, i) => (
              <TableRow key={i} className="border-border">
                <TableCell colSpan={8}><Skeleton className="h-5 w-full" /></TableCell>
              </TableRow>
            )) : filtered.map((t) => (
              <TableRow key={t.id} className="border-border hover:bg-accent/20 transition-colors">
                <TableCell>
                  <Link href={`/tenants/${t.id}`}>
                    <a className="font-medium text-foreground hover:text-primary flex items-center gap-1.5 group">
                      <Building2 className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary" />
                      <span>{t.name}</span>
                      <code className="text-[10px] text-muted-foreground bg-muted px-1 rounded ml-1">{t.slug}</code>
                    </a>
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={`text-xs capitalize ${STATUS_STYLES[t.status] ?? ""}`}>
                    {t.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {t.planName ? (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PLAN_STYLES[t.planType ?? ""] ?? "bg-muted text-muted-foreground"}`}>
                      {t.planName}
                    </span>
                  ) : <span className="text-xs text-muted-foreground">—</span>}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{t.userCount ?? "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{t.industry ?? "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{t.country ?? "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{fmtDate(t.createdAt)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Link href={`/tenants/${t.id}`}>
                      <a><Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground"><ChevronRight className="w-3.5 h-3.5" /></Button></a>
                    </Link>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                          <MoreHorizontal className="w-3.5 h-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-popover border-popover-border">
                        <DropdownMenuItem asChild>
                          <Link href={`/tenants/${t.id}`}><a className="w-full cursor-pointer">View Details</a></Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {t.status === "active" && (
                          <DropdownMenuItem className="text-amber-400 focus:text-amber-400"
                            onClick={() => updateMutation.mutate({ id: t.id, data: { status: "suspended" } })}>
                            Suspend
                          </DropdownMenuItem>
                        )}
                        {t.status === "suspended" && (
                          <DropdownMenuItem className="text-emerald-400 focus:text-emerald-400"
                            onClick={() => updateMutation.mutate({ id: t.id, data: { status: "active" } })}>
                            Reinstate
                          </DropdownMenuItem>
                        )}
                        {t.status === "trial" && (
                          <DropdownMenuItem className="text-emerald-400 focus:text-emerald-400"
                            onClick={() => updateMutation.mutate({ id: t.id, data: { status: "active" } })}>
                            Activate
                          </DropdownMenuItem>
                        )}
                        {t.status !== "archived" && (
                          <DropdownMenuItem className="text-destructive focus:text-destructive"
                            onClick={() => { if (confirm(`Archive "${t.name}"? This will suspend access.`)) updateMutation.mutate({ id: t.id, data: { status: "archived" } }); }}>
                            Archive
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!isLoading && filtered.length === 0 && (
          <div className="py-12 text-center text-sm text-muted-foreground">
            {search ? "No tenants match your search." : "No tenants yet. Create the first one."}
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={(o) => { if (!o) { setCreateOpen(false); resetForm(); } }}>
        <DialogContent className="bg-card border-card-border sm:max-w-xl">
          <DialogHeader><DialogTitle>Create Tenant</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="space-y-1.5">
              <Label>Organisation Name *</Label>
              <Input placeholder="Acme Corp" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value, slug: slugify(e.target.value) })} />
            </div>
            <div className="space-y-1.5">
              <Label>Slug *</Label>
              <Input placeholder="acme-corp" value={form.slug}
                onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })} />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="trial">Trial</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Subscription Plan</Label>
              <Select value={form.planId || "none"} onValueChange={(v) => setForm({ ...form, planId: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="No plan" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No plan</SelectItem>
                  {plansData?.data.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Contact Email</Label>
              <Input type="email" placeholder="admin@acme.com" value={form.contactEmail}
                onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Industry</Label>
              <Select value={form.industry} onValueChange={(v) => setForm({ ...form, industry: v })}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>{INDUSTRIES.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Country</Label>
              <Select value={form.country} onValueChange={(v) => setForm({ ...form, country: v })}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>{COUNTRIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Website</Label>
              <Input placeholder="https://acme.com" value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Notes</Label>
              <Textarea placeholder="Internal notes about this tenant…" rows={2} value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          {formError && <p className="text-sm text-destructive">{formError}</p>}
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setCreateOpen(false); resetForm(); }}>Cancel</Button>
            <Button onClick={() => createMutation.mutate()}
              disabled={!form.name || !form.slug || createMutation.isPending}>
              {createMutation.isPending ? "Creating…" : "Create Tenant"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
