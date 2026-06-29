import { useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, Plus, Users, BarChart2 } from "lucide-react";

const ROLE_COLORS: Record<string, string> = {
  customer_admin: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  hr_manager: "bg-purple-500/15 text-purple-400 border-purple-500/20",
  employee: "bg-muted text-muted-foreground border-border",
  payroll_admin: "bg-amber-500/15 text-amber-400 border-amber-500/20",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function TenantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const tenantId = Number(id);
  const qc = useQueryClient();

  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [userForm, setUserForm] = useState({ email: "", name: "", password: "" });
  const [userError, setUserError] = useState<string | null>(null);

  const { data: tenant, isLoading: tenantLoading } = useQuery({
    queryKey: ["platform-tenant", tenantId],
    queryFn: () => api.getTenant(tenantId),
    enabled: !!tenantId,
  });

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ["platform-tenant-users", tenantId],
    queryFn: () => api.listTenantUsers(tenantId),
    enabled: !!tenantId,
  });

  const createUserMutation = useMutation({
    mutationFn: (d: { email: string; name: string; password: string }) =>
      api.createTenantUser(tenantId, d),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["platform-tenant-users", tenantId] });
      void qc.invalidateQueries({ queryKey: ["platform-tenant", tenantId] });
      setCreateUserOpen(false);
      setUserForm({ email: "", name: "", password: "" });
      setUserError(null);
    },
    onError: (err: Error) => setUserError(err.message),
  });

  if (tenantLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Tenant not found.{" "}
        <Link href="/tenants"><a className="text-primary hover:underline">Back to tenants</a></Link>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link href="/tenants">
          <a className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="w-4 h-4" />
            Tenants
          </a>
        </Link>
        <span className="text-border">/</span>
        <span className="text-foreground font-medium">{tenant.name}</span>
      </div>

      {/* Tenant info */}
      <div className="bg-card border border-card-border rounded-xl p-5">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-lg font-semibold text-foreground">{tenant.name}</h1>
            <div className="flex items-center gap-3 mt-2">
              <code className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{tenant.slug}</code>
              <Badge
                variant={tenant.isActive ? "default" : "secondary"}
                className={tenant.isActive ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" : ""}
              >
                {tenant.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-right">
            <div>
              <p className="text-2xl font-bold text-foreground">{tenant.userCount ?? 0}</p>
              <p className="text-xs text-muted-foreground">Users</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{tenant.employeeCount ?? 0}</p>
              <p className="text-xs text-muted-foreground">Employees</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="users">
        <TabsList className="bg-muted border border-border">
          <TabsTrigger value="users" className="gap-2">
            <Users className="w-3.5 h-3.5" />
            Users
          </TabsTrigger>
          <TabsTrigger value="stats" className="gap-2">
            <BarChart2 className="w-3.5 h-3.5" />
            Stats
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-muted-foreground">
              {users ? `${users.total} user${users.total !== 1 ? "s" : ""}` : ""}
            </p>
            <Button
              size="sm"
              className="gap-2"
              onClick={() => { setCreateUserOpen(true); setUserError(null); setUserForm({ email: "", name: "", password: "" }); }}
            >
              <Plus className="w-4 h-4" />
              Add Admin User
            </Button>
          </div>

          <div className="bg-card border border-card-border rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground text-xs uppercase tracking-wider font-medium">Name</TableHead>
                  <TableHead className="text-muted-foreground text-xs uppercase tracking-wider font-medium">Email</TableHead>
                  <TableHead className="text-muted-foreground text-xs uppercase tracking-wider font-medium">Role</TableHead>
                  <TableHead className="text-muted-foreground text-xs uppercase tracking-wider font-medium">Status</TableHead>
                  <TableHead className="text-muted-foreground text-xs uppercase tracking-wider font-medium">Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usersLoading
                  ? Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i} className="border-border">
                        <TableCell colSpan={5}><Skeleton className="h-5 w-full" /></TableCell>
                      </TableRow>
                    ))
                  : users?.data.map((u) => (
                      <TableRow key={u.id} className="border-border hover:bg-accent/20 transition-colors">
                        <TableCell className="font-medium text-foreground">{u.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-xs ${ROLE_COLORS[u.role] ?? "bg-muted text-muted-foreground"}`}>
                            {u.role.replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={u.isActive ? "default" : "secondary"} className={u.isActive ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" : ""}>
                            {u.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{fmtDate(u.createdAt)}</TableCell>
                      </TableRow>
                    ))}
              </TableBody>
            </Table>
            {!usersLoading && users?.data.length === 0 && (
              <div className="py-10 text-center text-sm text-muted-foreground">
                No users yet. Add the first customer admin.
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="stats" className="mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="bg-card border-card-border">
              <CardContent className="p-5">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Employees</p>
                <p className="text-3xl font-bold text-foreground mt-1.5">{tenant.employeeCount ?? 0}</p>
              </CardContent>
            </Card>
            <Card className="bg-card border-card-border">
              <CardContent className="p-5">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Active Users</p>
                <p className="text-3xl font-bold text-foreground mt-1.5">
                  {users?.data.filter((u) => u.isActive).length ?? 0}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-card border-card-border">
              <CardContent className="p-5">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Created</p>
                <p className="text-base font-semibold text-foreground mt-1.5">{fmtDate(tenant.createdAt)}</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Create User Dialog */}
      <Dialog open={createUserOpen} onOpenChange={setCreateUserOpen}>
        <DialogContent className="bg-card border-card-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Customer Admin</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Full Name</Label>
              <Input
                placeholder="Jane Smith"
                value={userForm.name}
                onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Email Address</Label>
              <Input
                type="email"
                placeholder="jane@company.com"
                value={userForm.email}
                onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Temporary Password</Label>
              <Input
                type="password"
                placeholder="Min 8 characters"
                value={userForm.password}
                onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
              />
            </div>
            {userError && <p className="text-sm text-destructive">{userError}</p>}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateUserOpen(false)}>Cancel</Button>
            <Button
              onClick={() => createUserMutation.mutate(userForm)}
              disabled={!userForm.email || !userForm.name || userForm.password.length < 8 || createUserMutation.isPending}
            >
              {createUserMutation.isPending ? "Creating..." : "Create User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
