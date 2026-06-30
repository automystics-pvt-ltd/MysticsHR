import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCurrentHrmsUser } from "@/lib/useCurrentHrmsUser";
import { useToast } from "@/hooks/use-toast";
import { Plus, Receipt, IndianRupee, CheckCircle, XCircle, Trash2, FileText, Send } from "lucide-react";

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

interface ExpenseClaim {
  id: number;
  employeeId: number;
  firstName?: string;
  lastName?: string;
  empCode?: string;
  title: string;
  claimDate: string;
  totalAmount: string;
  status: "Draft" | "Submitted" | "Approved" | "Rejected" | "Paid";
  notes?: string | null;
  managerRemarks?: string | null;
  hrRemarks?: string | null;
  financeRemarks?: string | null;
  paidDate?: string | null;
  createdAt: string;
  itemCount?: number;
  items?: ExpenseItem[];
}

interface ExpenseItem {
  id: number;
  category: string;
  description: string;
  amount: string;
  expenseDate: string;
  receiptUrl?: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  Draft: "bg-gray-100 text-gray-600",
  Submitted: "bg-yellow-100 text-yellow-700",
  Approved: "bg-green-100 text-green-700",
  Rejected: "bg-red-100 text-red-700",
  Paid: "bg-blue-100 text-blue-700",
};

const CATEGORIES = ["Meals", "Travel", "Accommodation", "Communications", "Office Supplies", "Training", "Client Entertainment", "Other"];

function fmtAmt(amt: string | number) {
  return Number(amt).toLocaleString("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 });
}

function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

const today = new Date().toISOString().slice(0, 10);

export default function ExpensePage() {
  const { role: hrmsRole } = useCurrentHrmsUser();
  const role = hrmsRole ?? "employee";
  const isHr = ["customer_admin", "hr_manager", "hr_executive"].includes(role);
  const isManager = role === "hod" || isHr;
  const qc = useQueryClient();
  const { toast } = useToast();

  const [showCreate, setShowCreate] = useState(false);
  const [claimTitle, setClaimTitle] = useState("");
  const [claimDate, setClaimDate] = useState(today);
  const [claimNotes, setClaimNotes] = useState("");
  const [items, setItems] = useState<{ category: string; description: string; amount: string; expenseDate: string }[]>([]);
  const [createError, setCreateError] = useState("");

  const [detailId, setDetailId] = useState<number | null>(null);
  const [actionState, setActionState] = useState<{ id: number; action: "Approved" | "Rejected" | "Paid" } | null>(null);
  const [actionRemarks, setActionRemarks] = useState("");
  const [paidDate, setPaidDate] = useState(today);
  const [actionError, setActionError] = useState("");

  const { data: claims = [], isLoading } = useQuery<ExpenseClaim[]>({
    queryKey: ["expense-claims"],
    queryFn: () => apiFetch("/expense-claims"),
  });

  const { data: detail } = useQuery<ExpenseClaim>({
    queryKey: ["expense-claim", detailId],
    queryFn: () => apiFetch(`/expense-claims/${detailId}`),
    enabled: !!detailId,
  });

  const createMut = useMutation({
    mutationFn: (body: object) => apiFetch("/expense-claims", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expense-claims"] });
      setShowCreate(false);
      setClaimTitle(""); setClaimDate(today); setClaimNotes(""); setItems([]); setCreateError("");
      toast({ title: "Expense claim created as Draft" });
    },
    onError: (e: Error) => setCreateError(e.message),
  });

  const submitMut = useMutation({
    mutationFn: (id: number) => apiFetch(`/expense-claims/${id}/submit`, { method: "POST", body: JSON.stringify({}) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["expense-claims"] }); toast({ title: "Claim submitted for approval" }); },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const actionMut = useMutation({
    mutationFn: (body: { id: number; action: string; remarks?: string; paidDate?: string }) =>
      apiFetch(`/expense-claims/${body.id}/action`, { method: "POST", body: JSON.stringify({ action: body.action, remarks: body.remarks, paidDate: body.paidDate }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expense-claims"] });
      setActionState(null); setActionRemarks(""); setActionError("");
      toast({ title: "Action recorded" });
    },
    onError: (e: Error) => setActionError(e.message),
  });

  function addItem() {
    setItems((prev) => [...prev, { category: "Meals", description: "", amount: "", expenseDate: today }]);
  }

  function removeItem(i: number) {
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateItem(i: number, field: string, val: string) {
    setItems((prev) => prev.map((item, idx) => idx === i ? { ...item, [field]: val } : item));
  }

  const pending = claims.filter((c) => c.status === "Submitted");

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <PageHeader
        title="Expense Claims"
        description="Submit and manage expense reimbursements"
        actions={
          !isManager && (
            <Button size="sm" onClick={() => setShowCreate(true)}>
              <Plus className="w-4 h-4 mr-1.5" /> New Claim
            </Button>
          )
        }
      />

      {isManager && pending.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-amber-800">
              {pending.length} expense claim{pending.length !== 1 ? "s" : ""} pending approval
            </p>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : claims.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center">
            <Receipt className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No expense claims found.</p>
            {!isManager && (
              <Button size="sm" className="mt-3" onClick={() => setShowCreate(true)}>
                <Plus className="w-4 h-4 mr-1.5" /> New Claim
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {claims.map((c) => (
            <Card key={c.id} className="hover:shadow-sm transition-shadow cursor-pointer" onClick={() => setDetailId(c.id)}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 flex-1 min-w-0">
                    {isManager && (
                      <p className="text-xs text-muted-foreground">
                        {c.firstName} {c.lastName} {c.empCode && `(${c.empCode})`}
                      </p>
                    )}
                    <p className="font-medium text-sm">{c.title}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{fmtDate(c.claimDate)}</span>
                      <span className="font-semibold text-foreground flex items-center gap-0.5">
                        <IndianRupee className="w-3 h-3" />{Number(c.totalAmount).toLocaleString("en-IN")}
                      </span>
                    </div>
                    {c.hrRemarks && <p className="text-xs text-muted-foreground italic">Remarks: {c.hrRemarks}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <Badge className={STATUS_COLORS[c.status] ?? ""}>{c.status}</Badge>
                    {!isManager && c.status === "Draft" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={(e) => { e.stopPropagation(); submitMut.mutate(c.id); }}
                        disabled={submitMut.isPending || (c.itemCount ?? 0) === 0}
                        title={(c.itemCount ?? 0) === 0 ? "Add at least one item before submitting" : undefined}
                      >
                        <Send className="w-3 h-3 mr-1" /> Submit
                      </Button>
                    )}
                    {isManager && c.status === "Submitted" && (
                      <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700"
                          onClick={() => { setActionState({ id: c.id, action: "Approved" }); setActionRemarks(""); setActionError(""); }}>
                          <CheckCircle className="w-3.5 h-3.5 mr-1" /> Approve
                        </Button>
                        <Button size="sm" variant="destructive" className="h-7 text-xs"
                          onClick={() => { setActionState({ id: c.id, action: "Rejected" }); setActionRemarks(""); setActionError(""); }}>
                          <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                        </Button>
                      </div>
                    )}
                    {isHr && c.status === "Approved" && (
                      <Button size="sm" className="h-7 text-xs bg-blue-600 hover:bg-blue-700"
                        onClick={(e) => { e.stopPropagation(); setActionState({ id: c.id, action: "Paid" }); setActionRemarks(""); setActionError(""); setPaidDate(today); }}>
                        Mark Paid
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Expense Claim</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label>Claim Title</Label>
                <Input placeholder="e.g. Client visit to Mumbai" value={claimTitle} onChange={(e) => setClaimTitle(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Claim Date</Label>
                <Input type="date" value={claimDate} onChange={(e) => setClaimDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Input placeholder="Optional notes" value={claimNotes} onChange={(e) => setClaimNotes(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Expense Items</Label>
                <Button size="sm" variant="outline" type="button" onClick={addItem}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Item
                </Button>
              </div>
              {items.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">No items yet. Click "Add Item" to start.</p>
              )}
              {items.map((item, i) => (
                <div key={i} className="border rounded-md p-3 space-y-2 relative">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="absolute top-2 right-2 h-6 w-6 text-muted-foreground hover:text-destructive"
                    onClick={() => removeItem(i)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Category</Label>
                      <Select value={item.category} onValueChange={(v) => updateItem(i, "category", v)}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Date</Label>
                      <Input className="h-8 text-xs" type="date" value={item.expenseDate} onChange={(e) => updateItem(i, "expenseDate", e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">Description</Label>
                      <Input className="h-8 text-xs" placeholder="e.g. Lunch with client" value={item.description} onChange={(e) => updateItem(i, "description", e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Amount (₹)</Label>
                      <Input className="h-8 text-xs" type="number" min="0" step="0.01" placeholder="0.00" value={item.amount} onChange={(e) => updateItem(i, "amount", e.target.value)} />
                    </div>
                  </div>
                </div>
              ))}

              {items.length > 0 && (
                <div className="flex justify-end">
                  <p className="text-sm font-semibold">
                    Total: ₹{items.reduce((s, i) => s + (Number(i.amount) || 0), 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </p>
                </div>
              )}
            </div>
            {createError && <p className="text-sm text-destructive">{createError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button
              disabled={!claimTitle.trim() || !claimDate || createMut.isPending}
              onClick={() => createMut.mutate({ title: claimTitle, claimDate, notes: claimNotes, items })}
            >
              {createMut.isPending ? "Creating…" : "Save as Draft"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!detailId} onOpenChange={() => setDetailId(null)}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              {detail?.title ?? "Claim Details"}
            </DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-4 py-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{fmtDate(detail.claimDate)}</span>
                <Badge className={STATUS_COLORS[detail.status] ?? ""}>{detail.status}</Badge>
              </div>
              {detail.notes && <p className="text-sm text-muted-foreground">{detail.notes}</p>}
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Line Items</p>
                {(detail.items ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No items</p>
                ) : (
                  <div className="border rounded-md divide-y">
                    {(detail.items ?? []).map((item) => (
                      <div key={item.id} className="flex items-center justify-between px-3 py-2 text-sm">
                        <div>
                          <span className="font-medium">{item.description}</span>
                          <span className="ml-2 text-xs text-muted-foreground">{item.category}</span>
                          <span className="ml-2 text-xs text-muted-foreground">{fmtDate(item.expenseDate)}</span>
                        </div>
                        <span className="font-semibold">₹{Number(item.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                      </div>
                    ))}
                    <div className="flex justify-between px-3 py-2 text-sm font-bold bg-muted/30">
                      <span>Total</span>
                      <span>{fmtAmt(detail.totalAmount)}</span>
                    </div>
                  </div>
                )}
              </div>
              {(detail.hrRemarks || detail.managerRemarks || detail.financeRemarks) && (
                <div className="rounded-md bg-muted/50 p-3 text-xs space-y-1">
                  {detail.managerRemarks && <p><strong>Manager:</strong> {detail.managerRemarks}</p>}
                  {detail.hrRemarks && <p><strong>HR:</strong> {detail.hrRemarks}</p>}
                  {detail.financeRemarks && <p><strong>Finance:</strong> {detail.financeRemarks}</p>}
                  {detail.paidDate && <p><strong>Paid on:</strong> {fmtDate(detail.paidDate)}</p>}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Action Dialog */}
      <Dialog open={!!actionState} onOpenChange={() => setActionState(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {actionState?.action === "Approved" ? "Approve" : actionState?.action === "Paid" ? "Mark as Paid" : "Reject"} Expense Claim
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {actionState?.action === "Paid" && (
              <div className="space-y-1.5">
                <Label>Payment Date</Label>
                <Input type="date" value={paidDate} onChange={(e) => setPaidDate(e.target.value)} />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Remarks {actionState?.action !== "Paid" ? "(optional)" : ""}</Label>
              <Textarea rows={3} value={actionRemarks} onChange={(e) => setActionRemarks(e.target.value)} placeholder="Add remarks…" />
            </div>
            {actionError && <p className="text-sm text-destructive">{actionError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionState(null)}>Cancel</Button>
            <Button
              variant={actionState?.action === "Rejected" ? "destructive" : "default"}
              disabled={actionMut.isPending}
              onClick={() => actionState && actionMut.mutate({ id: actionState.id, action: actionState.action, remarks: actionRemarks, paidDate: actionState.action === "Paid" ? paidDate : undefined })}
            >
              {actionMut.isPending ? "Saving…" : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
