import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CreditCard, Download, CheckCircle2, AlertTriangle, Clock, XCircle,
  ArrowUpCircle, Zap, Building2, ChevronRight, Receipt, Calendar,
  RefreshCw, Shield, IndianRupee, ExternalLink, Info, Users, Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { LocationSelector } from "@/components/LocationSelector";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function useRazorpayScript() {
  useEffect(() => {
    if (document.getElementById("razorpay-checkout-js")) return;
    const s = document.createElement("script");
    s.id = "razorpay-checkout-js";
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.async = true;
    document.body.appendChild(s);
  }, []);
}

async function apiFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}/api${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(opts?.headers ?? {}) },
    ...opts,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string })?.error ?? `API error ${res.status}`);
  return data as T;
}

type Plan = {
  id: number; name: string; type: string;
  priceMonthly: number; priceYearly: number;
  maxUsers: number; maxEmployees: number; maxBranches: number;
  description: string | null; enabledModules: string[];
};

type SubscriptionInfo = {
  tenant: {
    id: number; name: string; status: string; billingCycle: string;
    subscriptionStartsAt: string | null; subscriptionEndsAt: string | null;
    trialEndsAt: string | null; cancelAtPeriodEnd: boolean;
    gstNumber: string | null; billingAddress: Record<string, string> | null;
    razorpayCustomerId: string | null; stripeCustomerId: string | null;
  };
  plan: Plan | null;
  subscriptionStatus: string;
  totalInvoices: number;
  recentInvoices: Invoice[];
  gatewayConfig: {
    razorpay: { keyId: string } | null;
    stripe: Record<string, never> | null;
  };
};

type Invoice = {
  id: number; invoiceNumber: string; status: string; amountCents: number;
  taxAmountCents: number; discountCents: number; currency: string;
  billingCycle: string; billingPeriodStart: string | null; billingPeriodEnd: string | null;
  paidAt: string | null; issuedAt: string; gateway: string; description: string | null;
  planName?: string | null;
};

type InvoiceList = { data: Invoice[]; total: number; page: number; limit: number };

const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  active: { label: "Active", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300", icon: CheckCircle2 },
  trial: { label: "Trial", color: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300", icon: Clock },
  cancelling: { label: "Cancelling", color: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300", icon: AlertTriangle },
  grace_period: { label: "Grace Period", color: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300", icon: AlertTriangle },
  expired: { label: "Expired", color: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300", icon: XCircle },
  suspended: { label: "Suspended", color: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300", icon: XCircle },
  inactive: { label: "Inactive", color: "bg-gray-100 text-gray-700", icon: Clock },
};

const INVOICE_STATUS_MAP: Record<string, { label: string; color: string }> = {
  paid: { label: "Paid", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" },
  pending: { label: "Pending", color: "bg-amber-100 text-amber-800" },
  overdue: { label: "Overdue", color: "bg-red-100 text-red-800" },
  cancelled: { label: "Cancelled", color: "bg-gray-100 text-gray-600" },
  draft: { label: "Draft", color: "bg-gray-100 text-gray-600" },
};

function fmtRupees(cents: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(cents / 100);
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function PlanCard({
  plan, current, billingCycle, onSelect, loading,
}: {
  plan: Plan; current: boolean; billingCycle: "monthly" | "yearly";
  onSelect: (p: Plan) => void; loading: boolean;
}) {
  const price = billingCycle === "yearly" ? plan.priceYearly : plan.priceMonthly;
  const monthlyEquivalent = billingCycle === "yearly" && plan.priceYearly > 0
    ? Math.floor(plan.priceYearly / 12)
    : plan.priceMonthly;
  const saving = plan.priceMonthly > 0
    ? Math.round(((plan.priceMonthly * 12 - plan.priceYearly) / (plan.priceMonthly * 12)) * 100)
    : 0;

  const isPopular = plan.type === "professional";
  const isFree = plan.type === "trial" || plan.type === "custom";

  return (
    <div className={`relative rounded-xl border-2 p-5 flex flex-col gap-4 transition-all ${current ? "border-primary bg-primary/5" : isPopular ? "border-violet-500 shadow-md" : "border-border hover:border-primary/40"}`}>
      {isPopular && !current && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-violet-600 text-white text-[10px] font-bold px-3 py-0.5 rounded-full uppercase tracking-wider">Most Popular</span>
        </div>
      )}
      {current && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-primary text-primary-foreground text-[10px] font-bold px-3 py-0.5 rounded-full uppercase tracking-wider">Current Plan</span>
        </div>
      )}

      <div>
        <h3 className="font-bold text-lg text-foreground">{plan.name}</h3>
        {plan.description && <p className="text-xs text-muted-foreground mt-0.5">{plan.description}</p>}
      </div>

      <div className="flex items-end gap-1">
        {isFree ? (
          <span className="text-3xl font-black text-foreground">Free</span>
        ) : (
          <>
            <span className="text-3xl font-black text-foreground">₹{(monthlyEquivalent).toLocaleString("en-IN")}</span>
            <span className="text-sm text-muted-foreground mb-1">/mo</span>
          </>
        )}
      </div>
      {billingCycle === "yearly" && saving > 0 && (
        <span className="text-xs text-emerald-600 font-medium -mt-2">Save {saving}% yearly (₹{(price / 100).toLocaleString("en-IN")}/yr billed)</span>
      )}

      <div className="space-y-1.5 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <Users className="w-3.5 h-3.5 shrink-0" />
          <span>{plan.maxUsers < 0 ? "Unlimited users" : `Up to ${plan.maxUsers} users`}</span>
        </div>
        <div className="flex items-center gap-2">
          <Layers className="w-3.5 h-3.5 shrink-0" />
          <span>{plan.maxEmployees < 0 ? "Unlimited employees" : `Up to ${plan.maxEmployees} employees`}</span>
        </div>
        <div className="flex items-center gap-2">
          <Building2 className="w-3.5 h-3.5 shrink-0" />
          <span>{plan.maxBranches < 0 ? "Unlimited branches" : `${plan.maxBranches} branch${plan.maxBranches > 1 ? "es" : ""}`}</span>
        </div>
      </div>

      <Button
        className="mt-auto w-full"
        variant={current ? "outline" : isPopular ? "default" : "outline"}
        disabled={current || isFree || loading}
        onClick={() => !isFree && !current && onSelect(plan)}
      >
        {current ? "Current Plan" : isFree ? "Contact Sales" : loading ? "Processing…" : "Upgrade"}
      </Button>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status] ?? STATUS_MAP["inactive"]!;
  const Icon = s.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${s.color}`}>
      <Icon className="w-3.5 h-3.5" />
      {s.label}
    </span>
  );
}

export default function BillingPage() {
  useRazorpayScript();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [showCancel, setShowCancel] = useState(false);
  const [showGstForm, setShowGstForm] = useState(false);
  const [gstNumber, setGstNumber] = useState("");
  const [billingAddress, setBillingAddress] = useState({ line1: "", city: "", state: "", pincode: "", country: "India" });

  const { data: sub, isLoading: subLoading } = useQuery<SubscriptionInfo>({
    queryKey: ["billing-subscription"],
    queryFn: () => apiFetch("/billing/subscription"),
    staleTime: 30_000,
  });

  const { data: plansData } = useQuery<Plan[]>({
    queryKey: ["billing-plans"],
    queryFn: () => apiFetch("/billing/plans"),
    staleTime: 5 * 60_000,
  });

  const { data: invoiceData, isLoading: invoicesLoading } = useQuery<InvoiceList>({
    queryKey: ["billing-invoices"],
    queryFn: () => apiFetch("/billing/invoices?limit=20"),
    staleTime: 30_000,
  });

  const createOrderMut = useMutation({
    mutationFn: ({ planId, cycle }: { planId: number; cycle: string }) =>
      apiFetch<{ orderId: string; invoiceId: number; invoiceNumber: string; amountCents: number; baseAmountCents: number; taxCents: number; currency: string; keyId: string; prefill: { name: string; email: string } }>(
        "/billing/razorpay/create-order",
        { method: "POST", body: JSON.stringify({ planId, billingCycle: cycle }) },
      ),
    onSuccess: (orderData, vars) => {
      if (!selectedPlan) return;
      const { orderId, invoiceId, amountCents, keyId, prefill } = orderData;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const RazorpayCheckout = (window as any).Razorpay;
      if (!RazorpayCheckout) {
        toast({ title: "Payment gateway unavailable", description: "Razorpay script failed to load. Please refresh and try again.", variant: "destructive" });
        return;
      }

      const rz = new RazorpayCheckout({
        key: keyId,
        amount: amountCents,
        currency: "INR",
        name: "MysticsHR",
        description: `${selectedPlan.name} – ${vars.cycle === "yearly" ? "Annual" : "Monthly"}`,
        image: "/icon.png",
        order_id: orderId,
        prefill: { name: prefill.name, email: prefill.email },
        notes: { invoiceId: String(invoiceId) },
        theme: { color: "#4f46e5" },
        handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          try {
            await apiFetch("/billing/razorpay/verify-payment", {
              method: "POST",
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                invoiceId,
                planId: vars.planId,
                billingCycle: vars.cycle,
              }),
            });
            toast({ title: "Payment successful!", description: `Your ${selectedPlan.name} plan is now active.` });
            qc.invalidateQueries({ queryKey: ["billing-subscription"] });
            qc.invalidateQueries({ queryKey: ["billing-invoices"] });
            setShowUpgrade(false);
          } catch {
            toast({ title: "Payment verification failed", description: "Please contact support with your payment ID.", variant: "destructive" });
          }
        },
        modal: { ondismiss: () => { /* noop */ } },
      });
      rz.open();
    },
    onError: (err: Error) => {
      toast({ title: "Failed to create order", description: err.message, variant: "destructive" });
    },
  });

  const cancelMut = useMutation({
    mutationFn: () => apiFetch<{ ok: boolean; message: string }>("/billing/cancel", { method: "POST", body: "{}" }),
    onSuccess: (data) => {
      toast({ title: "Cancellation scheduled", description: data.message });
      qc.invalidateQueries({ queryKey: ["billing-subscription"] });
      setShowCancel(false);
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const resumeMut = useMutation({
    mutationFn: () => apiFetch<{ ok: boolean; message: string }>("/billing/resume", { method: "POST", body: "{}" }),
    onSuccess: (data) => {
      toast({ title: "Subscription resumed", description: data.message });
      qc.invalidateQueries({ queryKey: ["billing-subscription"] });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateGstMut = useMutation({
    mutationFn: () => apiFetch<{ ok: boolean }>("/billing/update-gst", {
      method: "POST",
      body: JSON.stringify({ gstNumber: gstNumber || undefined, billingAddress }),
    }),
    onSuccess: () => {
      toast({ title: "Billing details updated" });
      qc.invalidateQueries({ queryKey: ["billing-subscription"] });
      setShowGstForm(false);
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const handleSelectPlan = useCallback((plan: Plan) => {
    setSelectedPlan(plan);
    setShowUpgrade(true);
  }, []);

  const handleProceedPayment = useCallback(() => {
    if (!selectedPlan) return;
    if (!sub?.gatewayConfig.razorpay) {
      toast({ title: "Payment not configured", description: "Razorpay keys are not set up yet.", variant: "destructive" });
      return;
    }
    createOrderMut.mutate({ planId: selectedPlan.id, cycle: billingCycle });
  }, [selectedPlan, billingCycle, sub, createOrderMut, toast]);

  const openGstForm = useCallback(() => {
    setGstNumber(sub?.tenant.gstNumber ?? "");
    const addr = sub?.tenant.billingAddress as Record<string, string> | null;
    setBillingAddress({ line1: addr?.line1 ?? "", city: addr?.city ?? "", state: addr?.state ?? "", pincode: addr?.pincode ?? "", country: addr?.country ?? "India" });
    setShowGstForm(true);
  }, [sub]);

  const downloadInvoice = useCallback(async (invoiceId: number) => {
    try {
      const res = await fetch(`${BASE}/api/billing/invoices/${invoiceId}/pdf`, { credentials: "include" });
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Invoice-${invoiceId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: "Download failed", description: "Could not download the invoice PDF. Please try again.", variant: "destructive" });
    }
  }, [toast]);

  const status = sub?.subscriptionStatus ?? "inactive";
  const statusInfo = STATUS_MAP[status] ?? STATUS_MAP["inactive"]!;

  if (subLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-primary" />
            Billing & Subscription
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage your plan, payments, and invoices</p>
        </div>
        <div className="flex gap-2">
          {sub?.tenant.cancelAtPeriodEnd ? (
            <Button variant="outline" size="sm" onClick={() => resumeMut.mutate()} disabled={resumeMut.isPending}>
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Resume Subscription
            </Button>
          ) : sub?.plan && sub.plan.type !== "trial" && sub.plan.type !== "custom" ? (
            <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/5" onClick={() => setShowCancel(true)}>
              <XCircle className="w-3.5 h-3.5 mr-1.5" />
              Cancel Plan
            </Button>
          ) : null}
        </div>
      </div>

      {/* Status alerts */}
      {status === "grace_period" && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Subscription expired — Grace period active</AlertTitle>
          <AlertDescription>Your subscription ended but you're in a grace period. Renew now to avoid service interruption.</AlertDescription>
        </Alert>
      )}
      {status === "cancelling" && (
        <Alert className="border-amber-300 bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-200">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle>Cancellation scheduled</AlertTitle>
          <AlertDescription>
            Your plan will be cancelled on <strong>{fmtDate(sub?.tenant.subscriptionEndsAt ?? null)}</strong>. You can resume anytime before then.
          </AlertDescription>
        </Alert>
      )}
      {status === "trial" && (
        <Alert className="border-blue-300 bg-blue-50 text-blue-900 dark:bg-blue-950 dark:text-blue-200">
          <Clock className="h-4 w-4 text-blue-600" />
          <AlertTitle>Trial period active</AlertTitle>
          <AlertDescription>
            Trial ends on <strong>{fmtDate(sub?.tenant.trialEndsAt ?? null)}</strong>. Upgrade to keep full access.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="overview">
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="plans">Plans & Pricing</TabsTrigger>
          <TabsTrigger value="invoices">
            Invoices
            {(invoiceData?.total ?? 0) > 0 && (
              <span className="ml-1.5 text-[10px] bg-primary text-primary-foreground rounded-full px-1.5 py-0.5">{invoiceData!.total}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="settings">Billing Settings</TabsTrigger>
        </TabsList>

        {/* ─── OVERVIEW TAB ─── */}
        <TabsContent value="overview" className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Current Plan */}
            <Card className="md:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>Current Subscription</span>
                  <StatusBadge status={status} />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <p className="text-2xl font-black text-foreground">{sub?.plan?.name ?? "No Plan"}</p>
                    {sub?.plan && (
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {sub.tenant.billingCycle === "yearly" ? "Annual" : "Monthly"} billing
                        {sub.plan.priceMonthly > 0 && (
                          <> · {fmtRupees(sub.tenant.billingCycle === "yearly" ? sub.plan.priceYearly * 100 : sub.plan.priceMonthly * 100)}/
                            {sub.tenant.billingCycle === "yearly" ? "yr" : "mo"}
                          </>
                        )}
                      </p>
                    )}
                  </div>
                  <div className="text-right text-sm text-muted-foreground space-y-1">
                    {sub?.tenant.subscriptionStartsAt && (
                      <p>Started: {fmtDate(sub.tenant.subscriptionStartsAt)}</p>
                    )}
                    {sub?.tenant.subscriptionEndsAt && (
                      <p>Renews: {fmtDate(sub.tenant.subscriptionEndsAt)}</p>
                    )}
                  </div>
                </div>
                <Separator />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-lg font-bold">{sub?.plan?.maxUsers === -1 ? "∞" : sub?.plan?.maxUsers ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">Max Users</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold">{sub?.plan?.maxEmployees === -1 ? "∞" : sub?.plan?.maxEmployees ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">Max Employees</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold">{sub?.plan?.maxBranches === -1 ? "∞" : sub?.plan?.maxBranches ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">Max Branches</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Methods */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Payment Methods</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className={`flex items-center gap-2 p-2.5 rounded-lg border ${sub?.gatewayConfig.razorpay ? "border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30" : "border-dashed"}`}>
                  <IndianRupee className={`w-4 h-4 ${sub?.gatewayConfig.razorpay ? "text-emerald-600" : "text-muted-foreground"}`} />
                  <div className="flex-1">
                    <p className="text-xs font-medium">Razorpay (India)</p>
                    <p className="text-[10px] text-muted-foreground">UPI, Cards, NetBanking, Wallets</p>
                  </div>
                  {sub?.gatewayConfig.razorpay && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                </div>
                <div className={`flex items-center gap-2 p-2.5 rounded-lg border ${sub?.gatewayConfig.stripe ? "border-violet-300 bg-violet-50 dark:bg-violet-950/30" : "border-dashed"}`}>
                  <CreditCard className={`w-4 h-4 ${sub?.gatewayConfig.stripe ? "text-violet-600" : "text-muted-foreground"}`} />
                  <div className="flex-1">
                    <p className="text-xs font-medium">Stripe (International)</p>
                    <p className="text-[10px] text-muted-foreground">Visa, Mastercard, AMEX</p>
                  </div>
                  {sub?.gatewayConfig.stripe && <CheckCircle2 className="w-3.5 h-3.5 text-violet-600" />}
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded-lg border border-dashed">
                  <Shield className="w-4 h-4 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-xs font-medium">Secure & Encrypted</p>
                    <p className="text-[10px] text-muted-foreground">PCI-DSS compliant</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Invoices */}
          {(sub?.recentInvoices?.length ?? 0) > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between">
                  <span className="flex items-center gap-2"><Receipt className="w-4 h-4" />Recent Invoices</span>
                  <Button variant="ghost" size="sm" className="text-xs" onClick={() => document.querySelector<HTMLButtonElement>('[data-value="invoices"]')?.click()}>
                    View all <ChevronRight className="w-3 h-3 ml-1" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {sub!.recentInvoices.map(inv => (
                    <div key={inv.id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div>
                        <p className="text-sm font-medium">{inv.invoiceNumber}</p>
                        <p className="text-xs text-muted-foreground">{fmtDate(inv.issuedAt)}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${INVOICE_STATUS_MAP[inv.status]?.color ?? "bg-gray-100"}`}>
                          {INVOICE_STATUS_MAP[inv.status]?.label ?? inv.status}
                        </span>
                        <span className="text-sm font-semibold">{fmtRupees(inv.amountCents + inv.taxAmountCents - inv.discountCents)}</span>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => downloadInvoice(inv.id)}>
                          <Download className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ─── PLANS TAB ─── */}
        <TabsContent value="plans" className="space-y-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="font-semibold text-foreground">Choose Your Plan</h2>
              <p className="text-xs text-muted-foreground">All plans include GST invoice. Prices in INR.</p>
            </div>
            <div className="flex items-center gap-2.5">
              <span className={`text-sm ${billingCycle === "monthly" ? "font-semibold text-foreground" : "text-muted-foreground"}`}>Monthly</span>
              <Switch
                checked={billingCycle === "yearly"}
                onCheckedChange={v => setBillingCycle(v ? "yearly" : "monthly")}
              />
              <span className={`text-sm ${billingCycle === "yearly" ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                Yearly
                <span className="ml-1 text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-medium">Save up to 17%</span>
              </span>
            </div>
          </div>

          {!plansData && <div className="animate-pulse grid grid-cols-2 md:grid-cols-4 gap-4">{[1,2,3,4].map(i => <div key={i} className="h-60 bg-muted rounded-xl" />)}</div>}
          {plansData && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {plansData.filter((p: any) => p.isActive !== false).map(plan => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  current={sub?.plan?.id === plan.id}
                  billingCycle={billingCycle}
                  onSelect={handleSelectPlan}
                  loading={createOrderMut.isPending}
                />
              ))}
            </div>
          )}

          <Alert className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-xs">
              All prices are exclusive of GST (18%). A tax invoice will be generated for every payment.
              For Enterprise or Custom pricing, contact <a href="mailto:sales@mysticshr.com" className="underline text-blue-700">sales@mysticshr.com</a>.
            </AlertDescription>
          </Alert>
        </TabsContent>

        {/* ─── INVOICES TAB ─── */}
        <TabsContent value="invoices" className="space-y-4">
          {invoicesLoading && (
            <div className="animate-pulse space-y-2">
              {[1,2,3].map(i => <div key={i} className="h-16 bg-muted rounded-lg" />)}
            </div>
          )}
          {!invoicesLoading && (invoiceData?.data?.length ?? 0) === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <Receipt className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">No invoices yet</p>
              <p className="text-sm">Your invoices will appear here after your first payment.</p>
            </div>
          )}
          {!invoicesLoading && (invoiceData?.data?.length ?? 0) > 0 && (
            <div className="rounded-xl border overflow-x-auto">
              <table className="w-full text-sm min-w-[540px]">
                <thead className="bg-muted/50">
                  <tr className="text-xs text-muted-foreground">
                    <th className="text-left px-4 py-3 font-medium">Invoice</th>
                    <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Period</th>
                    <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Gateway</th>
                    <th className="text-right px-4 py-3 font-medium">Amount</th>
                    <th className="text-center px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(invoiceData?.data ?? []).map(inv => (
                    <tr key={inv.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{inv.invoiceNumber}</p>
                        <p className="text-xs text-muted-foreground">{fmtDate(inv.issuedAt)}</p>
                        {inv.planName && <p className="text-xs text-muted-foreground">{inv.planName}</p>}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground hidden sm:table-cell">
                        {inv.billingPeriodStart && inv.billingPeriodEnd
                          ? `${fmtDate(inv.billingPeriodStart)} – ${fmtDate(inv.billingPeriodEnd)}`
                          : "—"}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="capitalize text-xs">{inv.gateway}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <p className="font-semibold">{fmtRupees(inv.amountCents + inv.taxAmountCents - inv.discountCents)}</p>
                        {inv.taxAmountCents > 0 && (
                          <p className="text-[10px] text-muted-foreground">incl. GST {fmtRupees(inv.taxAmountCents)}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${INVOICE_STATUS_MAP[inv.status]?.color ?? "bg-gray-100"}`}>
                          {INVOICE_STATUS_MAP[inv.status]?.label ?? inv.status}
                        </span>
                        {inv.paidAt && <p className="text-[10px] text-muted-foreground mt-0.5">{fmtDate(inv.paidAt)}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => downloadInvoice(inv.id)}>
                              <Download className="w-3.5 h-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Download PDF</TooltipContent>
                        </Tooltip>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* ─── BILLING SETTINGS TAB ─── */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">GST & Billing Details</CardTitle>
              <CardDescription>Add your GST number for compliant tax invoices.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">GST Number</p>
                  <p className="font-medium">{sub?.tenant.gstNumber ?? <span className="text-muted-foreground italic">Not set</span>}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Billing Address</p>
                  {sub?.tenant.billingAddress ? (
                    <p className="font-medium text-xs">
                      {Object.values(sub.tenant.billingAddress as Record<string, string>).filter(Boolean).join(", ")}
                    </p>
                  ) : (
                    <span className="text-muted-foreground italic">Not set</span>
                  )}
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={openGstForm}>
                <Calendar className="w-3.5 h-3.5 mr-1.5" />
                Update Billing Details
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Billing Cycle</CardTitle>
              <CardDescription>Your current billing cycle is <strong>{sub?.tenant.billingCycle ?? "monthly"}</strong>.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">To change your billing cycle, select a plan from the Plans tab with the desired cycle.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Upgrade Dialog ── */}
      <Dialog open={showUpgrade} onOpenChange={setShowUpgrade}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowUpCircle className="w-5 h-5 text-primary" />
              Upgrade to {selectedPlan?.name}
            </DialogTitle>
            <DialogDescription>Review your order before proceeding to payment.</DialogDescription>
          </DialogHeader>
          {selectedPlan && (
            <div className="space-y-4 py-1">
              <div className="rounded-lg border p-4 space-y-2 bg-muted/30 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Plan</span>
                  <span className="font-medium">{selectedPlan.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Billing</span>
                  <div className="flex items-center gap-2">
                    <span className={billingCycle === "monthly" ? "font-medium" : "text-muted-foreground"}>Monthly</span>
                    <Switch
                      checked={billingCycle === "yearly"}
                      onCheckedChange={v => setBillingCycle(v ? "yearly" : "monthly")}
                      className="scale-75"
                    />
                    <span className={billingCycle === "yearly" ? "font-medium" : "text-muted-foreground"}>Yearly</span>
                  </div>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Base amount</span>
                  <span>{fmtRupees((billingCycle === "yearly" ? selectedPlan.priceYearly : selectedPlan.priceMonthly) * 100)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">GST (18%)</span>
                  <span>{fmtRupees(Math.round((billingCycle === "yearly" ? selectedPlan.priceYearly : selectedPlan.priceMonthly) * 18))}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-base">
                  <span>Total</span>
                  <span>{fmtRupees(Math.round((billingCycle === "yearly" ? selectedPlan.priceYearly : selectedPlan.priceMonthly) * 118))}</span>
                </div>
              </div>

              {!sub?.gatewayConfig.razorpay && (
                <Alert variant="destructive" className="py-2">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <AlertDescription className="text-xs">Razorpay payment gateway is not configured. Contact support.</AlertDescription>
                </Alert>
              )}

              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Shield className="w-3 h-3" />
                Secured by Razorpay · PCI-DSS compliant
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowUpgrade(false)}>Cancel</Button>
            <Button
              onClick={handleProceedPayment}
              disabled={createOrderMut.isPending || !sub?.gatewayConfig.razorpay}
              className="gap-2"
            >
              <Zap className="w-3.5 h-3.5" />
              {createOrderMut.isPending ? "Creating order…" : "Pay with Razorpay"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Cancel Dialog ── */}
      <Dialog open={showCancel} onOpenChange={setShowCancel}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="w-5 h-5" />
              Cancel Subscription
            </DialogTitle>
            <DialogDescription>
              Your subscription will remain active until <strong>{fmtDate(sub?.tenant.subscriptionEndsAt ?? null)}</strong>. You can resume anytime before then.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowCancel(false)}>Keep Subscription</Button>
            <Button variant="destructive" onClick={() => cancelMut.mutate()} disabled={cancelMut.isPending}>
              {cancelMut.isPending ? "Cancelling…" : "Cancel at Period End"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── GST Form Dialog ── */}
      <Dialog open={showGstForm} onOpenChange={setShowGstForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Billing Details</DialogTitle>
            <DialogDescription>These details will appear on your tax invoices.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1">
              <Label htmlFor="gstNum">GST Number (optional)</Label>
              <Input id="gstNum" placeholder="29AABCM1234F1ZL" value={gstNumber} onChange={e => setGstNumber(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="bl1">Address Line 1</Label>
              <Input id="bl1" value={billingAddress.line1} onChange={e => setBillingAddress(a => ({ ...a, line1: e.target.value }))} />
            </div>
            <LocationSelector
              country={billingAddress.country}
              state={billingAddress.state}
              city={billingAddress.city}
              onCountryChange={v => setBillingAddress(a => ({ ...a, country: v, state: "", city: "" }))}
              onStateChange={v => setBillingAddress(a => ({ ...a, state: v, city: "" }))}
              onCityChange={v => setBillingAddress(a => ({ ...a, city: v }))}
              layout="stack"
            />
            <div className="space-y-1">
              <Label>PIN Code</Label>
              <Input value={billingAddress.pincode} onChange={e => setBillingAddress(a => ({ ...a, pincode: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGstForm(false)}>Cancel</Button>
            <Button onClick={() => updateGstMut.mutate()} disabled={updateGstMut.isPending}>
              {updateGstMut.isPending ? "Saving…" : "Save Details"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
