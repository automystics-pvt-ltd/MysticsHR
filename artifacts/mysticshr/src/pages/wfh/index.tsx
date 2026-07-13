import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useCurrentHrmsUser } from "@/lib/useCurrentHrmsUser";
import { useToast } from "@/hooks/use-toast";
import { Plus, CheckCircle, XCircle, Home, Clock, CalendarDays } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

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

interface WfhRequest {
  id: number;
  employeeId: number;
  firstName?: string;
  lastName?: string;
  empCode?: string;
  fromDate: string;
  toDate: string;
  reason: string;
  status: "Pending" | "Approved" | "Rejected" | "Cancelled";
  managerRemarks?: string | null;
  hrRemarks?: string | null;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  Pending: "bg-yellow-100 text-yellow-700",
  Approved: "bg-green-100 text-green-700",
  Rejected: "bg-red-100 text-red-700",
  Cancelled: "bg-gray-100 text-gray-500",
};

function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function daysDiff(from: string, to: string) {
  const d1 = new Date(from + "T00:00:00");
  const d2 = new Date(to + "T00:00:00");
  return Math.round((d2.getTime() - d1.getTime()) / 86400000) + 1;
}

const today = new Date().toISOString().slice(0, 10);

export default function WfhPage() {
  const { role: hrmsRole } = useCurrentHrmsUser();
  const role = hrmsRole ?? "employee";
  const isHrOrManager = ["customer_admin", "hr_manager", "hr_executive", "hod"].includes(role);
  const qc = useQueryClient();
  const { toast } = useToast();

  const [showCreate, setShowCreate] = useState(false);
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [reason, setReason] = useState("");
  const [createError, setCreateError] = useState("");

  const [actionState, setActionState] = useState<{ id: number; action: "Approved" | "Rejected" } | null>(null);
  const [remarks, setRemarks] = useState("");
  const [actionError, setActionError] = useState("");

  const { data: requests = [], isLoading } = useQuery<WfhRequest[]>({
    queryKey: ["wfh-requests"],
    queryFn: () => apiFetch("/wfh"),
  });

  const createMut = useMutation({
    mutationFn: (body: object) => apiFetch("/wfh", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wfh-requests"] });
      setShowCreate(false);
      setFromDate(today); setToDate(today); setReason(""); setCreateError("");
      toast({ title: "WFH request submitted successfully" });
    },
    onError: (e: Error) => setCreateError(e.message),
  });

  const cancelMut = useMutation({
    mutationFn: (id: number) => apiFetch(`/wfh/${id}/cancel`, { method: "POST", body: JSON.stringify({}) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["wfh-requests"] }); toast({ title: "Request cancelled" }); },
  });

  const actionMut = useMutation({
    mutationFn: ({ id, action, remarks }: { id: number; action: string; remarks: string }) =>
      apiFetch(`/wfh/${id}/action`, { method: "POST", body: JSON.stringify({ action, remarks }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wfh-requests"] });
      setActionState(null); setRemarks(""); setActionError("");
      toast({ title: "Action recorded" });
    },
    onError: (e: Error) => setActionError(e.message),
  });

  const pending = requests.filter((r) => r.status === "Pending");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Work From Home"
        description="Submit and manage WFH requests"
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
              {pending.length} WFH request{pending.length !== 1 ? "s" : ""} pending your action
            </p>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : requests.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center">
            <Home className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No WFH requests found.</p>
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
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 flex-1 min-w-0">
                    {isHrOrManager && (
                      <p className="font-medium text-sm">
                        {r.firstName} {r.lastName}
                        {r.empCode && <span className="text-muted-foreground text-xs ml-1">({r.empCode})</span>}
                      </p>
                    )}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CalendarDays className="w-3.5 h-3.5" />
                      <span>{fmtDate(r.fromDate)} – {fmtDate(r.toDate)}</span>
                      <span className="text-xs bg-muted px-1.5 py-0.5 rounded">{daysDiff(r.fromDate, r.toDate)}d</span>
                    </div>
                    <p className="text-sm text-foreground mt-1">{r.reason}</p>
                    {(r.managerRemarks || r.hrRemarks) && (
                      <p className="text-xs text-muted-foreground mt-1 italic">
                        Remarks: {r.hrRemarks ?? r.managerRemarks}
                      </p>
                    )}
                    <p className="text-[11px] text-muted-foreground">
                      Submitted {new Date(r.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <Badge className={STATUS_COLORS[r.status] ?? ""}>{r.status}</Badge>
                    {!isHrOrManager && r.status === "Pending" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-7"
                        onClick={() => cancelMut.mutate(r.id)}
                        disabled={cancelMut.isPending}
                      >
                        Cancel
                      </Button>
                    )}
                    {isHrOrManager && r.status === "Pending" && (
                      <div className="flex gap-1.5">
                        <Button
                          size="sm"
                          className="h-7 text-xs bg-green-600 hover:bg-green-700"
                          onClick={() => { setActionState({ id: r.id, action: "Approved" }); setRemarks(""); setActionError(""); }}
                        >
                          <CheckCircle className="w-3.5 h-3.5 mr-1" /> Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-7 text-xs"
                          onClick={() => { setActionState({ id: r.id, action: "Rejected" }); setRemarks(""); setActionError(""); }}
                        >
                          <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                        </Button>
                      </div>
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
            <DialogTitle>New WFH Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>From Date</Label>
                <Input type="date" value={fromDate} min={today} onChange={(e) => setFromDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>To Date</Label>
                <Input type="date" value={toDate} min={fromDate} onChange={(e) => setToDate(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Reason</Label>
              <Textarea
                rows={3}
                placeholder="Describe the reason for working from home…"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
            {createError && <p className="text-sm text-destructive">{createError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button
              disabled={!fromDate || !toDate || !reason.trim() || createMut.isPending}
              onClick={() => createMut.mutate({ fromDate, toDate, reason })}
            >
              {createMut.isPending ? "Submitting…" : "Submit Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Action Dialog */}
      <Dialog open={!!actionState} onOpenChange={() => setActionState(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{actionState?.action === "Approved" ? "Approve" : "Reject"} WFH Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Remarks (optional)</Label>
              <Textarea rows={3} value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Add remarks…" />
            </div>
            {actionError && <p className="text-sm text-destructive">{actionError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionState(null)}>Cancel</Button>
            <Button
              variant={actionState?.action === "Rejected" ? "destructive" : "default"}
              disabled={actionMut.isPending}
              onClick={() => actionState && actionMut.mutate({ id: actionState.id, action: actionState.action, remarks })}
            >
              {actionMut.isPending ? "Saving…" : `Confirm ${actionState?.action}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
