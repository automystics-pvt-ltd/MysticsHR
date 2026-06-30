import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCurrentHrmsUser } from "@/lib/useCurrentHrmsUser";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  Card, CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Plus, ArrowLeftRight, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}/api${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
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

const STATUS_COLORS: Record<string, string> = {
  Pending: "bg-yellow-100 text-yellow-700",
  Approved: "bg-green-100 text-green-700",
  Rejected: "bg-red-100 text-red-700",
  Cancelled: "bg-gray-100 text-gray-500",
};

interface ShiftTemplate { id: number; name: string; startTime: string; endTime: string; }
interface ShiftChangeRequest {
  id: number;
  employeeId: number;
  employeeName: string;
  currentShiftId: number | null;
  currentShiftName: string;
  requestedShiftId: number;
  requestedShiftName: string;
  effectiveDate: string;
  reason: string;
  status: string;
  managerRemarks: string | null;
  hrRemarks: string | null;
  createdAt: string;
}

const today = new Date().toISOString().slice(0, 10);

export default function ShiftChangePage() {
  const { role: hrmsRole } = useCurrentHrmsUser();
  const role = hrmsRole ?? "employee";
  const isHrOrManager = ["customer_admin", "hr_manager", "hr_executive", "hod"].includes(role);
  const qc = useQueryClient();
  const { toast } = useToast();

  const [showCreate, setShowCreate] = useState(false);
  const [requestedShiftId, setRequestedShiftId] = useState("");
  const [effectiveDate, setEffectiveDate] = useState(today);
  const [reason, setReason] = useState("");
  const [createError, setCreateError] = useState("");

  const [actionState, setActionState] = useState<{ id: number; action: "Approved" | "Rejected" } | null>(null);
  const [remarks, setRemarks] = useState("");
  const [actionError, setActionError] = useState("");

  const { data: requests = [], isLoading } = useQuery<ShiftChangeRequest[]>({
    queryKey: ["shift-change-requests"],
    queryFn: () => apiFetch("/shift-change-requests"),
  });

  const { data: shifts = [] } = useQuery<ShiftTemplate[]>({
    queryKey: ["shift-templates-list"],
    queryFn: () => apiFetch("/shifts/templates"),
  });

  const createMut = useMutation({
    mutationFn: (body: { requestedShiftId: number; effectiveDate: string; reason: string }) =>
      apiFetch("/shift-change-requests", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shift-change-requests"] });
      setShowCreate(false);
      setRequestedShiftId(""); setEffectiveDate(today); setReason(""); setCreateError("");
      toast({ title: "Shift change request submitted" });
    },
    onError: (e: Error) => setCreateError(e.message),
  });

  const cancelMut = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/shift-change-requests/${id}/cancel`, { method: "POST", body: JSON.stringify({}) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shift-change-requests"] });
      toast({ title: "Request cancelled" });
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const actionMut = useMutation({
    mutationFn: ({ id, action, remarks }: { id: number; action: string; remarks: string }) =>
      apiFetch(`/shift-change-requests/${id}/action`, { method: "POST", body: JSON.stringify({ action, remarks }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shift-change-requests"] });
      setActionState(null); setRemarks(""); setActionError("");
      toast({ title: "Action recorded" });
    },
    onError: (e: Error) => setActionError(e.message),
  });

  const pending = requests.filter((r) => r.status === "Pending");

  function handleSubmit() {
    setCreateError("");
    if (!requestedShiftId) { setCreateError("Please select a shift"); return; }
    if (!effectiveDate) { setCreateError("Please select an effective date"); return; }
    if (!reason.trim()) { setCreateError("Please provide a reason"); return; }
    createMut.mutate({ requestedShiftId: Number(requestedShiftId), effectiveDate, reason: reason.trim() });
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <PageHeader
        title="Shift Change Requests"
        description="Request a change to your assigned shift"
        actions={
          !isHrOrManager && (
            <Button size="sm" onClick={() => setShowCreate(true)}>
              <Plus className="w-4 h-4 mr-1.5" />
              New Request
            </Button>
          )
        }
      />

      {isHrOrManager && pending.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-amber-800 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              {pending.length} shift change request{pending.length !== 1 ? "s" : ""} pending your action
            </p>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-3 w-3" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-3 w-1/3" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : requests.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center">
            <ArrowLeftRight className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No shift change requests found.</p>
            {!isHrOrManager && (
              <Button size="sm" className="mt-3" onClick={() => setShowCreate(true)}>
                <Plus className="w-4 h-4 mr-1.5" /> Submit Request
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <Card key={r.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 flex-1">
                    {isHrOrManager && (
                      <p className="font-medium text-sm">{r.employeeName}</p>
                    )}
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">{r.currentShiftName}</span>
                      <ArrowLeftRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="font-medium">{r.requestedShiftName}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Effective: {fmtDate(r.effectiveDate)}</p>
                    <p className="text-xs text-foreground">{r.reason}</p>
                    {(r.managerRemarks || r.hrRemarks) && (
                      <div className="rounded bg-muted/50 p-2 text-xs space-y-0.5 mt-1">
                        {r.managerRemarks && <p><strong>Manager:</strong> {r.managerRemarks}</p>}
                        {r.hrRemarks && <p><strong>HR:</strong> {r.hrRemarks}</p>}
                      </div>
                    )}
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-2">
                    <Badge className={STATUS_COLORS[r.status] ?? ""}>{r.status}</Badge>
                    {r.status === "Pending" && isHrOrManager && (
                      <div className="flex gap-1.5">
                        <Button
                          size="sm"
                          className="h-7 text-xs bg-green-600 hover:bg-green-700"
                          onClick={() => { setActionState({ id: r.id, action: "Approved" }); setRemarks(""); setActionError(""); }}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-7 text-xs"
                          onClick={() => { setActionState({ id: r.id, action: "Rejected" }); setRemarks(""); setActionError(""); }}
                        >
                          Reject
                        </Button>
                      </div>
                    )}
                    {r.status === "Pending" && !isHrOrManager && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => cancelMut.mutate(r.id)}
                        disabled={cancelMut.isPending}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Request Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Shift Change Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Requested Shift</Label>
              <Select value={requestedShiftId} onValueChange={setRequestedShiftId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select shift…" />
                </SelectTrigger>
                <SelectContent>
                  {shifts.length === 0 ? (
                    <SelectItem value="__none" disabled>No shifts available</SelectItem>
                  ) : (
                    shifts.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.name} ({s.startTime} – {s.endTime})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Effective Date</Label>
              <Input
                type="date"
                value={effectiveDate}
                min={today}
                onChange={(e) => setEffectiveDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Reason</Label>
              <Textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain why you need the shift change…"
              />
            </div>
            {createError && <p className="text-sm text-destructive">{createError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createMut.isPending}>
              {createMut.isPending ? "Submitting…" : "Submit Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Action Dialog */}
      <Dialog open={!!actionState} onOpenChange={() => setActionState(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {actionState?.action === "Approved" ? "Approve" : "Reject"} Shift Change Request
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Remarks (optional)</Label>
              <Textarea
                rows={3}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Add remarks…"
              />
            </div>
            {actionError && <p className="text-sm text-destructive">{actionError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionState(null)}>Cancel</Button>
            <Button
              variant={actionState?.action === "Rejected" ? "destructive" : "default"}
              disabled={actionMut.isPending}
              onClick={() =>
                actionState &&
                actionMut.mutate({ id: actionState.id, action: actionState.action, remarks })
              }
            >
              {actionMut.isPending ? "Saving…" : `Confirm ${actionState?.action}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
