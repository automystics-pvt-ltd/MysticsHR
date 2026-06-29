import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus, Search, ShieldCheck, Lock, LockOpen, UserCheck, UserX,
  Link2, RefreshCw, Copy, Check, AlertTriangle, Users, Clock, ChevronDown,
  Mail, Eye, EyeOff, Pencil, KeyRound,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { useCurrentHrmsUser } from "@/lib/useCurrentHrmsUser";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const ROLES = ["customer_admin", "hr_manager", "hr_executive", "hod", "payroll_admin", "employee"] as const;
const ROLE_LABELS: Record<string, string> = {
  customer_admin: "Admin",
  hr_manager: "HR Manager",
  hr_executive: "HR Executive",
  hod: "Head of Dept.",
  payroll_admin: "Payroll Admin",
  employee: "Employee",
};
const ROLE_COLORS: Record<string, string> = {
  customer_admin: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  hr_manager: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  hr_executive: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  hod: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300",
  payroll_admin: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300",
  employee: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

interface HrmsUser {
  id: number;
  tenantId: number;
  employeeId?: number | null;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  isLocked: boolean;
  lockedAt?: string | null;
  lockedReason?: string | null;
  failedLoginAttempts: number;
  lastLoginAt?: string | null;
  invitedAt?: string | null;
  inviteExpiry?: string | null;
  hasPassword: boolean;
  hasPendingInvite: boolean;
  createdAt: string;
  updatedAt: string;
}

interface LicenseUsage {
  used: number;
  limit: number | null;
  remaining: number | null;
  atLimit: boolean;
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}/api${path}`, {
    credentials: "include",
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

function fmtDate(d?: string | null) {
  if (!d) return "Never";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtDateTime(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

type StatusTab = "all" | "active" | "inactive" | "locked" | "pending";

export default function UsersPage() {
  const qc = useQueryClient();
  const { role: myRole, hrmsUser: me } = useCurrentHrmsUser();
  const isAdmin = myRole === "customer_admin";

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusTab, setStatusTab] = useState<StatusTab>("all");

  const { data: users = [], isLoading } = useQuery<HrmsUser[]>({
    queryKey: ["users", search, roleFilter, statusTab],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (roleFilter !== "all") params.set("role", roleFilter);
      if (statusTab !== "all") params.set("status", statusTab);
      return apiFetch(`/users?${params}`);
    },
  });

  const { data: license } = useQuery<LicenseUsage>({
    queryKey: ["license-usage"],
    queryFn: () => apiFetch("/users/license-usage"),
    enabled: isAdmin,
  });

  // Mutations
  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: object }) =>
      apiFetch<HrmsUser>(`/users/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => invalidate(),
  });
  const lockMut = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      apiFetch<HrmsUser>(`/users/${id}/lock`, { method: "POST", body: JSON.stringify({ reason }) }),
    onSuccess: () => invalidate(),
  });
  const unlockMut = useMutation({
    mutationFn: (id: number) =>
      apiFetch<HrmsUser>(`/users/${id}/unlock`, { method: "POST", body: JSON.stringify({}) }),
    onSuccess: () => invalidate(),
  });
  const createMut = useMutation({
    mutationFn: (data: object) => apiFetch<HrmsUser & { inviteUrl?: string }>("/users", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: (result) => {
      invalidate();
      setShowCreate(false);
      if (result.inviteUrl) {
        setInviteLink({ url: result.inviteUrl, name: result.name });
      }
    },
    onError: (e: Error) => setCreateError(e.message),
  });
  const genInviteMut = useMutation({
    mutationFn: (id: number) => apiFetch<{ ok: boolean; inviteUrl: string; expiresAt: string }>(`/users/${id}/generate-invite`, { method: "POST", body: JSON.stringify({}) }),
    onSuccess: (result, id) => {
      invalidate();
      const u = users.find(x => x.id === id);
      setInviteLink({ url: result.inviteUrl, name: u?.name ?? "User" });
    },
  });
  const resetPwdMut = useMutation({
    mutationFn: (id: number) => apiFetch<{ ok: boolean; resetUrl: string; expiresAt: string }>(`/users/${id}/reset-password-link`, { method: "POST", body: JSON.stringify({}) }),
    onSuccess: (result, id) => {
      invalidate();
      const u = users.find(x => x.id === id);
      setInviteLink({ url: result.resetUrl, name: u?.name ?? "User", isReset: true });
    },
  });

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["users"] });
    qc.invalidateQueries({ queryKey: ["license-usage"] });
  }

  // Dialog states
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", email: "", role: "employee", password: "", usePassword: false });
  const [createError, setCreateError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [editUser, setEditUser] = useState<HrmsUser | null>(null);
  const [editRole, setEditRole] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [editError, setEditError] = useState("");

  const [lockTarget, setLockTarget] = useState<HrmsUser | null>(null);
  const [lockReason, setLockReason] = useState("");

  const [inviteLink, setInviteLink] = useState<{ url: string; name: string; isReset?: boolean } | null>(null);
  const [copied, setCopied] = useState(false);

  function openEdit(u: HrmsUser) {
    setEditUser(u);
    setEditRole(u.role);
    setEditActive(u.isActive);
    setEditError("");
  }

  async function handleEditSave() {
    if (!editUser) return;
    setEditError("");
    try {
      await updateMut.mutateAsync({ id: editUser.id, data: { role: editRole, isActive: editActive } });
      setEditUser(null);
    } catch (e: unknown) {
      setEditError(e instanceof Error ? e.message : "Failed to save");
    }
  }

  function handleCreate() {
    setCreateError("");
    if (!createForm.name || !createForm.email) { setCreateError("Name and email are required"); return; }
    if (createForm.usePassword && createForm.password.length < 8) { setCreateError("Password must be at least 8 characters"); return; }
    createMut.mutate({
      name: createForm.name,
      email: createForm.email,
      role: createForm.role,
      ...(createForm.usePassword ? { password: createForm.password } : { sendInvite: true }),
    });
  }

  function copyLink() {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink.url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  // Stats
  const total = users.length;
  const activeCount = users.filter(u => u.isActive && !u.isLocked).length;
  const lockedCount = users.filter(u => u.isLocked).length;
  const pendingCount = users.filter(u => !u.hasPassword).length;

  const atLimit = license?.atLimit ?? false;

  return (
    <TooltipProvider delayDuration={100}>
      <div className="space-y-6">
        <PageHeader
          title="User Management"
          description="Manage accounts, roles, access, and security"
          actions={isAdmin ? (
            <Button onClick={() => { setCreateForm({ name: "", email: "", role: "employee", password: "", usePassword: false }); setCreateError(""); setShowCreate(true); }} disabled={atLimit}>
              <Plus className="w-4 h-4 mr-2" />Add User
            </Button>
          ) : undefined}
        />

        {/* License usage banner */}
        {isAdmin && license && (
          license.limit !== null ? (
            <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-sm ${
              atLimit ? "bg-destructive/10 border-destructive/30 text-destructive" :
              (license.remaining ?? 99) <= 3 ? "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-300" :
              "bg-muted/50 border-border text-muted-foreground"
            }`}>
              <Users className="w-4 h-4 shrink-0" />
              <span>
                <strong>{license.used}</strong> of <strong>{license.limit}</strong> licenses used
                {atLimit && " — upgrade your plan to add more users"}
                {!atLimit && (license.remaining ?? 99) <= 3 && ` — only ${license.remaining} remaining`}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-border bg-muted/50 text-sm text-muted-foreground">
              <Users className="w-4 h-4 shrink-0" />
              <span><strong>{license.used}</strong> users provisioned &middot; No seat limit</span>
            </div>
          )
        )}

        {/* Stats cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Users", value: total, icon: Users, color: "text-primary" },
            { label: "Active", value: activeCount, icon: UserCheck, color: "text-green-600" },
            { label: "Locked", value: lockedCount, icon: Lock, color: "text-red-600" },
            { label: "Pending Setup", value: pendingCount, icon: Clock, color: "text-amber-600" },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label} className="border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 ${color}`} />
                  <div>
                    <p className="text-2xl font-bold text-foreground">{value}</p>
                    <p className="text-xs text-muted-foreground">{label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search by name or email…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="All Roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              {ROLES.map(r => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Status tabs */}
        <Tabs value={statusTab} onValueChange={v => setStatusTab(v as StatusTab)}>
          <TabsList className="h-9">
            <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
            <TabsTrigger value="active" className="text-xs">Active</TabsTrigger>
            <TabsTrigger value="inactive" className="text-xs">Inactive</TabsTrigger>
            <TabsTrigger value="locked" className="text-xs">Locked</TabsTrigger>
            <TabsTrigger value="pending" className="text-xs">Pending Setup</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* User list */}
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => <Card key={i} className="animate-pulse h-[72px] border-border" />)}
          </div>
        ) : !users.length ? (
          <div className="text-center py-16 text-muted-foreground">
            <ShieldCheck className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="font-medium">No users found</p>
            {(search || roleFilter !== "all" || statusTab !== "all") && (
              <Button variant="ghost" size="sm" className="mt-2" onClick={() => { setSearch(""); setRoleFilter("all"); setStatusTab("all"); }}>
                Clear filters
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {users.map((u) => (
              <Card key={u.id} className={`border-border transition-colors ${u.isLocked ? "border-red-200 dark:border-red-900 bg-red-50/30 dark:bg-red-950/10" : !u.isActive ? "opacity-60" : ""}`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-9 h-9 shrink-0">
                      <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
                        {u.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-foreground text-sm">{u.name}</p>
                        {u.id === me?.id && <Badge variant="outline" className="text-[10px] py-0 h-4">You</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    </div>

                    <div className="hidden md:flex items-center gap-2 shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[u.role]}`}>
                        {ROLE_LABELS[u.role] ?? u.role}
                      </span>
                      {u.isLocked && (
                        <Tooltip>
                          <TooltipTrigger>
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 flex items-center gap-1">
                              <Lock className="w-3 h-3" />Locked
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs text-xs">{u.lockedReason ?? "Account locked"}</p>
                            {u.lockedAt && <p className="text-xs text-muted-foreground mt-0.5">Since {fmtDate(u.lockedAt)}</p>}
                          </TooltipContent>
                        </Tooltip>
                      )}
                      {!u.hasPassword && !u.isLocked && (
                        <Tooltip>
                          <TooltipTrigger>
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 flex items-center gap-1">
                              <Clock className="w-3 h-3" />Pending
                            </span>
                          </TooltipTrigger>
                          <TooltipContent><p className="text-xs">No password set — invite link needed</p></TooltipContent>
                        </Tooltip>
                      )}
                      {!u.isLocked && u.hasPassword && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${
                          u.isActive ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800"
                            : "bg-gray-50 text-gray-500 border-gray-200 dark:bg-gray-900 dark:text-gray-400"
                        }`}>
                          {u.isActive ? "Active" : "Inactive"}
                        </span>
                      )}
                      {u.lastLoginAt && (
                        <span className="text-xs text-muted-foreground hidden lg:inline">
                          Last login {fmtDate(u.lastLoginAt)}
                        </span>
                      )}
                    </div>

                    {isAdmin && (
                      <div className="flex items-center gap-1 shrink-0">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(u)}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit role & status</TooltipContent>
                        </Tooltip>

                        {u.id !== me?.id && (
                          u.isLocked ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600" onClick={() => unlockMut.mutate(u.id)} disabled={unlockMut.isPending}>
                                  <LockOpen className="w-3.5 h-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Unlock account</TooltipContent>
                            </Tooltip>
                          ) : (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-orange-600" onClick={() => { setLockTarget(u); setLockReason(""); }}>
                                  <Lock className="w-3.5 h-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Lock account</TooltipContent>
                            </Tooltip>
                          )
                        )}

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-600" onClick={() => genInviteMut.mutate(u.id)} disabled={genInviteMut.isPending}>
                              <Link2 className="w-3.5 h-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{u.hasPassword ? "Generate new invite link" : "Generate setup link"}</TooltipContent>
                        </Tooltip>

                        {u.hasPassword && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-purple-600" onClick={() => resetPwdMut.mutate(u.id)} disabled={resetPwdMut.isPending}>
                                <KeyRound className="w-3.5 h-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Reset password</TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Mobile status row */}
                  <div className="flex md:hidden items-center gap-2 mt-2 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[u.role]}`}>
                      {ROLE_LABELS[u.role] ?? u.role}
                    </span>
                    {u.isLocked && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-800 flex items-center gap-1">
                        <Lock className="w-3 h-3" />Locked
                      </span>
                    )}
                    {!u.hasPassword && !u.isLocked && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-800">Pending Setup</span>
                    )}
                    {!u.isLocked && u.hasPassword && (
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${u.isActive ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-50 text-gray-500 border-gray-200"}`}>
                        {u.isActive ? "Active" : "Inactive"}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* ── Create User Dialog ─────────────────────────────────────────── */}
      <Dialog open={showCreate} onOpenChange={v => !v && setShowCreate(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add User</DialogTitle>
            <DialogDescription>Create a new user account for your organisation.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {atLimit && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>License limit reached. Upgrade your subscription to add more users.</AlertDescription>
              </Alert>
            )}
            <div className="space-y-1.5">
              <Label>Full Name *</Label>
              <Input value={createForm.name} onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))} placeholder="Priya Sharma" disabled={atLimit} />
            </div>
            <div className="space-y-1.5">
              <Label>Email Address *</Label>
              <Input type="email" value={createForm.email} onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))} placeholder="priya@company.com" disabled={atLimit} />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={createForm.role} onValueChange={v => setCreateForm(f => ({ ...f, role: v }))} disabled={atLimit}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map(r => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="border-t border-border pt-3 space-y-3">
              <p className="text-sm font-medium text-foreground">Password Setup</p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setCreateForm(f => ({ ...f, usePassword: false }))}
                  className={`flex-1 text-left rounded-lg border p-3 text-sm transition-colors ${!createForm.usePassword ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:border-muted-foreground"}`}
                >
                  <div className="flex items-center gap-2 font-medium mb-0.5">
                    <Link2 className="w-4 h-4 text-blue-600" />
                    Generate Invite Link
                  </div>
                  <p className="text-xs text-muted-foreground">User sets own password via a secure 48-hour link</p>
                </button>
                <button
                  type="button"
                  onClick={() => setCreateForm(f => ({ ...f, usePassword: true }))}
                  className={`flex-1 text-left rounded-lg border p-3 text-sm transition-colors ${createForm.usePassword ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:border-muted-foreground"}`}
                >
                  <div className="flex items-center gap-2 font-medium mb-0.5">
                    <KeyRound className="w-4 h-4 text-purple-600" />
                    Set Password Now
                  </div>
                  <p className="text-xs text-muted-foreground">You define the initial password for this account</p>
                </button>
              </div>

              {createForm.usePassword && (
                <div className="space-y-1.5">
                  <Label>Password</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={createForm.password}
                      onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))}
                      placeholder="Min. 8 characters"
                      className="pr-10"
                    />
                    <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowPassword(p => !p)}>
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {createError && <p className="text-sm text-destructive">{createError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createMut.isPending || atLimit}>
              {createMut.isPending ? "Creating…" : "Create User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit User Dialog ───────────────────────────────────────────── */}
      <Dialog open={!!editUser} onOpenChange={v => !v && setEditUser(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>{editUser?.name} &middot; {editUser?.email}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={editRole} onValueChange={setEditRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map(r => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={editActive} onCheckedChange={setEditActive} id="editActive" />
              <Label htmlFor="editActive">Account active</Label>
            </div>
            {editUser && (
              <div className="rounded-lg bg-muted/50 p-3 space-y-1.5 text-xs text-muted-foreground">
                <p><strong>Last login:</strong> {fmtDateTime(editUser.lastLoginAt)}</p>
                <p><strong>Failed attempts:</strong> {editUser.failedLoginAttempts}</p>
                <p><strong>Member since:</strong> {fmtDate(editUser.createdAt)}</p>
              </div>
            )}
            {editError && <p className="text-sm text-destructive">{editError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>Cancel</Button>
            <Button onClick={handleEditSave} disabled={updateMut.isPending}>
              {updateMut.isPending ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Lock Account Dialog ────────────────────────────────────────── */}
      <AlertDialog open={!!lockTarget} onOpenChange={v => !v && setLockTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-destructive" />
              Lock Account
            </AlertDialogTitle>
            <AlertDialogDescription>
              Lock <strong>{lockTarget?.name}</strong>? They will be signed out immediately and cannot log in until unlocked.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="px-1 pb-2">
            <Label className="text-sm mb-1.5 block">Reason (shown to admins)</Label>
            <Textarea
              value={lockReason}
              onChange={e => setLockReason(e.target.value)}
              placeholder="e.g. Security review, policy violation…"
              className="text-sm resize-none h-20"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => { if (lockTarget) lockMut.mutate({ id: lockTarget.id, reason: lockReason }); setLockTarget(null); }}
            >
              Lock Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Invite / Reset Link Dialog ─────────────────────────────────── */}
      <Dialog open={!!inviteLink} onOpenChange={v => !v && setInviteLink(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="w-4 h-4 text-blue-600" />
              {inviteLink?.isReset ? "Password Reset Link" : "Invitation Link"}
            </DialogTitle>
            <DialogDescription>
              Share this link with <strong>{inviteLink?.name}</strong>. It expires in 48 hours.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted border border-border">
              <p className="flex-1 text-xs font-mono break-all text-foreground">{inviteLink?.url}</p>
              <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={copyLink}>
                {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                This link grants immediate access to set a password. Send it only to the intended recipient. The link is single-use and invalidates after 48 hours or on first use.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={copyLink} className="gap-2">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copied!" : "Copy Link"}
            </Button>
            <Button onClick={() => setInviteLink(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
