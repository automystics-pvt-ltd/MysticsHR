import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, Invoice, fmtMoney, fmtDate } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Receipt, Search, RefreshCw, AlertTriangle, CheckCircle2,
  Clock, XCircle, IndianRupee, TrendingUp, Ban,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  paid: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  overdue: "bg-red-500/15 text-red-400 border-red-500/20",
  void: "bg-muted text-muted-foreground border-border",
  cancelled: "bg-muted text-muted-foreground border-border",
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  pending: <Clock className="w-3 h-3" />,
  paid: <CheckCircle2 className="w-3 h-3" />,
  overdue: <AlertTriangle className="w-3 h-3" />,
  void: <Ban className="w-3 h-3" />,
};

const PAYMENT_METHODS = ["Bank Transfer", "NEFT", "RTGS", "UPI", "Credit Card", "Cheque", "Cash", "Other"];
const STATUS_TABS = ["all", "pending", "paid", "overdue", "void"];

interface PayDialogState { open: boolean; invoice: Invoice | null }

export function InvoicesPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [payDialog, setPayDialog] = useState<PayDialogState>({ open: false, invoice: null });
  const [payForm, setPayForm] = useState({ paymentMethod: "Bank Transfer", referenceNumber: "", notes: "", paymentDate: "" });
  const [confirmDlg, setConfirmDlg] = useState<{ open: boolean; label: string; onConfirm: () => void }>({ open: false, label: "", onConfirm: () => {} });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["platform-invoices", statusFilter],
    queryFn: () => api.listInvoices({ status: statusFilter }),
  });

  const enforceM = useMutation({
    mutationFn: () => api.enforceSubscriptions(),
    onSuccess: (r) => {
      void qc.invalidateQueries({ queryKey: ["platform-invoices"] });
      void qc.invalidateQueries({ queryKey: ["platform-tenants"] });
      toast({
        title: "Subscription rules enforced",
        description: `${r.invoicesMarkedOverdue} invoices marked overdue • ${r.tenantsSuspended} tenants suspended • ${r.tenantsInGrace} in grace period`,
      });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const payM = useMutation({
    mutationFn: ({ id, data }: { id: number; data: typeof payForm }) =>
      api.payInvoice(id, {
        paymentMethod: data.paymentMethod,
        referenceNumber: data.referenceNumber || undefined,
        notes: data.notes || undefined,
        paymentDate: data.paymentDate || undefined,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["platform-invoices"] });
      void qc.invalidateQueries({ queryKey: ["platform-tenants"] });
      toast({ title: "Payment recorded", description: "Invoice marked as paid. Tenant access restored if applicable." });
      setPayDialog({ open: false, invoice: null });
    },
    onError: (e: Error) => toast({ title: "Payment failed", description: e.message, variant: "destructive" }),
  });

  const voidM = useMutation({
    mutationFn: (id: number) => api.voidInvoice(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["platform-invoices"] });
      toast({ title: "Invoice voided" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const invoices = data?.data ?? [];
  const filtered = search
    ? invoices.filter(inv =>
        inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
        (inv.tenantName ?? "").toLowerCase().includes(search.toLowerCase())
      )
    : invoices;

  // Stats from all invoices (not filtered by status)
  const { data: allData } = useQuery({
    queryKey: ["platform-invoices", "all"],
    queryFn: () => api.listInvoices({ status: "all" }),
  });
  const all = allData?.data ?? [];
  const totalInvoiced = all.reduce((s, i) => s + (i.status !== "void" ? i.amountCents : 0), 0);
  const totalPaid = all.filter(i => i.status === "paid").reduce((s, i) => s + i.amountCents, 0);
  const totalOverdue = all.filter(i => i.status === "overdue").reduce((s, i) => s + i.amountCents, 0);
  const overdueCount = all.filter(i => i.status === "overdue").length;

  function openPayDialog(inv: Invoice) {
    setPayForm({ paymentMethod: "Bank Transfer", referenceNumber: "", notes: "", paymentDate: new Date().toISOString().split("T")[0] });
    setPayDialog({ open: true, invoice: inv });
  }

  return (
    <div className="p-6 space-y-5 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Receipt className="w-5 h-5 text-primary" />
            Invoices
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {data?.total ?? 0} invoice{(data?.total ?? 0) !== 1 ? "s" : ""} total
          </p>
        </div>
        <Button
          size="sm" variant="outline"
          className="gap-2 h-8 text-xs"
          onClick={() => enforceM.mutate()}
          disabled={enforceM.isPending}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${enforceM.isPending ? "animate-spin" : ""}`} />
          Enforce Subscriptions
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total Invoiced", value: fmtMoney(totalInvoiced), icon: IndianRupee, color: "text-foreground" },
          { label: "Total Collected", value: fmtMoney(totalPaid), icon: CheckCircle2, color: "text-emerald-400" },
          { label: "Outstanding", value: fmtMoney(Math.max(0, totalInvoiced - totalPaid)), icon: TrendingUp, color: "text-blue-400" },
          { label: "Overdue", value: `${fmtMoney(totalOverdue)} (${overdueCount})`, icon: AlertTriangle, color: "text-red-400" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="bg-card border-card-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`w-3.5 h-3.5 ${color}`} />
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
              <p className={`text-lg font-bold ${color}`}>{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="flex border border-border rounded-md overflow-hidden bg-card">
          {STATUS_TABS.map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                statusFilter === s
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search invoice or tenant…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-8 text-sm bg-card"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-xs font-semibold text-muted-foreground">Invoice #</TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground">Tenant</TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground">Plan</TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground">Amount</TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground">Billing Period</TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground">Due Date</TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground">Status</TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i} className="border-border">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              : filtered.length === 0
              ? (
                <TableRow className="border-border hover:bg-transparent">
                  <TableCell colSpan={8} className="text-center py-12">
                    <Receipt className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No invoices found</p>
                  </TableCell>
                </TableRow>
              )
              : filtered.map(inv => (
                  <TableRow key={inv.id} className="border-border hover:bg-muted/30">
                    <TableCell>
                      <span className="font-mono text-xs font-medium text-foreground">{inv.invoiceNumber}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-foreground">{inv.tenantName ?? `Tenant #${inv.tenantId}`}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">{inv.planName ?? "—"}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-semibold text-foreground">{fmtMoney(inv.amountCents, inv.currency)}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">
                        {inv.billingPeriodStart && inv.billingPeriodEnd
                          ? `${fmtDate(inv.billingPeriodStart)} – ${fmtDate(inv.billingPeriodEnd)}`
                          : "—"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs ${inv.status === "overdue" ? "text-red-400 font-semibold" : "text-muted-foreground"}`}>
                        {fmtDate(inv.dueDate)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs gap-1 capitalize ${STATUS_STYLES[inv.status] ?? ""}`}>
                        {STATUS_ICONS[inv.status]}
                        {inv.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {(inv.status === "pending" || inv.status === "overdue") && (
                          <Button size="sm" className="h-6 text-xs px-2 bg-emerald-600 hover:bg-emerald-700"
                            onClick={() => openPayDialog(inv)}>
                            Record Payment
                          </Button>
                        )}
                        {inv.status !== "paid" && inv.status !== "void" && (
                          <Button size="sm" variant="ghost" className="h-6 text-xs px-2 text-muted-foreground hover:text-red-400"
                            onClick={() => setConfirmDlg({ open: true, label: `Void invoice ${inv.invoiceNumber}? This cannot be undone.`, onConfirm: () => voidM.mutate(inv.id) })}>
                            <XCircle className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </div>

      {/* Pay Dialog */}
      <Dialog open={payDialog.open} onOpenChange={o => !o && setPayDialog({ open: false, invoice: null })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          {payDialog.invoice && (
            <div className="space-y-4 py-2">
              <div className="bg-muted/40 rounded-lg p-3 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Invoice</span>
                  <span className="font-mono font-medium">{payDialog.invoice.invoiceNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tenant</span>
                  <span>{payDialog.invoice.tenantName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-semibold text-emerald-400">{fmtMoney(payDialog.invoice.amountCents, payDialog.invoice.currency)}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Payment Date</Label>
                  <Input type="date" className="h-8 text-sm"
                    value={payForm.paymentDate}
                    onChange={e => setPayForm(f => ({ ...f, paymentDate: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Payment Method</Label>
                  <Select value={payForm.paymentMethod} onValueChange={v => setPayForm(f => ({ ...f, paymentMethod: v }))}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Reference / Transaction ID</Label>
                <Input className="h-8 text-sm" placeholder="TXN-001234 or UTR number"
                  value={payForm.referenceNumber}
                  onChange={e => setPayForm(f => ({ ...f, referenceNumber: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Notes (optional)</Label>
                <Textarea className="text-sm min-h-[60px] resize-none" placeholder="Additional payment notes…"
                  value={payForm.notes}
                  onChange={e => setPayForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
              {payDialog.invoice.status === "overdue" && (
                <div className="flex items-start gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-emerald-300">
                    Recording payment will clear the overdue status. If no other invoices remain overdue,
                    the tenant's access will be restored automatically.
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setPayDialog({ open: false, invoice: null })}>Cancel</Button>
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700"
              disabled={payM.isPending}
              onClick={() => payDialog.invoice && payM.mutate({ id: payDialog.invoice.id, data: payForm })}>
              {payM.isPending ? "Recording…" : "Confirm Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDlg.open} onOpenChange={o => !o && setConfirmDlg(d => ({ ...d, open: false }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>{confirmDlg.label}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDlg.onConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
