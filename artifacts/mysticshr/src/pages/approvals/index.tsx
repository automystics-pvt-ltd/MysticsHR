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
  Home as HomeIcon, Receipt, CalendarDays, Timer, RefreshCcw, ArrowLeftRight,
} from "lucide-react";

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

type ActionDialog = {
  type: "leave" | "wfh" | "expense" | "regularization" | "shift-change";
  id: number;
  action: "Approved" | "Rejected";
  subType?: "hod" | "hr";
};

const STATUS_COLORS: Record<string, string> = {
  Pending: "bg-yellow-100 text-yellow-700",
  "HOD Approved": "bg-blue-100 text-blue-700",
  Approved: "bg-green-100 text-green-700",
  Rejected: "bg-red-100 text-red-700",
  Submitted: "bg-yellow-100 text-yellow-700",
};

function PendingCount({ count }: { count: number }) {
  if (!count) return null;
  return (
    <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold w-4 h-4">
      {count > 9 ? "9+" : count}
    </span>
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
  const [actionDialog, setActionDialog] = useState<ActionDialog | null>(null);
  const [remarks, setRemarks] = useState("");
  const [actionError, setActionError] = useState("");

  const { data: leaveApplications = [] } = useListLeaveApplications({});

  const { data: wfhRequests = [] } = useQuery({
    queryKey: ["wfh-requests-hub"],
    queryFn: () => apiFetch<{ id: number; firstName?: string; lastName?: string; fromDate: string; toDate: string; reason: string; status: string; createdAt: string }[]>("/wfh"),
  });

  const { data: expenseClaims = [] } = useQuery({
    queryKey: ["expense-claims-hub"],
    queryFn: () => apiFetch<{ id: number; firstName?: string; lastName?: string; title: string; claimDate: string; totalAmount: string; status: string }[]>("/expense-claims"),
  });

  const { data: regularizations = [] } = useQuery({
    queryKey: ["regularizations-hub"],
    queryFn: () => apiFetch<{ id: number; firstName?: string; lastName?: string; empCode?: string; attendanceDate: string; requestedSignIn?: string; requestedSignOut?: string; reason: string; status: string; createdAt: string }[]>("/attendance/regularizations"),
  });

  const { data: shiftChangeRequests = [] } = useQuery({
    queryKey: ["shift-change-requests-hub"],
    queryFn: () => apiFetch<{ id: number; employeeName: string; currentShiftName: string; requestedShiftName: string; effectiveDate: string; reason: string; status: string }[]>("/shift-change-requests"),
  });

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

  const pendingLeave = (leaveApplications as { status: string }[]).filter((a) => ["Pending", "HOD Approved"].includes(a.status));
  const pendingWfh = wfhRequests.filter((r) => r.status === "Pending");
  const pendingExpense = expenseClaims.filter((c) => c.status === "Submitted");
  const pendingReg = regularizations.filter((r) => r.status === "Pending");
  const pendingShiftChange = shiftChangeRequests.filter((r) => r.status === "Pending");

  const totalPending = pendingLeave.length + pendingWfh.length + pendingExpense.length + pendingReg.length + pendingShiftChange.length;

  async function handleConfirmAction() {
    if (!actionDialog) return;
    setActionError("");
    try {
      if (actionDialog.type === "leave") {
        if (actionDialog.subType === "hod") {
          await hodLeaveMut.mutateAsync({ id: actionDialog.id, data: { action: actionDialog.action, remarks } });
        } else {
          await hrLeaveMut.mutateAsync({ id: actionDialog.id, data: { action: actionDialog.action, remarks } });
        }
        qc.invalidateQueries({ queryKey: getListLeaveApplicationsQueryKey({}) });
      } else if (actionDialog.type === "wfh") {
        await wfhActionMut.mutateAsync({ id: actionDialog.id, action: actionDialog.action, remarks });
      } else if (actionDialog.type === "expense") {
        await expenseActionMut.mutateAsync({ id: actionDialog.id, action: actionDialog.action, remarks });
      } else if (actionDialog.type === "regularization") {
        await regularizationActionMut.mutateAsync({ id: actionDialog.id, action: actionDialog.action, remarks });
      } else if (actionDialog.type === "shift-change") {
        await shiftChangeActionMut.mutateAsync({ id: actionDialog.id, action: actionDialog.action, remarks });
      }
      toast({ title: `Request ${actionDialog.action.toLowerCase()} successfully` });
      setActionDialog(null); setRemarks(""); setActionError("");
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : "Failed");
    }
  }

  function openAction(type: ActionDialog["type"], id: number, action: "Approved" | "Rejected", subType?: "hod" | "hr") {
    setActionDialog({ type, id, action, subType });
    setRemarks(""); setActionError("");
  }

  function ActionButtons({ type, id, status, subType }: { type: ActionDialog["type"]; id: number; status: string; subType?: "hod" | "hr" }) {
    const isPending = status === "Pending" || status === "HOD Approved" || status === "Submitted";
    if (!isPending || !canApprove) return null;
    return (
      <div className="flex gap-1.5 mt-1.5">
        <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700"
          onClick={() => openAction(type, id, "Approved", subType)}>
          <CheckCircle className="w-3.5 h-3.5 mr-1" /> Approve
        </Button>
        <Button size="sm" variant="destructive" className="h-7 text-xs"
          onClick={() => openAction(type, id, "Rejected", subType)}>
          <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
        </Button>
      </div>
    );
  }

  if (!canApprove) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
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
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <PageHeader
        title="Approvals Hub"
        description="All pending approvals in one place"
      />

      {totalPending > 0 ? (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-amber-800 flex items-center gap-2">
              <Inbox className="w-4 h-4" />
              {totalPending} item{totalPending !== 1 ? "s" : ""} awaiting your approval
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-green-800 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" /> All caught up! No pending approvals.
            </p>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="leave">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="leave">
            <CalendarDays className="w-3.5 h-3.5 mr-1.5" />
            Leave
            <PendingCount count={pendingLeave.length} />
          </TabsTrigger>
          <TabsTrigger value="wfh">
            <HomeIcon className="w-3.5 h-3.5 mr-1.5" />
            WFH
            <PendingCount count={pendingWfh.length} />
          </TabsTrigger>
          <TabsTrigger value="expense">
            <Receipt className="w-3.5 h-3.5 mr-1.5" />
            Expenses
            <PendingCount count={pendingExpense.length} />
          </TabsTrigger>
          <TabsTrigger value="regularization">
            <RefreshCcw className="w-3.5 h-3.5 mr-1.5" />
            Regularization
            <PendingCount count={pendingReg.length} />
          </TabsTrigger>
          <TabsTrigger value="shift-change">
            <ArrowLeftRight className="w-3.5 h-3.5 mr-1.5" />
            Shift Change
            <PendingCount count={pendingShiftChange.length} />
          </TabsTrigger>
        </TabsList>

        {/* Leave Tab */}
        <TabsContent value="leave" className="mt-4 space-y-3">
          {(leaveApplications as { id: number; employeeName?: string; leaveType?: string; fromDate?: string; toDate?: string; reason?: string; status: string; hodActionedById?: number | null }[]).length === 0 ? (
            <EmptyState icon={<CalendarDays />} label="No leave applications" />
          ) : (
            (leaveApplications as { id: number; employeeName?: string; leaveType?: string; fromDate?: string; toDate?: string; reason?: string; status: string; hodActionedById?: number | null }[]).map((a) => (
              <Card key={a.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-0.5 flex-1">
                      <p className="font-medium text-sm">{a.employeeName ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">{a.leaveType} · {fmtDate(a.fromDate)} – {fmtDate(a.toDate)}</p>
                      {a.reason && <p className="text-xs text-foreground">{a.reason}</p>}
                    </div>
                    <div className="shrink-0">
                      <Badge className={STATUS_COLORS[a.status] ?? ""}>{a.status}</Badge>
                      <ActionButtons
                        type="leave"
                        id={a.id}
                        status={a.status}
                        subType={isHod ? "hod" : "hr"}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* WFH Tab */}
        <TabsContent value="wfh" className="mt-4 space-y-3">
          {wfhRequests.length === 0 ? (
            <EmptyState icon={<HomeIcon />} label="No WFH requests" />
          ) : (
            wfhRequests.map((r) => (
              <Card key={r.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-0.5 flex-1">
                      <p className="font-medium text-sm">{r.firstName} {r.lastName}</p>
                      <p className="text-xs text-muted-foreground">{fmtDate(r.fromDate)} – {fmtDate(r.toDate)}</p>
                      <p className="text-xs text-foreground">{r.reason}</p>
                    </div>
                    <div className="shrink-0">
                      <Badge className={STATUS_COLORS[r.status] ?? ""}>{r.status}</Badge>
                      <ActionButtons type="wfh" id={r.id} status={r.status} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Expense Tab */}
        <TabsContent value="expense" className="mt-4 space-y-3">
          {expenseClaims.length === 0 ? (
            <EmptyState icon={<Receipt />} label="No expense claims" />
          ) : (
            expenseClaims.map((c) => (
              <Card key={c.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-0.5 flex-1">
                      <p className="font-medium text-sm">{c.firstName} {c.lastName}</p>
                      <p className="text-xs text-muted-foreground">{c.title} · {fmtDate(c.claimDate)}</p>
                      <p className="text-xs font-semibold">₹{Number(c.totalAmount).toLocaleString("en-IN")}</p>
                    </div>
                    <div className="shrink-0">
                      <Badge className={STATUS_COLORS[c.status] ?? ""}>{c.status}</Badge>
                      <ActionButtons type="expense" id={c.id} status={c.status} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Regularization Tab */}
        <TabsContent value="regularization" className="mt-4 space-y-3">
          {regularizations.length === 0 ? (
            <EmptyState icon={<Timer />} label="No regularization requests" />
          ) : (
            regularizations.map((r) => (
              <Card key={r.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-0.5 flex-1">
                      <p className="font-medium text-sm">{r.firstName} {r.lastName} {r.empCode && `(${r.empCode})`}</p>
                      <p className="text-xs text-muted-foreground">{fmtDate(r.attendanceDate)}</p>
                      <p className="text-xs text-foreground">{r.reason}</p>
                    </div>
                    <div className="shrink-0">
                      <Badge className={STATUS_COLORS[r.status] ?? ""}>{r.status}</Badge>
                      <ActionButtons type="regularization" id={r.id} status={r.status} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Shift Change Tab */}
        <TabsContent value="shift-change" className="mt-4 space-y-3">
          {shiftChangeRequests.length === 0 ? (
            <EmptyState icon={<ArrowLeftRight />} label="No shift change requests" />
          ) : (
            shiftChangeRequests.map((r) => (
              <Card key={r.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-0.5 flex-1">
                      <p className="font-medium text-sm">{r.employeeName}</p>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span>{r.currentShiftName}</span>
                        <ArrowLeftRight className="w-3 h-3 shrink-0" />
                        <span className="font-medium text-foreground">{r.requestedShiftName}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Effective: {fmtDate(r.effectiveDate)}</p>
                      <p className="text-xs text-foreground">{r.reason}</p>
                    </div>
                    <div className="shrink-0">
                      <Badge className={STATUS_COLORS[r.status] ?? ""}>{r.status}</Badge>
                      <ActionButtons type="shift-change" id={r.id} status={r.status} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Confirm Action Dialog */}
      <Dialog open={!!actionDialog} onOpenChange={() => setActionDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {actionDialog?.action === "Approved" ? "Approve" : "Reject"} Request
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Remarks (optional)</Label>
              <Textarea rows={3} value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Add remarks…" />
            </div>
            {actionError && <p className="text-sm text-destructive">{actionError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>Cancel</Button>
            <Button
              variant={actionDialog?.action === "Rejected" ? "destructive" : "default"}
              onClick={handleConfirmAction}
            >
              Confirm {actionDialog?.action}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EmptyState({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <Card>
      <CardContent className="p-8 text-center">
        <div className="w-8 h-8 text-muted-foreground mx-auto mb-2">{icon}</div>
        <p className="text-sm text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}
