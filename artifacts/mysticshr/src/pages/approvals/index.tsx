import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentHrmsUser } from "@/lib/useCurrentHrmsUser";
import { useToast } from "@/hooks/use-toast";
import {
  useListLeaveApplications,
  useHodActionLeave,
  useHrActionLeave,
  getListLeaveApplicationsQueryKey,
} from "@workspace/api-client-react";
import {
  CheckCircle, XCircle, ClipboardList, Inbox,
  Home as HomeIcon, Receipt, CalendarDays, Timer, RefreshCcw,
  ArrowLeftRight, Clock, ChevronRight,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}/api${path}`, {
    credentials: "include",
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string })?.error ?? res.statusText);
  }
  return res.json();
}

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function daysSince(d: string | null | undefined): string {
  if (!d) return "";
  try {
    return formatDistanceToNow(new Date(d), { addSuffix: true });
  } catch {
    return "";
  }
}

function initials(name: string): string {
  return name.split(" ").filter(Boolean).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

const AVATAR_COLORS = [
  "bg-violet-100 text-violet-700",
  "bg-blue-100 text-blue-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-pink-100 text-pink-700",
  "bg-cyan-100 text-cyan-700",
  "bg-orange-100 text-orange-700",
  "bg-teal-100 text-teal-700",
];

function avatarColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

type ActionDialog = {
  type: "leave" | "wfh" | "expense" | "regularization" | "shift-change";
  id: number;
  action: "Approved" | "Rejected";
  subType?: "hod" | "hr";
};

const STATUS_BADGE: Record<string, string> = {
  Pending:       "bg-yellow-100 text-yellow-700 border-yellow-200",
  "HOD Approved": "bg-blue-100 text-blue-700 border-blue-200",
  Approved:      "bg-green-100 text-green-700 border-green-200",
  Rejected:      "bg-red-100 text-red-700 border-red-200",
  Submitted:     "bg-yellow-100 text-yellow-700 border-yellow-200",
};

function PendingCount({ count }: { count: number }) {
  if (!count) return null;
  return (
    <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] px-1">
      {count > 99 ? "99+" : count}
    </span>
  );
}

function EmployeeAvatar({ name }: { name: string }) {
  const color = avatarColor(name);
  return (
    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0", color)}>
      {initials(name) || "?"}
    </div>
  );
}

function sortByOldest<T extends { createdAt?: string }>(arr: T[]): T[] {
  return [...arr].sort((a, b) => {
    if (!a.createdAt) return 1;
    if (!b.createdAt) return -1;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}

function CardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-2/3" />
          </div>
          <div className="space-y-2 flex flex-col items-end">
            <Skeleton className="h-5 w-20 rounded-full" />
            <div className="flex gap-1.5">
              <Skeleton className="h-8 w-20 rounded-lg" />
              <Skeleton className="h-8 w-16 rounded-lg" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <Card className="border-dashed">
      <CardContent className="p-10 text-center flex flex-col items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-300">
          {icon}
        </div>
        <p className="text-sm text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

export default function ApprovalsHubPage() {
  const { role: hrmsRole } = useCurrentHrmsUser();
  const role = hrmsRole ?? "employee";
  const isHr = ["customer_admin", "hr_manager", "hr_executive"].includes(role);
  const isHod = role === "hod";
  const canApprove = isHr || isHod;

  const qc = useQueryClient();
  const { toast } = useToast();
  const [rejectDialog, setRejectDialog] = useState<ActionDialog | null>(null);
  const [remarks, setRemarks] = useState("");
  const [actionError, setActionError] = useState("");

  const { data: leaveApplications = [], isLoading: leaveLoading } = useListLeaveApplications({});

  const { data: wfhRequests = [], isLoading: wfhLoading } = useQuery({
    queryKey: ["wfh-requests-hub"],
    queryFn: () => apiFetch<{ id: number; firstName?: string; lastName?: string; fromDate: string; toDate: string; reason: string; status: string; createdAt: string }[]>("/wfh"),
  });

  const { data: expenseClaims = [], isLoading: expenseLoading } = useQuery({
    queryKey: ["expense-claims-hub"],
    queryFn: () => apiFetch<{ id: number; firstName?: string; lastName?: string; title: string; claimDate: string; totalAmount: string; status: string; createdAt?: string }[]>("/expense-claims"),
  });

  const { data: regularizations = [], isLoading: regLoading } = useQuery({
    queryKey: ["regularizations-hub"],
    queryFn: () => apiFetch<{ id: number; firstName?: string; lastName?: string; empCode?: string; attendanceDate: string; requestedSignIn?: string; requestedSignOut?: string; reason: string; status: string; createdAt: string }[]>("/attendance/regularizations"),
  });

  const { data: shiftChangeRequests = [], isLoading: shiftLoading } = useQuery({
    queryKey: ["shift-change-requests-hub"],
    queryFn: () => apiFetch<{ id: number; employeeName: string; currentShiftName: string; requestedShiftName: string; effectiveDate: string; reason: string; status: string; createdAt?: string }[]>("/shift-change-requests"),
  });

  const isPageLoading = leaveLoading || wfhLoading || expenseLoading || regLoading || shiftLoading;

  const hodLeaveMut = useHodActionLeave();
  const hrLeaveMut = useHrActionLeave();

  const wfhActionMut = useMutation({
    mutationFn: ({ id, action, remarks }: { id: number; action: string; remarks: string }) =>
      apiFetch(`/wfh/${id}/action`, { method: "POST", body: JSON.stringify({ action, remarks }) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["wfh-requests-hub"] }); },
  });

  const expenseActionMut = useMutation({
    mutationFn: ({ id, action, remarks }: { id: number; action: string; remarks: string }) =>
      apiFetch(`/expense-claims/${id}/action`, { method: "POST", body: JSON.stringify({ action, remarks }) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["expense-claims-hub"] }); },
  });

  const regularizationActionMut = useMutation({
    mutationFn: ({ id, action, remarks }: { id: number; action: string; remarks: string }) =>
      apiFetch(`/attendance/regularizations/${id}/action`, { method: "POST", body: JSON.stringify({ action, remarks }) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["regularizations-hub"] }); },
  });

  const shiftChangeActionMut = useMutation({
    mutationFn: ({ id, action, remarks }: { id: number; action: string; remarks: string }) =>
      apiFetch(`/shift-change-requests/${id}/action`, { method: "POST", body: JSON.stringify({ action, remarks }) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["shift-change-requests-hub"] }); },
  });

  const pendingLeave        = (leaveApplications as { status: string }[]).filter((a) => ["Pending", "HOD Approved"].includes(a.status));
  const pendingWfh          = wfhRequests.filter((r) => r.status === "Pending");
  const pendingExpense       = expenseClaims.filter((c) => c.status === "Submitted");
  const pendingReg          = regularizations.filter((r) => r.status === "Pending");
  const pendingShiftChange  = shiftChangeRequests.filter((r) => r.status === "Pending");

  const totalPending = pendingLeave.length + pendingWfh.length + pendingExpense.length + pendingReg.length + pendingShiftChange.length;

  async function runAction(type: ActionDialog["type"], id: number, action: "Approved" | "Rejected", subType?: "hod" | "hr", remarksText = "") {
    try {
      if (type === "leave") {
        if (subType === "hod") {
          await hodLeaveMut.mutateAsync({ id, data: { action, remarks: remarksText } });
        } else {
          await hrLeaveMut.mutateAsync({ id, data: { action, remarks: remarksText } });
        }
        qc.invalidateQueries({ queryKey: getListLeaveApplicationsQueryKey({}) });
      } else if (type === "wfh") {
        await wfhActionMut.mutateAsync({ id, action, remarks: remarksText });
      } else if (type === "expense") {
        await expenseActionMut.mutateAsync({ id, action, remarks: remarksText });
      } else if (type === "regularization") {
        await regularizationActionMut.mutateAsync({ id, action, remarks: remarksText });
      } else if (type === "shift-change") {
        await shiftChangeActionMut.mutateAsync({ id, action, remarks: remarksText });
      }
      toast({
        title: action === "Approved" ? "✓ Approved" : "Request Rejected",
        description: action === "Approved" ? "The request has been approved." : "The request has been rejected.",
      });
    } catch (e: unknown) {
      toast({ title: "Action failed", description: e instanceof Error ? e.message : "Something went wrong", variant: "destructive" });
    }
  }

  async function quickApprove(type: ActionDialog["type"], id: number, subType?: "hod" | "hr") {
    await runAction(type, id, "Approved", subType);
  }

  function openReject(type: ActionDialog["type"], id: number, subType?: "hod" | "hr") {
    setRejectDialog({ type, id, action: "Rejected", subType });
    setRemarks("");
    setActionError("");
  }

  async function confirmReject() {
    if (!rejectDialog) return;
    setActionError("");
    try {
      await runAction(rejectDialog.type, rejectDialog.id, "Rejected", rejectDialog.subType, remarks);
      setRejectDialog(null);
      setRemarks("");
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : "Failed");
    }
  }

  function ApproveBtn({ type, id, status, subType, small = false }: { type: ActionDialog["type"]; id: number; status: string; subType?: "hod" | "hr"; small?: boolean }) {
    const isPending = ["Pending", "HOD Approved", "Submitted"].includes(status);
    if (!isPending || !canApprove) return null;
    return (
      <div className="flex gap-2">
        <Button
          size={small ? "sm" : "default"}
          className={cn("bg-emerald-600 hover:bg-emerald-700 text-white font-medium", small ? "h-8 text-xs px-3" : "h-9 text-sm px-4")}
          onClick={() => quickApprove(type, id, subType)}
        >
          <CheckCircle className={cn("mr-1.5", small ? "w-3.5 h-3.5" : "w-4 h-4")} />
          Approve
        </Button>
        <Button
          size={small ? "sm" : "default"}
          variant="outline"
          className={cn("border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 font-medium", small ? "h-8 text-xs px-3" : "h-9 text-sm px-4")}
          onClick={() => openReject(type, id, subType)}
        >
          <XCircle className={cn("mr-1.5", small ? "w-3.5 h-3.5" : "w-4 h-4")} />
          Reject
        </Button>
      </div>
    );
  }

  if (!canApprove) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <PageHeader title="Approvals Hub" description="Manage all pending approvals in one place" />
        <Card className="mt-6">
          <CardContent className="p-10 text-center">
            <ClipboardList className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">You do not have approval permissions.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Approvals Hub"
        description="Review and action all pending requests in one place"
      />

      {/* Summary banner */}
      {totalPending > 0 ? (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 px-5 py-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-200 flex items-center justify-center shrink-0">
            <Inbox className="w-5 h-5 text-amber-700" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800">
              {totalPending} request{totalPending !== 1 ? "s" : ""} awaiting your approval
            </p>
            <p className="text-xs text-amber-600 mt-0.5">
              Review and approve or reject below. Oldest requests are shown first.
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-amber-400 shrink-0" />
        </div>
      ) : (
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 px-5 py-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-200 flex items-center justify-center shrink-0">
            <CheckCircle className="w-5 h-5 text-emerald-700" />
          </div>
          <div>
            <p className="text-sm font-semibold text-emerald-800">All caught up!</p>
            <p className="text-xs text-emerald-600 mt-0.5">No pending approvals at this time.</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="leave">
        <TabsList className="flex flex-wrap h-auto gap-1 p-1 bg-gray-100 rounded-xl">
          <TabsTrigger value="leave" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm text-sm py-2 px-3">
            <CalendarDays className="w-4 h-4 mr-1.5" />
            Leave
            <PendingCount count={pendingLeave.length} />
          </TabsTrigger>
          <TabsTrigger value="wfh" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm text-sm py-2 px-3">
            <HomeIcon className="w-4 h-4 mr-1.5" />
            WFH
            <PendingCount count={pendingWfh.length} />
          </TabsTrigger>
          <TabsTrigger value="expense" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm text-sm py-2 px-3">
            <Receipt className="w-4 h-4 mr-1.5" />
            Expenses
            <PendingCount count={pendingExpense.length} />
          </TabsTrigger>
          <TabsTrigger value="regularization" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm text-sm py-2 px-3">
            <RefreshCcw className="w-4 h-4 mr-1.5" />
            Regularization
            <PendingCount count={pendingReg.length} />
          </TabsTrigger>
          <TabsTrigger value="shift-change" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm text-sm py-2 px-3">
            <ArrowLeftRight className="w-4 h-4 mr-1.5" />
            Shift Change
            <PendingCount count={pendingShiftChange.length} />
          </TabsTrigger>
        </TabsList>

        {/* ── Leave ── */}
        <TabsContent value="leave" className="mt-4 space-y-3">
          {leaveLoading
            ? [0,1,2].map((i) => <CardSkeleton key={i} />)
            : (leaveApplications as {
                id: number; employeeName?: string; leaveType?: string; fromDate?: string;
                toDate?: string; reason?: string; status: string; hodActionedById?: number | null;
                createdAt?: string;
              }[]).length === 0
              ? <EmptyState icon={<CalendarDays className="w-6 h-6" />} label="No leave applications" />
              : sortByOldest(leaveApplications as { id: number; employeeName?: string; leaveType?: string; fromDate?: string; toDate?: string; reason?: string; status: string; hodActionedById?: number | null; createdAt?: string }[]).map((a) => {
                  const isPending = ["Pending", "HOD Approved"].includes(a.status);
                  return (
                    <Card key={a.id} className={cn("transition-all", isPending && "border-amber-200 bg-amber-50/30")}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <EmployeeAvatar name={a.employeeName ?? "?"} />
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-sm text-gray-900">{a.employeeName ?? "—"}</p>
                              <Badge className={cn("text-[11px] border", STATUS_BADGE[a.status] ?? "")}>{a.status}</Badge>
                            </div>
                            <p className="text-xs text-gray-500">
                              <span className="font-medium text-gray-700">{a.leaveType}</span>
                              {" · "}
                              {fmtDate(a.fromDate)} – {fmtDate(a.toDate)}
                            </p>
                            {a.reason && <p className="text-xs text-gray-600 leading-relaxed">{a.reason}</p>}
                            {a.createdAt && (
                              <p className="text-[11px] text-gray-400 flex items-center gap-1">
                                <Clock className="w-3 h-3" /> Submitted {daysSince(a.createdAt)}
                              </p>
                            )}
                          </div>
                          {isPending && canApprove && (
                            <div className="shrink-0 flex flex-col items-end gap-2 ml-2">
                              <ApproveBtn
                                type="leave"
                                id={a.id}
                                status={a.status}
                                subType={isHod ? "hod" : "hr"}
                                small
                              />
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
          }
        </TabsContent>

        {/* ── WFH ── */}
        <TabsContent value="wfh" className="mt-4 space-y-3">
          {wfhLoading
            ? [0,1,2].map((i) => <CardSkeleton key={i} />)
            : wfhRequests.length === 0
              ? <EmptyState icon={<HomeIcon className="w-6 h-6" />} label="No WFH requests" />
              : sortByOldest(wfhRequests).map((r) => {
                  const name = `${r.firstName ?? ""} ${r.lastName ?? ""}`.trim() || "—";
                  const isPending = r.status === "Pending";
                  return (
                    <Card key={r.id} className={cn("transition-all", isPending && "border-amber-200 bg-amber-50/30")}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <EmployeeAvatar name={name} />
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-sm text-gray-900">{name}</p>
                              <Badge className={cn("text-[11px] border", STATUS_BADGE[r.status] ?? "")}>{r.status}</Badge>
                            </div>
                            <p className="text-xs text-gray-500">
                              {fmtDate(r.fromDate)} – {fmtDate(r.toDate)}
                            </p>
                            {r.reason && <p className="text-xs text-gray-600 leading-relaxed">{r.reason}</p>}
                            <p className="text-[11px] text-gray-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" /> Submitted {daysSince(r.createdAt)}
                            </p>
                          </div>
                          {isPending && canApprove && (
                            <div className="shrink-0 ml-2">
                              <ApproveBtn type="wfh" id={r.id} status={r.status} small />
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
          }
        </TabsContent>

        {/* ── Expenses ── */}
        <TabsContent value="expense" className="mt-4 space-y-3">
          {expenseLoading
            ? [0,1,2].map((i) => <CardSkeleton key={i} />)
            : expenseClaims.length === 0
              ? <EmptyState icon={<Receipt className="w-6 h-6" />} label="No expense claims" />
              : sortByOldest(expenseClaims as { id: number; firstName?: string; lastName?: string; title: string; claimDate: string; totalAmount: string; status: string; createdAt?: string }[]).map((c) => {
                  const name = `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() || "—";
                  const isPending = c.status === "Submitted";
                  return (
                    <Card key={c.id} className={cn("transition-all", isPending && "border-amber-200 bg-amber-50/30")}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <EmployeeAvatar name={name} />
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-sm text-gray-900">{name}</p>
                              <Badge className={cn("text-[11px] border", STATUS_BADGE[c.status] ?? "")}>{c.status}</Badge>
                              <span className="text-xs font-bold text-gray-700">₹{Number(c.totalAmount).toLocaleString("en-IN")}</span>
                            </div>
                            <p className="text-xs text-gray-500">
                              <span className="font-medium text-gray-700">{c.title}</span>
                              {" · "}
                              {fmtDate(c.claimDate)}
                            </p>
                            {c.createdAt && (
                              <p className="text-[11px] text-gray-400 flex items-center gap-1">
                                <Clock className="w-3 h-3" /> Submitted {daysSince(c.createdAt)}
                              </p>
                            )}
                          </div>
                          {isPending && canApprove && (
                            <div className="shrink-0 ml-2">
                              <ApproveBtn type="expense" id={c.id} status={c.status} small />
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
          }
        </TabsContent>

        {/* ── Regularization ── */}
        <TabsContent value="regularization" className="mt-4 space-y-3">
          {regLoading
            ? [0,1,2].map((i) => <CardSkeleton key={i} />)
            : regularizations.length === 0
              ? <EmptyState icon={<Timer className="w-6 h-6" />} label="No regularization requests" />
              : sortByOldest(regularizations).map((r) => {
                  const name = `${r.firstName ?? ""} ${r.lastName ?? ""}`.trim() || "—";
                  const isPending = r.status === "Pending";
                  return (
                    <Card key={r.id} className={cn("transition-all", isPending && "border-amber-200 bg-amber-50/30")}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <EmployeeAvatar name={name} />
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-sm text-gray-900">
                                {name}{r.empCode ? <span className="text-gray-400 font-normal"> · {r.empCode}</span> : ""}
                              </p>
                              <Badge className={cn("text-[11px] border", STATUS_BADGE[r.status] ?? "")}>{r.status}</Badge>
                            </div>
                            <p className="text-xs text-gray-500">
                              Attendance date: <span className="font-medium text-gray-700">{fmtDate(r.attendanceDate)}</span>
                            </p>
                            {r.requestedSignIn && (
                              <p className="text-xs text-gray-500">
                                Requested: {r.requestedSignIn} – {r.requestedSignOut ?? "—"}
                              </p>
                            )}
                            {r.reason && <p className="text-xs text-gray-600 leading-relaxed">{r.reason}</p>}
                            <p className="text-[11px] text-gray-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" /> Submitted {daysSince(r.createdAt)}
                            </p>
                          </div>
                          {isPending && canApprove && (
                            <div className="shrink-0 ml-2">
                              <ApproveBtn type="regularization" id={r.id} status={r.status} small />
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
          }
        </TabsContent>

        {/* ── Shift Change ── */}
        <TabsContent value="shift-change" className="mt-4 space-y-3">
          {shiftLoading
            ? [0,1,2].map((i) => <CardSkeleton key={i} />)
            : shiftChangeRequests.length === 0
              ? <EmptyState icon={<ArrowLeftRight className="w-6 h-6" />} label="No shift change requests" />
              : sortByOldest(shiftChangeRequests as { id: number; employeeName: string; currentShiftName: string; requestedShiftName: string; effectiveDate: string; reason: string; status: string; createdAt?: string }[]).map((r) => {
                  const isPending = r.status === "Pending";
                  return (
                    <Card key={r.id} className={cn("transition-all", isPending && "border-amber-200 bg-amber-50/30")}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <EmployeeAvatar name={r.employeeName} />
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-sm text-gray-900">{r.employeeName}</p>
                              <Badge className={cn("text-[11px] border", STATUS_BADGE[r.status] ?? "")}>{r.status}</Badge>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <span>{r.currentShiftName}</span>
                              <ArrowLeftRight className="w-3 h-3 shrink-0 text-gray-400" />
                              <span className="font-medium text-gray-700">{r.requestedShiftName}</span>
                            </div>
                            <p className="text-xs text-gray-500">Effective: {fmtDate(r.effectiveDate)}</p>
                            {r.reason && <p className="text-xs text-gray-600 leading-relaxed">{r.reason}</p>}
                            {r.createdAt && (
                              <p className="text-[11px] text-gray-400 flex items-center gap-1">
                                <Clock className="w-3 h-3" /> Submitted {daysSince(r.createdAt)}
                              </p>
                            )}
                          </div>
                          {isPending && canApprove && (
                            <div className="shrink-0 ml-2">
                              <ApproveBtn type="shift-change" id={r.id} status={r.status} small />
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
          }
        </TabsContent>
      </Tabs>

      {/* Reject Dialog (only for rejections — approval is instant) */}
      <Dialog open={!!rejectDialog} onOpenChange={() => setRejectDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="w-5 h-5" />
              Reject Request
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label>Reason for rejection <span className="text-gray-400">(optional)</span></Label>
              <Textarea
                rows={3}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Add a reason so the employee knows what to change…"
                autoFocus
              />
            </div>
            {actionError && <p className="text-sm text-destructive">{actionError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmReject}>
              <XCircle className="w-4 h-4 mr-1.5" />
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
