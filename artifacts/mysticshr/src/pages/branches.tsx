import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, MapPin, Star } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Branch {
  id: number;
  tenantId: number;
  name: string;
  code: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  phone?: string | null;
  email?: string | null;
  isHeadquarters: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface BranchForm {
  name: string;
  code: string;
  address: string;
  city: string;
  state: string;
  country: string;
  phone: string;
  email: string;
  isHeadquarters: boolean;
  isActive: boolean;
}

const emptyForm: BranchForm = {
  name: "", code: "", address: "", city: "", state: "",
  country: "India", phone: "", email: "", isHeadquarters: false, isActive: true,
};

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}/api${path}`, { credentials: "include", ...options });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export default function BranchesPage() {
  const qc = useQueryClient();
  const { data: branches = [], isLoading } = useQuery<Branch[]>({
    queryKey: ["branches"],
    queryFn: () => apiFetch("/branches"),
  });

  const createMut = useMutation({
    mutationFn: (data: BranchForm) => apiFetch<Branch>("/branches", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["branches"] }); setShowForm(false); },
    onError: (e: Error) => setError(e.message),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<BranchForm> }) =>
      apiFetch<Branch>(`/branches/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["branches"] }); setShowForm(false); },
    onError: (e: Error) => setError(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => apiFetch(`/branches/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["branches"] }); setDeleteId(null); },
  });

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState<BranchForm>(emptyForm);
  const [error, setError] = useState("");

  function openCreate() {
    setForm(emptyForm);
    setEditingId(null);
    setError("");
    setShowForm(true);
  }

  function openEdit(b: Branch) {
    setForm({
      name: b.name, code: b.code, address: b.address ?? "", city: b.city ?? "",
      state: b.state ?? "", country: b.country ?? "India", phone: b.phone ?? "",
      email: b.email ?? "", isHeadquarters: b.isHeadquarters, isActive: b.isActive,
    });
    setEditingId(b.id);
    setError("");
    setShowForm(true);
  }

  function set(key: keyof BranchForm, value: string | boolean) {
    setForm(f => ({ ...f, [key]: value }));
  }

  async function handleSubmit() {
    setError("");
    if (!form.name || !form.code) { setError("Name and code are required"); return; }
    if (editingId) {
      updateMut.mutate({ id: editingId, data: form });
    } else {
      createMut.mutate(form);
    }
  }

  const active = branches.filter(b => b.isActive);
  const hq = branches.find(b => b.isHeadquarters);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Branches"
        description={`${branches.length} branch${branches.length !== 1 ? "es" : ""} · ${active.length} active`}
        actions={<Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" />New Branch</Button>}
      />

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <Card key={i} className="animate-pulse h-36 border-border" />)}
        </div>
      ) : !branches.length ? (
        <div className="text-center py-20 text-muted-foreground">
          <MapPin className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="font-medium">No branches configured</p>
          <p className="text-sm mt-1">Add your office locations to organise employees by branch</p>
          <Button variant="outline" className="mt-4" onClick={openCreate}>Add your first branch</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {branches.map((b) => (
            <Card key={b.id} className={`border-border hover:shadow-md transition-shadow ${!b.isActive ? "opacity-60" : ""}`}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs font-mono text-muted-foreground border border-border rounded px-1.5 py-0.5">{b.code}</span>
                      {b.isHeadquarters && (
                        <span className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 flex items-center gap-1">
                          <Star className="w-3 h-3" />HQ
                        </span>
                      )}
                      {!b.isActive && (
                        <Badge variant="outline" className="text-xs text-muted-foreground">Inactive</Badge>
                      )}
                    </div>
                    <p className="font-semibold text-foreground truncate">{b.name}</p>
                    {(b.city || b.state) && (
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3 shrink-0" />
                        {[b.city, b.state, b.country].filter(Boolean).join(", ")}
                      </p>
                    )}
                    {b.address && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{b.address}</p>
                    )}
                    {b.phone && <p className="text-xs text-muted-foreground mt-0.5">{b.phone}</p>}
                  </div>
                  <div className="flex gap-1 ml-2 shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(b)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(b.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={v => { if (!v) setShowForm(false); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingId ? "Edit Branch" : "New Branch"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Branch Name *</Label>
                <Input value={form.name} onChange={e => set("name", e.target.value)} placeholder="Mumbai Office" />
              </div>
              <div className="space-y-1.5">
                <Label>Code *</Label>
                <Input value={form.code} onChange={e => set("code", e.target.value.toUpperCase())} placeholder="MUM" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Address</Label>
              <Input value={form.address} onChange={e => set("address", e.target.value)} placeholder="Street address" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>City</Label>
                <Input value={form.city} onChange={e => set("city", e.target.value)} placeholder="Mumbai" />
              </div>
              <div className="space-y-1.5">
                <Label>State</Label>
                <Input value={form.state} onChange={e => set("state", e.target.value)} placeholder="Maharashtra" />
              </div>
              <div className="space-y-1.5">
                <Label>Country</Label>
                <Input value={form.country} onChange={e => set("country", e.target.value)} placeholder="India" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="+91 22 0000 0000" />
              </div>
              <div className="space-y-1.5">
                <Label>Branch Email</Label>
                <Input value={form.email} onChange={e => set("email", e.target.value)} placeholder="mumbai@company.com" />
              </div>
            </div>
            <div className="flex items-center gap-6 pt-1">
              <div className="flex items-center gap-2.5">
                <Switch checked={form.isHeadquarters} onCheckedChange={v => set("isHeadquarters", v)} id="isHQ" />
                <Label htmlFor="isHQ">Headquarters</Label>
              </div>
              <div className="flex items-center gap-2.5">
                <Switch checked={form.isActive} onCheckedChange={v => set("isActive", v)} id="isActive" />
                <Label htmlFor="isActive">Active</Label>
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createMut.isPending || updateMut.isPending}>
              {createMut.isPending || updateMut.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={v => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Branch</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete the branch. Employees assigned to this branch will need to be reassigned.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-white hover:bg-destructive/90" onClick={() => deleteId && deleteMut.mutate(deleteId)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
