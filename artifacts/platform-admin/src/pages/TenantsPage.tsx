import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, Tenant } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Building2, Plus, ChevronRight, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function TenantsPage() {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editTenant, setEditTenant] = useState<Tenant | null>(null);
  const [form, setForm] = useState({ name: "", slug: "" });
  const [editName, setEditName] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["platform-tenants"],
    queryFn: () => api.listTenants(),
  });

  const createMutation = useMutation({
    mutationFn: (d: { name: string; slug: string }) => api.createTenant(d),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["platform-tenants"] }); setCreateOpen(false); setForm({ name: "", slug: "" }); setFormError(null); },
    onError: (err: Error) => setFormError(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { name?: string; isActive?: boolean } }) =>
      api.updateTenant(id, data),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["platform-tenants"] }); setEditTenant(null); },
    onError: (err: Error) => setFormError(err.message),
  });

  function openEdit(t: Tenant) {
    setEditTenant(t);
    setEditName(t.name);
    setFormError(null);
  }

  const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Tenants</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {data ? `${data.total} tenant${data.total !== 1 ? "s" : ""}` : "All customer organisations"}
          </p>
        </div>
        <Button size="sm" className="gap-2" onClick={() => { setCreateOpen(true); setFormError(null); setForm({ name: "", slug: "" }); }}>
          <Plus className="w-4 h-4" />
          New Tenant
        </Button>
      </div>

      <div className="bg-card border border-card-border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-muted-foreground text-xs uppercase tracking-wider font-medium">Name</TableHead>
              <TableHead className="text-muted-foreground text-xs uppercase tracking-wider font-medium">Slug</TableHead>
              <TableHead className="text-muted-foreground text-xs uppercase tracking-wider font-medium">Status</TableHead>
              <TableHead className="text-muted-foreground text-xs uppercase tracking-wider font-medium">Users</TableHead>
              <TableHead className="text-muted-foreground text-xs uppercase tracking-wider font-medium">Created</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i} className="border-border">
                    <TableCell colSpan={6}><Skeleton className="h-5 w-full" /></TableCell>
                  </TableRow>
                ))
              : data?.data.map((t) => (
                  <TableRow key={t.id} className="border-border hover:bg-accent/20 transition-colors">
                    <TableCell>
                      <Link href={`/tenants/${t.id}`}>
                        <a className="font-medium text-foreground hover:text-primary transition-colors cursor-pointer flex items-center gap-1 group">
                          <Building2 className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary" />
                          {t.name}
                        </a>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{t.slug}</code>
                    </TableCell>
                    <TableCell>
                      <Badge variant={t.isActive ? "default" : "secondary"} className={t.isActive ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20" : ""}>
                        {t.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{t.userCount ?? "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{fmtDate(t.createdAt)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Link href={`/tenants/${t.id}`}>
                          <a>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                              <ChevronRight className="w-3.5 h-3.5" />
                            </Button>
                          </a>
                        </Link>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                              <MoreHorizontal className="w-3.5 h-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-popover border-popover-border">
                            <DropdownMenuItem onClick={() => openEdit(t)}>Rename</DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => updateMutation.mutate({ id: t.id, data: { isActive: !t.isActive } })}
                              className={t.isActive ? "text-destructive focus:text-destructive" : ""}
                            >
                              {t.isActive ? "Deactivate" : "Activate"}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
        {!isLoading && data?.data.length === 0 && (
          <div className="py-12 text-center text-sm text-muted-foreground">
            No tenants yet. Create the first one.
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-card border-card-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Tenant</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Organisation Name</Label>
              <Input
                placeholder="Acme Corp"
                value={form.name}
                onChange={(e) => setForm({ name: e.target.value, slug: slugify(e.target.value) })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Slug <span className="text-muted-foreground text-xs">(URL-safe identifier)</span></Label>
              <Input
                placeholder="acme-corp"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })}
              />
            </div>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button
              onClick={() => createMutation.mutate(form)}
              disabled={!form.name || !form.slug || createMutation.isPending}
            >
              {createMutation.isPending ? "Creating..." : "Create Tenant"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editTenant} onOpenChange={(o) => !o && setEditTenant(null)}>
        <DialogContent className="bg-card border-card-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename Tenant</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Organisation Name</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditTenant(null)}>Cancel</Button>
            <Button
              onClick={() => editTenant && updateMutation.mutate({ id: editTenant.id, data: { name: editName } })}
              disabled={!editName || updateMutation.isPending}
            >
              {updateMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
