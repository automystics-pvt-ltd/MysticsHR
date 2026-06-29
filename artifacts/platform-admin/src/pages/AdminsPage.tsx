import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, PlatformAdmin } from "@/lib/api";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, MoreHorizontal } from "lucide-react";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function AdminsPage() {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editAdmin, setEditAdmin] = useState<PlatformAdmin | null>(null);
  const [form, setForm] = useState({ email: "", name: "", password: "" });
  const [editName, setEditName] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["platform-admins"],
    queryFn: () => api.listAdmins(),
  });

  const createMutation = useMutation({
    mutationFn: (d: { email: string; name: string; password: string }) => api.createAdmin(d),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["platform-admins"] });
      setCreateOpen(false);
      setForm({ email: "", name: "", password: "" });
      setFormError(null);
    },
    onError: (err: Error) => setFormError(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { name?: string; isActive?: boolean } }) =>
      api.updateAdmin(id, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["platform-admins"] });
      setEditAdmin(null);
    },
    onError: (err: Error) => setFormError(err.message),
  });

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Platform Admins</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {data ? `${data.total} admin${data.total !== 1 ? "s" : ""}` : "Authorised platform operators"}
          </p>
        </div>
        <Button
          size="sm"
          className="gap-2"
          onClick={() => { setCreateOpen(true); setFormError(null); setForm({ email: "", name: "", password: "" }); }}
        >
          <Plus className="w-4 h-4" />
          New Admin
        </Button>
      </div>

      <div className="bg-card border border-card-border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-muted-foreground text-xs uppercase tracking-wider font-medium">Name</TableHead>
              <TableHead className="text-muted-foreground text-xs uppercase tracking-wider font-medium">Email</TableHead>
              <TableHead className="text-muted-foreground text-xs uppercase tracking-wider font-medium">Status</TableHead>
              <TableHead className="text-muted-foreground text-xs uppercase tracking-wider font-medium">Created</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i} className="border-border">
                    <TableCell colSpan={5}><Skeleton className="h-5 w-full" /></TableCell>
                  </TableRow>
                ))
              : data?.data.map((admin) => (
                  <TableRow key={admin.id} className="border-border hover:bg-accent/20 transition-colors">
                    <TableCell className="font-medium text-foreground">{admin.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{admin.email}</TableCell>
                    <TableCell>
                      <Badge
                        variant={admin.isActive ? "default" : "secondary"}
                        className={admin.isActive ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" : ""}
                      >
                        {admin.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{fmtDate(admin.createdAt)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                            <MoreHorizontal className="w-3.5 h-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-popover border-popover-border">
                          <DropdownMenuItem onClick={() => { setEditAdmin(admin); setEditName(admin.name); setFormError(null); }}>
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => updateMutation.mutate({ id: admin.id, data: { isActive: !admin.isActive } })}
                            className={admin.isActive ? "text-destructive focus:text-destructive" : ""}
                          >
                            {admin.isActive ? "Deactivate" : "Activate"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
        {!isLoading && data?.data.length === 0 && (
          <div className="py-12 text-center text-sm text-muted-foreground">No platform admins found.</div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-card border-card-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Platform Admin</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Full Name</Label>
              <Input placeholder="Admin Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Email Address</Label>
              <Input type="email" placeholder="admin@mysticshr.io" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Password</Label>
              <Input type="password" placeholder="Min 8 characters" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button
              onClick={() => createMutation.mutate(form)}
              disabled={!form.email || !form.name || form.password.length < 8 || createMutation.isPending}
            >
              {createMutation.isPending ? "Creating..." : "Create Admin"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editAdmin} onOpenChange={(o) => !o && setEditAdmin(null)}>
        <DialogContent className="bg-card border-card-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename Admin</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Full Name</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditAdmin(null)}>Cancel</Button>
            <Button
              onClick={() => editAdmin && updateMutation.mutate({ id: editAdmin.id, data: { name: editName } })}
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
