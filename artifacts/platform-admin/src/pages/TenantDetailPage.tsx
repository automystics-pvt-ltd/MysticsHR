import { useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, TenantDetail, SubscriptionPlan, Invoice, ThemeConfig, PayslipConfig, IdCardConfig, IdCardFields, fmtMoney } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  ChevronLeft, Plus, Users, BarChart2, Settings, CreditCard,
  Activity, Building2, Globe, Mail, Briefcase, FileText,
  CheckCircle2, XCircle, Clock, Zap, GitBranch,
  Receipt, AlertTriangle, IndianRupee, TrendingUp, Ban,
  KeyRound, Copy, Check, Palette,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Country } from "country-state-city";

const ALL_MODULES = [
  { id: "core", label: "Core HR", desc: "Employees, departments, designations", required: true },
  { id: "recruitment", label: "Recruitment", desc: "Job requisitions, candidates, interviews" },
  { id: "onboarding", label: "Onboarding", desc: "Pre-boarding & onboarding checklists" },
  { id: "attendance", label: "Attendance", desc: "Shifts, time tracking, regularization" },
  { id: "leave", label: "Leave Management", desc: "Leave types, policies, approvals" },
  { id: "payroll", label: "Payroll", desc: "Salary structures, runs, payslips" },
  { id: "performance", label: "Performance", desc: "Goals, appraisals, calibration" },
  { id: "helpdesk", label: "Help Desk", desc: "Tickets, SLA management" },
  { id: "documents", label: "Documents", desc: "Document management" },
  { id: "analytics", label: "Analytics", desc: "Reports and dashboards" },
  { id: "exit", label: "Exit Management", desc: "Offboarding, clearance, FnF" },
];

const ALL_FEATURES = [
  { id: "api_access", label: "API Access", desc: "External REST API with key management" },
  { id: "sso", label: "Single Sign-On", desc: "SAML/OIDC enterprise SSO" },
  { id: "custom_branding", label: "Custom Branding", desc: "White-label with own logo" },
  { id: "advanced_analytics", label: "Advanced Analytics", desc: "Custom dashboards and exports" },
  { id: "bulk_import", label: "Bulk Import/Export", desc: "CSV import and data export" },
  { id: "webhooks", label: "Webhooks", desc: "Real-time event notifications" },
  { id: "custom_workflows", label: "Custom Workflows", desc: "Configurable approval chains" },
  { id: "ai_insights", label: "AI Insights", desc: "AI-powered HR recommendations" },
];

const STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  trial: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  suspended: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  archived: "bg-muted text-muted-foreground border-border",
};

const PLAN_STYLES: Record<string, string> = {
  trial: "bg-slate-500/10 text-slate-400",
  starter: "bg-green-500/10 text-green-400",
  professional: "bg-blue-500/10 text-blue-400",
  enterprise: "bg-purple-500/10 text-purple-400",
  custom: "bg-orange-500/10 text-orange-400",
};

const ROLE_COLORS: Record<string, string> = {
  customer_admin: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  hr_manager: "bg-purple-500/15 text-purple-400 border-purple-500/20",
  employee: "bg-muted text-muted-foreground border-border",
  payroll_admin: "bg-amber-500/15 text-amber-400 border-amber-500/20",
};

const INDUSTRIES = ["Technology","Finance","Healthcare","Education","Manufacturing","Retail","Services","Government","Non-profit","Other"];
const COUNTRIES = Country.getAllCountries().map((c) => c.name);
const STATUSES = ["active","trial","suspended","archived"];

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}
function fmtLimit(v?: number | null) { return v === -1 ? "Unlimited" : v?.toLocaleString() ?? "—"; }

// ─── Overview Tab ─────────────────────────────────────────────────────────────
function OverviewTab({ tenant, plans, onRefresh }: {
  tenant: TenantDetail;
  plans: SubscriptionPlan[];
  onRefresh: () => void;
}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: tenant.name,
    status: tenant.status,
    contactEmail: tenant.contactEmail ?? "",
    industry: tenant.industry ?? "",
    country: tenant.country ?? "",
    website: tenant.website ?? "",
    notes: tenant.notes ?? "",
    planId: tenant.planId ? String(tenant.planId) : "",
  });

  const updateMutation = useMutation({
    mutationFn: () => api.updateTenant(tenant.id, {
      name: form.name,
      status: form.status,
      contactEmail: form.contactEmail || null,
      industry: form.industry || null,
      country: form.country || null,
      website: form.website || null,
      notes: form.notes || null,
      planId: form.planId ? Number(form.planId) : null,
    }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["platform-tenant", tenant.id] });
      void qc.invalidateQueries({ queryKey: ["platform-tenants"] });
      toast({ title: "Tenant updated successfully" });
      setEditing(false);
      onRefresh();
    },
    onError: (e: Error) => toast({ title: "Update failed", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-5">
      <Card className="bg-card border-card-border">
        <CardHeader className="pb-3 border-b border-border px-5 pt-5">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">Organisation Info</CardTitle>
            {!editing ? (
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setEditing(true)}>Edit</Button>
            ) : (
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditing(false)}>Cancel</Button>
                <Button size="sm" className="h-7 text-xs"
                  onClick={() => updateMutation.mutate()}
                  disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Saving…" : "Save"}
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-5">
          {!editing ? (
            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              {[
                { icon: Building2, label: "Name", value: tenant.name },
                { icon: FileText, label: "Slug", value: <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{tenant.slug}</code> },
                { icon: CheckCircle2, label: "Status", value: (
                  <Badge variant="outline" className={`text-xs capitalize ${STATUS_STYLES[tenant.status] ?? ""}`}>{tenant.status}</Badge>
                )},
                { icon: CreditCard, label: "Plan", value: tenant.planName ? (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PLAN_STYLES[tenant.planType ?? ""] ?? "bg-muted text-muted-foreground"}`}>
                    {tenant.planName}
                  </span>
                ) : <span className="text-xs text-muted-foreground">No plan assigned</span>},
                { icon: Mail, label: "Contact Email", value: tenant.contactEmail ?? "—" },
                { icon: Briefcase, label: "Industry", value: tenant.industry ?? "—" },
                { icon: Globe, label: "Country", value: tenant.country ?? "—" },
                { icon: Globe, label: "Website", value: tenant.website ? (
                  <a href={tenant.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-xs">{tenant.website}</a>
                ) : "—"},
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-start gap-3">
                  <Icon className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <div className="text-sm text-foreground mt-0.5">{value}</div>
                  </div>
                </div>
              ))}
              {tenant.notes && (
                <div className="col-span-2 flex items-start gap-3">
                  <FileText className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Notes</p>
                    <p className="text-sm text-foreground mt-0.5 whitespace-pre-wrap">{tenant.notes}</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Subscription Plan</Label>
                <Select value={form.planId || "none"} onValueChange={(v) => setForm({ ...form, planId: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="No plan" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No plan</SelectItem>
                    {plans.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Contact Email</Label>
                <Input type="email" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Industry</Label>
                <Select value={form.industry} onValueChange={(v) => setForm({ ...form, industry: v })}>
                  <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>{INDUSTRIES.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Country</Label>
                <Select value={form.country} onValueChange={(v) => setForm({ ...form, country: v })}>
                  <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>{COUNTRIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Website</Label>
                <Input placeholder="https://…" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Notes</Label>
                <Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Users", value: tenant.userCount ?? 0, sub: `${tenant.activeUserCount ?? 0} active` },
          { label: "Employees", value: tenant.employeeCount ?? 0 },
          { label: "Created", value: fmtDate(tenant.createdAt), isStr: true },
          { label: "Last Updated", value: fmtDate(tenant.updatedAt), isStr: true },
        ].map(({ label, value, sub, isStr }) => (
          <Card key={label} className="bg-card border-card-border">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">{label}</p>
              <p className={`font-bold text-foreground mt-1 ${isStr ? "text-sm" : "text-2xl"}`}>
                {typeof value === "number" ? value.toLocaleString() : value}
              </p>
              {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Custom Pricing Sub-component ─────────────────────────────────────────────
function CustomPricingCard({ tenant, currentPlan }: { tenant: TenantDetail; currentPlan?: SubscriptionPlan }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const hasOverride = tenant.customPriceMonthly != null || tenant.customPriceYearly != null;

  const [pricingForm, setPricingForm] = useState({
    customPriceMonthly: tenant.customPriceMonthly != null ? String(Math.round(tenant.customPriceMonthly / 100)) : "",
    customPriceYearly: tenant.customPriceYearly != null ? String(Math.round(tenant.customPriceYearly / 100)) : "",
  });

  const pricingMutation = useMutation({
    mutationFn: (data: { customPriceMonthly: number | null; customPriceYearly: number | null }) =>
      api.updateTenant(tenant.id, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["platform-tenant", tenant.id] });
      toast({ title: "Custom pricing saved" });
    },
    onError: (e: Error) => toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  function savePricing() {
    const monthly = pricingForm.customPriceMonthly !== ""
      ? Math.round(Number(pricingForm.customPriceMonthly) * 100)
      : null;
    const yearly = pricingForm.customPriceYearly !== ""
      ? Math.round(Number(pricingForm.customPriceYearly) * 100)
      : null;
    pricingMutation.mutate({ customPriceMonthly: monthly, customPriceYearly: yearly });
  }

  function clearPricing() {
    setPricingForm({ customPriceMonthly: "", customPriceYearly: "" });
    pricingMutation.mutate({ customPriceMonthly: null, customPriceYearly: null });
  }

  const planMonthly = currentPlan ? (currentPlan.priceMonthly === 0 ? "Free" : fmtMoney(currentPlan.priceMonthly * 100)) : "—";
  const planYearly = currentPlan ? (currentPlan.priceYearly === 0 ? "—" : fmtMoney(currentPlan.priceYearly * 100)) : "—";

  return (
    <Card className="bg-card border-card-border">
      <CardHeader className="pb-3 border-b border-border px-5 pt-5">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <IndianRupee className="w-4 h-4" />
              Custom Pricing Override
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Set a negotiated price for this customer. Overrides the standard plan price for all payment orders.
            </p>
          </div>
          {hasOverride && (
            <Badge variant="outline" className="text-xs bg-orange-500/10 text-orange-400 border-orange-500/20">
              Custom pricing active
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-5 space-y-4">
        {/* Standard plan pricing reference */}
        {currentPlan && (
          <div className="bg-muted/30 rounded-lg p-3 grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-muted-foreground">Standard monthly (from plan)</p>
              <p className="font-medium text-foreground mt-0.5">{planMonthly}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Standard yearly (from plan)</p>
              <p className="font-medium text-foreground mt-0.5">{planYearly}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Custom Monthly Price (₹)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">₹</span>
              <Input
                type="number"
                min={0}
                step={1}
                className="pl-7"
                placeholder={currentPlan ? String(Math.round(currentPlan.priceMonthly)) : "e.g. 2999"}
                value={pricingForm.customPriceMonthly}
                onChange={(e) => setPricingForm((f) => ({ ...f, customPriceMonthly: e.target.value }))}
              />
            </div>
            {pricingForm.customPriceMonthly !== "" && (
              <p className="text-xs text-orange-400">
                Effective: {fmtMoney(Math.round(Number(pricingForm.customPriceMonthly) * 100))} / month
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Custom Yearly Price (₹)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">₹</span>
              <Input
                type="number"
                min={0}
                step={1}
                className="pl-7"
                placeholder={currentPlan && currentPlan.priceYearly > 0 ? String(Math.round(currentPlan.priceYearly)) : "e.g. 29999"}
                value={pricingForm.customPriceYearly}
                onChange={(e) => setPricingForm((f) => ({ ...f, customPriceYearly: e.target.value }))}
              />
            </div>
            {pricingForm.customPriceYearly !== "" && (
              <p className="text-xs text-orange-400">
                Effective: {fmtMoney(Math.round(Number(pricingForm.customPriceYearly) * 100))} / year
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <Button size="sm" className="h-7 text-xs" onClick={savePricing} disabled={pricingMutation.isPending}>
            {pricingMutation.isPending ? "Saving…" : "Save Custom Price"}
          </Button>
          {hasOverride && (
            <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive hover:text-destructive"
              onClick={clearPricing} disabled={pricingMutation.isPending}>
              Clear Override
            </Button>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          Leave a field blank to fall back to the standard plan price for that billing cycle.
          Enter whole numbers in INR (e.g. <code>2999</code> for ₹2,999/month).
          GST (18%) is added on top of these prices at checkout.
        </p>
      </CardContent>
    </Card>
  );
}

// ─── Subscription Tab ──────────────────────────────────────────────────────────
function SubscriptionTab({ tenant, plans }: { tenant: TenantDetail; plans: SubscriptionPlan[] }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [changeReason, setChangeReason] = useState("");
  const [form, setForm] = useState({
    planId: tenant.planId ? String(tenant.planId) : "",
    trialEndsAt: tenant.trialEndsAt ? tenant.trialEndsAt.slice(0, 10) : "",
    subscriptionStartsAt: tenant.subscriptionStartsAt ? (tenant.subscriptionStartsAt as string).slice(0, 10) : "",
    subscriptionEndsAt: tenant.subscriptionEndsAt ? tenant.subscriptionEndsAt.slice(0, 10) : "",
  });

  const currentPlan = plans.find((p) => p.id === tenant.planId);

  const updateMutation = useMutation({
    mutationFn: () => api.updateTenant(tenant.id, {
      planId: form.planId ? Number(form.planId) : null,
      trialEndsAt: form.trialEndsAt || null,
      subscriptionStartsAt: form.subscriptionStartsAt || null,
      subscriptionEndsAt: form.subscriptionEndsAt || null,
      changeReason: changeReason.trim() || undefined,
    }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["platform-tenant", tenant.id] });
      toast({ title: "Subscription updated" });
      setEditing(false);
      setChangeReason("");
    },
    onError: (e: Error) => toast({ title: "Update failed", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-5">
      {/* Current Plan Card */}
      {currentPlan ? (
        <Card className="bg-card border-card-border">
          <CardHeader className="pb-3 border-b border-border px-5 pt-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Current Plan</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <h3 className="text-base font-semibold text-foreground">{currentPlan.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${PLAN_STYLES[currentPlan.type] ?? ""}`}>
                      {currentPlan.type}
                    </span>
                  </div>
                </div>
              </div>
              {!editing ? (
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setEditing(true)}>Change Plan</Button>
              ) : (
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setEditing(false); setChangeReason(""); }}>Cancel</Button>
                  <Button size="sm" className="h-7 text-xs" onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? "Saving…" : "Save"}
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                {
                  label: "Monthly",
                  value: tenant.customPriceMonthly != null
                    ? fmtMoney(tenant.customPriceMonthly)
                    : (currentPlan.priceMonthly === 0 ? "Free" : fmtMoney(currentPlan.priceMonthly * 100)),
                  custom: tenant.customPriceMonthly != null,
                },
                {
                  label: "Yearly",
                  value: tenant.customPriceYearly != null
                    ? fmtMoney(tenant.customPriceYearly)
                    : (currentPlan.priceYearly === 0 ? "—" : fmtMoney(currentPlan.priceYearly * 100)),
                  custom: tenant.customPriceYearly != null,
                },
                { label: "Max Users", value: fmtLimit(currentPlan.maxUsers) },
                { label: "Max Employees", value: fmtLimit(currentPlan.maxEmployees) },
              ].map(({ label, value, custom }) => (
                <div key={label}>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-sm font-semibold text-foreground mt-0.5 flex items-center gap-1">
                    {value}
                    {custom && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400 font-normal">custom</span>
                    )}
                  </p>
                </div>
              ))}
            </div>
            {currentPlan.description && (
              <p className="text-xs text-muted-foreground mt-4 pt-4 border-t border-border">{currentPlan.description}</p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="bg-muted/30 border border-border rounded-xl p-6 text-center space-y-3">
          <CreditCard className="w-8 h-8 text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">No subscription plan assigned to this tenant</p>
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>Assign Plan</Button>
        </div>
      )}

      {/* Custom Pricing Override */}
      <CustomPricingCard tenant={tenant} currentPlan={currentPlan} />

      {/* Billing Dates */}
      <Card className="bg-card border-card-border">
        <CardHeader className="pb-3 border-b border-border px-5 pt-5">
          <CardTitle className="text-sm font-semibold">Billing & Trial Dates</CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          {!editing ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[
                { label: "Trial Ends", value: fmtDate(tenant.trialEndsAt) },
                { label: "Subscription Start", value: fmtDate(tenant.subscriptionStartsAt) },
                { label: "Subscription End", value: fmtDate(tenant.subscriptionEndsAt) },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-sm font-medium text-foreground mt-0.5">{value}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Trial Ends</Label>
                <Input type="date" value={form.trialEndsAt} onChange={(e) => setForm({ ...form, trialEndsAt: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Subscription Start</Label>
                <Input type="date" value={form.subscriptionStartsAt} onChange={(e) => setForm({ ...form, subscriptionStartsAt: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Subscription End</Label>
                <Input type="date" value={form.subscriptionEndsAt} onChange={(e) => setForm({ ...form, subscriptionEndsAt: e.target.value })} />
              </div>
              <div className="col-span-full space-y-1.5">
                <Label className="text-xs">Change Plan</Label>
                <Select value={form.planId || "none"} onValueChange={(v) => setForm({ ...form, planId: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="No plan" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No plan</SelectItem>
                    {plans.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.name} ({p.type})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-full space-y-1.5">
                <Label className="text-xs">Reason for Change <span className="text-muted-foreground">(optional — recorded in audit log)</span></Label>
                <textarea
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                  rows={2}
                  placeholder="e.g. Customer requested upgrade via support ticket #1234"
                  value={changeReason}
                  onChange={(e) => setChangeReason(e.target.value)}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Modules & Features Tab ────────────────────────────────────────────────────
function ModulesTab({ tenant }: { tenant: TenantDetail }) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: config } = useQuery({
    queryKey: ["platform-tenant-config", tenant.id],
    queryFn: () => api.getTenantConfig(tenant.id),
  });

  const effectiveModules: string[] = config?.enabledModules ?? config?.planEnabledModules ?? [];
  const effectiveFeatures: string[] = config?.enabledFeatures ?? config?.planEnabledFeatures ?? [];
  const [localModules, setLocalModules] = useState<string[] | null>(null);
  const [localFeatures, setLocalFeatures] = useState<string[] | null>(null);
  const [limits, setLimits] = useState({
    customMaxUsers: String(tenant.customMaxUsers ?? ""),
    customMaxEmployees: String(tenant.customMaxEmployees ?? ""),
    customMaxBranches: String(tenant.customMaxBranches ?? ""),
    customMaxApiCalls: String(tenant.customMaxApiCalls ?? ""),
  });
  const [dirty, setDirty] = useState(false);

  const modules = localModules ?? effectiveModules;
  const features = localFeatures ?? effectiveFeatures;

  function toggleModule(id: string) {
    if (id === "core") return;
    const next = modules.includes(id) ? modules.filter((m) => m !== id) : [...modules, id];
    setLocalModules(next);
    setDirty(true);
  }
  function toggleFeature(id: string) {
    const next = features.includes(id) ? features.filter((f) => f !== id) : [...features, id];
    setLocalFeatures(next);
    setDirty(true);
  }

  const saveMutation = useMutation({
    mutationFn: () => api.updateTenantConfig(tenant.id, {
      enabledModules: localModules ?? effectiveModules,
      enabledFeatures: localFeatures ?? effectiveFeatures,
      customMaxUsers: limits.customMaxUsers ? Number(limits.customMaxUsers) : null,
      customMaxEmployees: limits.customMaxEmployees ? Number(limits.customMaxEmployees) : null,
      customMaxBranches: limits.customMaxBranches ? Number(limits.customMaxBranches) : null,
      customMaxApiCalls: limits.customMaxApiCalls ? Number(limits.customMaxApiCalls) : null,
    }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["platform-tenant-config", tenant.id] });
      void qc.invalidateQueries({ queryKey: ["platform-tenant", tenant.id] });
      toast({ title: "Configuration saved" });
      setDirty(false);
    },
    onError: (e: Error) => toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {config?.enabledModules == null && config?.planEnabledModules
            ? "Inheriting from plan — toggle to customise"
            : "Custom configuration for this tenant"}
        </p>
        <Button size="sm" className="h-8" onClick={() => saveMutation.mutate()} disabled={!dirty || saveMutation.isPending}>
          {saveMutation.isPending ? "Saving…" : dirty ? "Save Changes" : "Saved"}
        </Button>
      </div>

      {/* Modules */}
      <Card className="bg-card border-card-border">
        <CardHeader className="pb-3 border-b border-border px-5 pt-5">
          <CardTitle className="text-sm font-semibold">Modules ({modules.length}/{ALL_MODULES.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {ALL_MODULES.map((mod) => {
            const enabled = modules.includes(mod.id);
            return (
              <div key={mod.id} className={`flex items-start justify-between p-3 rounded-lg border transition-colors ${
                enabled ? "border-primary/30 bg-primary/5" : "border-border bg-muted/20"
              }`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium text-foreground">{mod.label}</p>
                    {mod.required && <span className="text-[10px] text-muted-foreground">(required)</span>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{mod.desc}</p>
                </div>
                <Switch checked={enabled} onCheckedChange={() => toggleModule(mod.id)}
                  disabled={mod.required} className="ml-3 flex-shrink-0" />
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Premium Features */}
      <Card className="bg-card border-card-border">
        <CardHeader className="pb-3 border-b border-border px-5 pt-5">
          <CardTitle className="text-sm font-semibold">Premium Features ({features.length}/{ALL_FEATURES.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {ALL_FEATURES.map((feat) => {
            const enabled = features.includes(feat.id);
            return (
              <div key={feat.id} className={`flex items-start justify-between p-3 rounded-lg border transition-colors ${
                enabled ? "border-primary/30 bg-primary/5" : "border-border bg-muted/20"
              }`}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{feat.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{feat.desc}</p>
                </div>
                <Switch checked={enabled} onCheckedChange={() => toggleFeature(feat.id)} className="ml-3 flex-shrink-0" />
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Custom Limits */}
      <Card className="bg-card border-card-border">
        <CardHeader className="pb-3 border-b border-border px-5 pt-5">
          <CardTitle className="text-sm font-semibold">Custom Limits <span className="text-muted-foreground font-normal text-xs ml-1">(leave blank to inherit from plan; use -1 for unlimited)</span></CardTitle>
        </CardHeader>
        <CardContent className="p-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { key: "customMaxUsers" as const, icon: Users, label: "Max Users", planVal: config?.planMaxUsers },
            { key: "customMaxEmployees" as const, icon: Building2, label: "Max Employees", planVal: config?.planMaxEmployees },
            { key: "customMaxBranches" as const, icon: GitBranch, label: "Max Branches", planVal: config?.planMaxBranches },
            { key: "customMaxApiCalls" as const, icon: Zap, label: "API Calls/Month", planVal: config?.planMaxApiCalls },
          ].map(({ key, icon: Icon, label, planVal }) => (
            <div key={key} className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Icon className="w-3 h-3 text-muted-foreground" />
                <Label className="text-xs">{label}</Label>
              </div>
              <Input type="number" min={-1} placeholder={planVal != null ? `Plan: ${fmtLimit(planVal)}` : "Unlimited"}
                value={limits[key]}
                onChange={(e) => { setLimits({ ...limits, [key]: e.target.value }); setDirty(true); }} />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Users Tab ────────────────────────────────────────────────────────────────
function UsersTab({ tenantId }: { tenantId: number }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [userForm, setUserForm] = useState({ email: "", name: "", password: "", role: "customer_admin" });
  const [userError, setUserError] = useState<string | null>(null);

  // Reset password state
  const [resetUser, setResetUser] = useState<{ id: number; name: string; email: string } | null>(null);
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [resetResult, setResetResult] = useState<string | null>(null);
  const [copiedPw, setCopiedPw] = useState(false);

  const { data: users, isLoading } = useQuery({
    queryKey: ["platform-tenant-users", tenantId],
    queryFn: () => api.listTenantUsers(tenantId),
  });

  const createMutation = useMutation({
    mutationFn: () => api.createTenantUser(tenantId, userForm),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["platform-tenant-users", tenantId] });
      void qc.invalidateQueries({ queryKey: ["platform-tenant", tenantId] });
      toast({ title: "User created successfully" });
      setCreateOpen(false);
      setUserForm({ email: "", name: "", password: "", role: "customer_admin" });
      setUserError(null);
    },
    onError: (e: Error) => setUserError(e.message),
  });

  const toggleUserMutation = useMutation({
    mutationFn: ({ userId, isActive }: { userId: number; isActive: boolean }) =>
      api.updateTenantUser(tenantId, userId, { isActive }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["platform-tenant-users", tenantId] }),
    onError: (e: Error) => toast({ title: "Update failed", description: e.message, variant: "destructive" }),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: ({ userId, newPassword }: { userId: number; newPassword?: string }) =>
      api.resetTenantUserPassword(tenantId, userId, newPassword || undefined),
    onSuccess: (data) => {
      setResetResult(data.newPassword);
      setResetNewPassword("");
    },
    onError: (e: Error) => toast({ title: "Reset failed", description: e.message, variant: "destructive" }),
  });

  function openResetDialog(u: { id: number; name: string; email: string }) {
    setResetUser(u);
    setResetNewPassword("");
    setResetResult(null);
    setCopiedPw(false);
  }

  function closeResetDialog() {
    setResetUser(null);
    setResetNewPassword("");
    setResetResult(null);
    setCopiedPw(false);
    resetPasswordMutation.reset();
  }

  function copyPassword(pw: string) {
    void navigator.clipboard.writeText(pw).then(() => {
      setCopiedPw(true);
      setTimeout(() => setCopiedPw(false), 2000);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{users ? `${users.total} user${users.total !== 1 ? "s" : ""}` : ""}</p>
        <Button size="sm" className="gap-2" onClick={() => { setCreateOpen(true); setUserError(null); }}>
          <Plus className="w-4 h-4" />Add User
        </Button>
      </div>

      <div className="bg-card border border-card-border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              {["Name", "Email", "Role", "Status", "Joined", ""].map((h) => (
                <TableHead key={h} className="text-muted-foreground text-xs uppercase tracking-wider font-medium">{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? Array.from({ length: 3 }).map((_, i) => (
              <TableRow key={i} className="border-border">
                <TableCell colSpan={6}><Skeleton className="h-5 w-full" /></TableCell>
              </TableRow>
            )) : users?.data.map((u) => (
              <TableRow key={u.id} className="border-border hover:bg-accent/20 transition-colors">
                <TableCell className="font-medium text-foreground">{u.name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={`text-xs ${ROLE_COLORS[u.role] ?? "bg-muted text-muted-foreground"}`}>
                    {u.role.replace(/_/g, " ")}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={u.isActive ? "default" : "secondary"}
                    className={u.isActive ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" : ""}>
                    {u.isActive ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{fmtDate(u.createdAt)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => toggleUserMutation.mutate({ userId: u.id, isActive: !u.isActive })}>
                      {u.isActive ? "Deactivate" : "Activate"}
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-amber-500"
                      onClick={() => openResetDialog(u)}>
                      <KeyRound className="w-3.5 h-3.5 mr-1" />Reset pw
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!isLoading && users?.data.length === 0 && (
          <div className="py-10 text-center text-sm text-muted-foreground">No users yet. Add the first admin.</div>
        )}
      </div>

      {/* ── Create User Dialog ─────────────────────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={(o) => { if (!o) setCreateOpen(false); }}>
        <DialogContent className="bg-card border-card-border sm:max-w-md">
          <DialogHeader><DialogTitle>Add User</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Full Name</Label>
              <Input placeholder="Jane Smith" value={userForm.name}
                onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Email Address</Label>
              <Input type="email" placeholder="jane@company.com" value={userForm.email}
                onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={userForm.role} onValueChange={(v) => setUserForm({ ...userForm, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["customer_admin","hr_manager","payroll_admin","employee"].map((r) => (
                    <SelectItem key={r} value={r}>{r.replace(/_/g, " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Temporary Password</Label>
              <Input type="password" placeholder="Min 8 characters" value={userForm.password}
                onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} />
            </div>
            {userError && <p className="text-sm text-destructive">{userError}</p>}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate()}
              disabled={!userForm.email || !userForm.name || userForm.password.length < 8 || createMutation.isPending}>
              {createMutation.isPending ? "Creating…" : "Create User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Reset Password Dialog ──────────────────────────────────────────── */}
      <Dialog open={!!resetUser} onOpenChange={(o) => { if (!o) closeResetDialog(); }}>
        <DialogContent className="bg-card border-card-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-amber-500" />
              Reset Password
            </DialogTitle>
          </DialogHeader>

          {resetResult ? (
            /* Show generated / set password */
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                Password for <span className="font-medium text-foreground">{resetUser?.name}</span> has been reset.
                Share this with the user — it will not be shown again.
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-muted/60 border border-border rounded-md px-3 py-2 text-sm font-mono tracking-wider text-foreground select-all">
                  {resetResult}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 gap-1.5"
                  onClick={() => copyPassword(resetResult)}
                >
                  {copiedPw ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedPw ? "Copied" : "Copy"}
                </Button>
              </div>
            </div>
          ) : (
            /* Form to reset */
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                Resetting password for <span className="font-medium text-foreground">{resetUser?.name}</span> ({resetUser?.email}).
                Leave blank to auto-generate a secure password.
              </p>
              <div className="space-y-1.5">
                <Label>New password <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Input
                  type="text"
                  placeholder="Auto-generate if empty"
                  value={resetNewPassword}
                  onChange={(e) => setResetNewPassword(e.target.value)}
                  autoComplete="off"
                />
                {resetNewPassword && resetNewPassword.length < 8 && (
                  <p className="text-xs text-destructive">Minimum 8 characters</p>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={closeResetDialog}>
              {resetResult ? "Close" : "Cancel"}
            </Button>
            {!resetResult && (
              <Button
                onClick={() => resetPasswordMutation.mutate({
                  userId: resetUser!.id,
                  newPassword: resetNewPassword || undefined,
                })}
                disabled={
                  resetPasswordMutation.isPending ||
                  (resetNewPassword.length > 0 && resetNewPassword.length < 8)
                }
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                {resetPasswordMutation.isPending ? "Resetting…" : "Reset Password"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Health Tab ────────────────────────────────────────────────────────────────
function HealthTab({ tenantId }: { tenantId: number }) {
  const { data: health, isLoading } = useQuery({
    queryKey: ["platform-tenant-health", tenantId],
    queryFn: () => api.getTenantHealth(tenantId),
    refetchInterval: 30_000,
  });

  if (isLoading) {
    return <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}</div>;
  }

  return (
    <div className="space-y-5">
      {/* User & Employee Health */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Users", value: health?.users.total ?? 0, icon: Users },
          { label: "Active Users", value: health?.users.active ?? 0, icon: CheckCircle2 },
          { label: "Total Employees", value: health?.employees.total ?? 0, icon: Building2 },
          { label: "Active Employees", value: health?.employees.active ?? 0, icon: CheckCircle2 },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label} className="bg-card border-card-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon className="w-4 h-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">{label}</p>
              </div>
              <p className="text-2xl font-bold text-foreground">{value.toLocaleString()}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* User Utilisation */}
      {(health?.users.total ?? 0) > 0 && (
        <Card className="bg-card border-card-border">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-foreground">User Utilisation</p>
              <span className="text-sm font-bold text-foreground">
                {Math.round(((health?.users.active ?? 0) / (health?.users.total || 1)) * 100)}%
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div className="h-2 rounded-full bg-emerald-500 transition-all"
                style={{ width: `${Math.round(((health?.users.active ?? 0) / (health?.users.total || 1)) * 100)}%` }} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">{health?.users.active} of {health?.users.total} users are active</p>
          </CardContent>
        </Card>
      )}

      {/* Role Breakdown */}
      {health?.roleBreakdown && health.roleBreakdown.length > 0 && (
        <Card className="bg-card border-card-border">
          <CardHeader className="pb-3 border-b border-border px-5 pt-5">
            <CardTitle className="text-sm font-semibold">Users by Role</CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-3">
            {health.roleBreakdown.map((r) => (
              <div key={r.role} className="flex items-center justify-between">
                <Badge variant="outline" className={`text-xs ${ROLE_COLORS[r.role] ?? "bg-muted text-muted-foreground"}`}>
                  {r.role.replace(/_/g, " ")}
                </Badge>
                <span className="text-sm font-semibold text-foreground">{r.count}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      <Card className="bg-card border-card-border">
        <CardHeader className="pb-3 border-b border-border px-5 pt-5">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <CardTitle className="text-sm font-semibold">Recent Activity</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {!health?.recentActivity?.length ? (
            <p className="text-sm text-muted-foreground text-center py-8">No activity recorded yet</p>
          ) : (
            <ul className="divide-y divide-border">
              {health.recentActivity.map((log) => (
                <li key={log.id} className="flex items-center justify-between px-5 py-3 hover:bg-accent/30 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono bg-muted text-muted-foreground flex-shrink-0">
                      {log.action}
                    </span>
                    {log.module && <span className="text-xs text-muted-foreground">{log.module}</span>}
                    {log.userEmail && <span className="text-xs text-muted-foreground truncate hidden sm:block">{log.userEmail}</span>}
                  </div>
                  <time className="text-xs text-muted-foreground flex-shrink-0 ml-3">{fmtDateTime(log.createdAt)}</time>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Billing Tab ──────────────────────────────────────────────────────────────

const INVOICE_STATUS_STYLES: Record<string, string> = {
  pending: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  paid: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  overdue: "bg-red-500/15 text-red-400 border-red-500/20",
  void: "bg-muted text-muted-foreground border-border",
};

const PAYMENT_METHODS = ["Bank Transfer", "NEFT", "RTGS", "UPI", "Credit Card", "Cheque", "Cash", "Other"];

function BillingTab({ tenantId }: { tenantId: number }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [payDialog, setPayDialog] = useState<{ open: boolean; invoice: Invoice | null }>({ open: false, invoice: null });
  const [editBilling, setEditBilling] = useState(false);
  const [confirmDlg, setConfirmDlg] = useState<{ open: boolean; label: string; onConfirm: () => void }>({ open: false, label: "", onConfirm: () => {} });

  const [createForm, setCreateForm] = useState({
    billingCycle: "monthly", amountCents: "", currency: "INR",
    billingPeriodStart: "", billingPeriodEnd: "", dueDate: "",
    notes: "", autoGenerate: true,
  });
  const [payForm, setPayForm] = useState({
    paymentMethod: "Bank Transfer", referenceNumber: "", notes: "",
    paymentDate: new Date().toISOString().split("T")[0],
  });
  const [billingForm, setBillingForm] = useState({ billingCycle: "monthly", gracePeriodDays: "7" });

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ["tenant-billing-summary", tenantId],
    queryFn: () => api.getTenantBillingSummary(tenantId),
  });
  const { data: invoicesData, isLoading: invoicesLoading } = useQuery({
    queryKey: ["tenant-invoices", tenantId],
    queryFn: () => api.listTenantInvoices(tenantId),
  });

  const createM = useMutation({
    mutationFn: () => api.createTenantInvoice(tenantId, {
      billingCycle: createForm.billingCycle,
      amountCents: createForm.autoGenerate ? undefined : Number(createForm.amountCents),
      currency: createForm.currency,
      billingPeriodStart: createForm.billingPeriodStart || undefined,
      billingPeriodEnd: createForm.billingPeriodEnd || undefined,
      dueDate: createForm.dueDate || undefined,
      notes: createForm.notes || undefined,
      autoGenerate: createForm.autoGenerate,
    }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["tenant-invoices", tenantId] });
      void qc.invalidateQueries({ queryKey: ["tenant-billing-summary", tenantId] });
      toast({ title: "Invoice created successfully" });
      setCreateOpen(false);
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const payM = useMutation({
    mutationFn: ({ id }: { id: number }) => api.payInvoice(id, {
      paymentMethod: payForm.paymentMethod,
      referenceNumber: payForm.referenceNumber || undefined,
      notes: payForm.notes || undefined,
      paymentDate: payForm.paymentDate || undefined,
    }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["tenant-invoices", tenantId] });
      void qc.invalidateQueries({ queryKey: ["tenant-billing-summary", tenantId] });
      void qc.invalidateQueries({ queryKey: ["platform-tenant", tenantId] });
      toast({ title: "Payment recorded", description: "Invoice marked as paid. Access restored if applicable." });
      setPayDialog({ open: false, invoice: null });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const voidM = useMutation({
    mutationFn: (id: number) => api.voidInvoice(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["tenant-invoices", tenantId] });
      void qc.invalidateQueries({ queryKey: ["tenant-billing-summary", tenantId] });
      toast({ title: "Invoice voided" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const billingM = useMutation({
    mutationFn: () => api.updateTenantBilling(tenantId, {
      billingCycle: billingForm.billingCycle,
      gracePeriodDays: Number(billingForm.gracePeriodDays),
    }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["tenant-billing-summary", tenantId] });
      void qc.invalidateQueries({ queryKey: ["platform-tenant", tenantId] });
      toast({ title: "Billing settings updated" });
      setEditBilling(false);
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const invoices = invoicesData?.data ?? [];
  const stats = summary?.stats;
  const grace = summary?.gracePeriodInfo;

  return (
    <div className="space-y-5">
      {/* Grace Period Warning */}
      {grace?.isExpired && (
        <div className={`flex items-start gap-3 p-4 rounded-lg border ${
          grace.isInGrace
            ? "bg-amber-500/10 border-amber-500/20"
            : "bg-red-500/10 border-red-500/20"
        }`}>
          <AlertTriangle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${grace.isInGrace ? "text-amber-400" : "text-red-400"}`} />
          <div>
            <p className={`text-sm font-medium ${grace.isInGrace ? "text-amber-300" : "text-red-300"}`}>
              {grace.isInGrace
                ? `Subscription expired — ${grace.gracePeriodDays - grace.daysOverdue} day(s) of grace period remaining`
                : `Subscription expired ${grace.daysOverdue} day(s) ago — grace period exceeded`}
            </p>
            <p className={`text-xs mt-0.5 ${grace.isInGrace ? "text-amber-400/70" : "text-red-400/70"}`}>
              {grace.isInGrace
                ? "Access is still active during grace period. Record a payment to restore the subscription."
                : "Tenant access should be suspended. Record a payment to restore full access immediately."}
            </p>
          </div>
        </div>
      )}

      {/* Billing Stats */}
      <div className="grid grid-cols-4 gap-3">
        {summaryLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-card border border-card-border rounded-lg p-4">
                <Skeleton className="h-3 w-20 mb-2" /><Skeleton className="h-6 w-28" />
              </div>
            ))
          : [
              { label: "Total Invoiced", value: fmtMoney(stats?.totalInvoiced ?? 0), icon: IndianRupee, color: "text-foreground" },
              { label: "Total Paid", value: fmtMoney(stats?.totalPaid ?? 0), icon: CheckCircle2, color: "text-emerald-400" },
              { label: "Outstanding", value: fmtMoney(stats?.totalOutstanding ?? 0), icon: TrendingUp, color: "text-blue-400" },
              { label: "Overdue", value: `${fmtMoney(stats?.totalOverdue ?? 0)} (${stats?.overdueCount ?? 0})`, icon: AlertTriangle, color: (stats?.overdueCount ?? 0) > 0 ? "text-red-400" : "text-muted-foreground" },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-card border border-card-border rounded-lg p-4">
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon className={`w-3 h-3 ${color}`} />
                  <span className="text-xs text-muted-foreground">{label}</span>
                </div>
                <p className={`text-base font-bold ${color}`}>{value}</p>
              </div>
            ))}
      </div>

      {/* Billing Settings */}
      <div className="bg-card border border-card-border rounded-lg">
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <p className="text-sm font-semibold">Billing Settings</p>
          {!editBilling ? (
            <Button size="sm" variant="outline" className="h-7 text-xs"
              onClick={() => {
                setBillingForm({
                  billingCycle: summary?.tenant.billingCycle ?? "monthly",
                  gracePeriodDays: String(summary?.tenant.gracePeriodDays ?? 7),
                });
                setEditBilling(true);
              }}>
              Edit
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditBilling(false)}>Cancel</Button>
              <Button size="sm" className="h-7 text-xs" onClick={() => billingM.mutate()} disabled={billingM.isPending}>
                {billingM.isPending ? "Saving…" : "Save"}
              </Button>
            </div>
          )}
        </div>
        <div className="p-5 grid grid-cols-3 gap-5">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Billing Cycle</p>
            {editBilling ? (
              <Select value={billingForm.billingCycle} onValueChange={v => setBillingForm(f => ({ ...f, billingCycle: v }))}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm text-foreground capitalize">{summary?.tenant.billingCycle ?? "monthly"}</p>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Grace Period (days)</p>
            {editBilling ? (
              <Input type="number" min={0} max={90} className="h-8 text-sm"
                value={billingForm.gracePeriodDays}
                onChange={e => setBillingForm(f => ({ ...f, gracePeriodDays: e.target.value }))} />
            ) : (
              <p className="text-sm text-foreground">{summary?.tenant.gracePeriodDays ?? 7} days</p>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Plan Price</p>
            <p className="text-sm text-foreground">
              {summary?.tenant.planName
                ? `${summary.tenant.planName} — ${fmtMoney(
                    (summary.tenant.billingCycle ?? "monthly") === "yearly"
                      ? (summary.tenant.planPriceYearly ?? 0)
                      : (summary.tenant.planPriceMonthly ?? 0)
                  )}/${(summary.tenant.billingCycle ?? "monthly") === "yearly" ? "yr" : "mo"}`
                : "No plan assigned"}
            </p>
          </div>
        </div>
      </div>

      {/* Invoices */}
      <div className="bg-card border border-card-border rounded-lg">
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <p className="text-sm font-semibold">Invoices ({invoices.length})</p>
          <Button size="sm" className="h-7 text-xs gap-1.5" onClick={() => {
            setCreateForm(f => ({
              ...f, autoGenerate: true, billingCycle: summary?.tenant.billingCycle ?? "monthly",
              billingPeriodStart: new Date().toISOString().split("T")[0], billingPeriodEnd: "", dueDate: "", amountCents: "", notes: "",
            }));
            setCreateOpen(true);
          }}>
            <Plus className="w-3 h-3" />Generate Invoice
          </Button>
        </div>

        {invoicesLoading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : invoices.length === 0 ? (
          <div className="py-10 text-center">
            <Receipt className="w-7 h-7 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No invoices yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Generate the first invoice for this tenant</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {invoices.map(inv => (
              <div key={inv.id} className="flex items-center justify-between px-5 py-3 hover:bg-muted/20 transition-colors">
                <div className="flex items-center gap-4 min-w-0">
                  <div>
                    <p className="text-sm font-mono font-medium text-foreground">{inv.invoiceNumber}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {inv.billingPeriodStart && inv.billingPeriodEnd
                        ? `${fmtDate(inv.billingPeriodStart)} – ${fmtDate(inv.billingPeriodEnd)}`
                        : fmtDate(inv.issuedAt)}
                      {inv.planName ? ` • ${inv.planName}` : ""}
                    </p>
                  </div>
                  <Badge variant="outline" className={`text-xs capitalize ${INVOICE_STATUS_STYLES[inv.status] ?? ""}`}>
                    {inv.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0">
                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground">{fmtMoney(inv.amountCents, inv.currency)}</p>
                    {inv.status !== "paid" && (
                      <p className={`text-xs ${inv.status === "overdue" ? "text-red-400" : "text-muted-foreground"}`}>
                        Due {fmtDate(inv.dueDate)}
                      </p>
                    )}
                    {inv.status === "paid" && <p className="text-xs text-emerald-400">Paid {fmtDate(inv.paidAt)}</p>}
                  </div>
                  <div className="flex gap-1">
                    {(inv.status === "pending" || inv.status === "overdue") && (
                      <Button size="sm" className="h-6 text-xs px-2 bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => {
                          setPayForm({ paymentMethod: "Bank Transfer", referenceNumber: "", notes: "", paymentDate: new Date().toISOString().split("T")[0] });
                          setPayDialog({ open: true, invoice: inv });
                        }}>
                        Pay
                      </Button>
                    )}
                    {inv.status !== "paid" && inv.status !== "void" && (
                      <Button size="sm" variant="ghost" className="h-6 text-xs px-1.5 text-muted-foreground hover:text-red-400"
                        onClick={() => setConfirmDlg({ open: true, label: `Void ${inv.invoiceNumber}? This cannot be undone.`, onConfirm: () => voidM.mutate(inv.id) })}>
                        <Ban className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Payments */}
      {(summary?.recentPayments?.length ?? 0) > 0 && (
        <div className="bg-card border border-card-border rounded-lg">
          <div className="px-5 py-3 border-b border-border">
            <p className="text-sm font-semibold">Recent Payments</p>
          </div>
          <div className="divide-y divide-border">
            {summary!.recentPayments.map(p => (
              <div key={p.id} className="flex items-center justify-between px-5 py-2.5 hover:bg-muted/20">
                <div>
                  <p className="text-sm text-foreground">{p.paymentMethod ?? "Payment"}</p>
                  <p className="text-xs text-muted-foreground">{fmtDate(p.paymentDate)}{p.referenceNumber ? ` • ${p.referenceNumber}` : ""}</p>
                </div>
                <p className="text-sm font-semibold text-emerald-400">{fmtMoney(p.amountCents, p.currency)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Invoice Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Generate Invoice</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
              <Switch
                checked={createForm.autoGenerate}
                onCheckedChange={v => setCreateForm(f => ({ ...f, autoGenerate: v }))}
              />
              <div>
                <p className="text-sm font-medium">Auto-generate from plan</p>
                <p className="text-xs text-muted-foreground">Use plan price and billing cycle</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Billing Cycle</Label>
                <Select value={createForm.billingCycle} onValueChange={v => setCreateForm(f => ({ ...f, billingCycle: v }))}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {!createForm.autoGenerate && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Amount (paise)</Label>
                  <Input type="number" className="h-8 text-sm" placeholder="e.g. 790000 = ₹7900"
                    value={createForm.amountCents}
                    onChange={e => setCreateForm(f => ({ ...f, amountCents: e.target.value }))} />
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Period Start</Label>
                <Input type="date" className="h-8 text-sm"
                  value={createForm.billingPeriodStart}
                  onChange={e => setCreateForm(f => ({ ...f, billingPeriodStart: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Due Date (optional)</Label>
                <Input type="date" className="h-8 text-sm"
                  value={createForm.dueDate}
                  onChange={e => setCreateForm(f => ({ ...f, dueDate: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Notes (optional)</Label>
              <Textarea className="text-sm min-h-[60px] resize-none" placeholder="Invoice notes…"
                value={createForm.notes}
                onChange={e => setCreateForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={() => createM.mutate()} disabled={createM.isPending}>
              {createM.isPending ? "Creating…" : "Create Invoice"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record Payment Dialog */}
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
                  <span className="text-muted-foreground">Amount Due</span>
                  <span className="font-semibold text-foreground">{fmtMoney(payDialog.invoice.amountCents, payDialog.invoice.currency)}</span>
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
                <Input className="h-8 text-sm" placeholder="UTR / TXN number"
                  value={payForm.referenceNumber}
                  onChange={e => setPayForm(f => ({ ...f, referenceNumber: e.target.value }))} />
              </div>
              {payDialog.invoice.status === "overdue" && (
                <div className="flex items-start gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-emerald-300">
                    Payment will clear overdue status and restore full tenant access immediately.
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setPayDialog({ open: false, invoice: null })}>Cancel</Button>
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700"
              disabled={payM.isPending}
              onClick={() => payDialog.invoice && payM.mutate({ id: payDialog.invoice.id })}>
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

// ─── Theme Tab ────────────────────────────────────────────────────────────────

const THEME_PRESETS: { key: string; name: string; primary: string; sidebar: string; hex: string }[] = [
  { key: "violet",  name: "Violet",  hex: "#7C3AED", primary: "262 83% 58%", sidebar: "258 54% 7%" },
  { key: "blue",    name: "Blue",    hex: "#2563EB", primary: "217 91% 60%", sidebar: "222 47% 7%" },
  { key: "indigo",  name: "Indigo",  hex: "#4F46E5", primary: "239 84% 65%", sidebar: "236 48% 7%" },
  { key: "teal",    name: "Teal",    hex: "#0D9488", primary: "174 76% 40%", sidebar: "174 50% 6%" },
  { key: "emerald", name: "Emerald", hex: "#059669", primary: "152 76% 40%", sidebar: "152 45% 6%" },
  { key: "rose",    name: "Rose",    hex: "#E11D48", primary: "347 77% 55%", sidebar: "345 40% 6%" },
  { key: "amber",   name: "Amber",   hex: "#D97706", primary: "38 92% 50%",  sidebar: "25 45% 6%"  },
  { key: "slate",   name: "Slate",   hex: "#475569", primary: "215 25% 55%", sidebar: "222 47% 6%" },
];

function ThemeTab({ tenant }: { tenant: TenantDetail }) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: config, isLoading } = useQuery({
    queryKey: ["platform-tenant-config", tenant.id],
    queryFn: () => api.getTenantConfig(tenant.id),
  });

  const currentPreset = (config?.themeConfig as ThemeConfig | null | undefined)?.preset ?? "violet";
  const [selected, setSelected] = useState<string | null>(null);
  const activePreset = selected ?? currentPreset;

  const saveMutation = useMutation({
    mutationFn: (preset: string) => api.updateTenantTheme(tenant.id, { preset }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["platform-tenant-config", tenant.id] });
      toast({ title: "Theme saved", description: "Tenant's app theme updated." });
      setSelected(null);
    },
    onError: (e: Error) => toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  if (isLoading) return <div className="text-sm text-muted-foreground py-6 text-center">Loading…</div>;

  const preview = THEME_PRESETS.find((p) => p.key === activePreset) ?? THEME_PRESETS[0];

  return (
    <div className="space-y-6">
      {/* Live preview strip */}
      <Card className="bg-card border-card-border overflow-hidden">
        <div className="flex h-16" style={{ backgroundColor: `hsl(${preview.sidebar})` }}>
          <div className="w-36 h-full flex items-center px-4 gap-2">
            <div className="w-5 h-5 rounded" style={{ backgroundColor: preview.hex }} />
            <span className="text-xs font-semibold" style={{ color: `hsl(${preview.primary})` }}>{tenant.name}</span>
          </div>
          <div className="flex-1 flex items-center px-4 gap-3">
            {["Dashboard","Employees","Payroll"].map((l) => (
              <div key={l} className="text-xs px-2 py-1 rounded" style={{ backgroundColor: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.7)" }}>{l}</div>
            ))}
          </div>
          <div className="flex items-center pr-4">
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: preview.hex }}>
              {tenant.name.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>
        <CardContent className="px-5 py-3 border-t border-border flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: preview.hex }} />
          <span className="text-xs text-muted-foreground">Live preview — <span className="font-medium text-foreground">{preview.name}</span> theme</span>
        </CardContent>
      </Card>

      {/* Preset picker */}
      <Card className="bg-card border-card-border">
        <CardHeader className="pb-3 border-b border-border px-5 pt-5">
          <CardTitle className="text-sm font-semibold">Choose a Theme Preset</CardTitle>
        </CardHeader>
        <CardContent className="p-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {THEME_PRESETS.map((preset) => {
            const isActive = activePreset === preset.key;
            return (
              <button
                key={preset.key}
                onClick={() => setSelected(preset.key)}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all cursor-pointer ${
                  isActive
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border bg-muted/20 hover:border-primary/40"
                }`}
              >
                <div className="flex gap-1.5">
                  <div className="w-7 h-7 rounded-full shadow-sm border border-white/10" style={{ backgroundColor: preset.hex }} />
                  <div className="w-7 h-7 rounded-full shadow-sm" style={{ backgroundColor: `hsl(${preset.sidebar})` }} />
                </div>
                <span className="text-xs font-medium text-foreground">{preset.name}</span>
                {isActive && <span className="text-[10px] text-primary font-semibold">Active</span>}
              </button>
            );
          })}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          onClick={() => saveMutation.mutate(activePreset)}
          disabled={saveMutation.isPending || (selected === null && activePreset === currentPreset)}
          className="h-9 px-6"
        >
          {saveMutation.isPending ? "Saving…" : "Apply Theme"}
        </Button>
      </div>
    </div>
  );
}

// ─── Payslip & ID Card Design Tab ──────────────────────────────────────────────

const DEFAULT_ID_CARD_FIELDS: IdCardFields = {
  photo: true, nameAndId: true, designationDept: true,
  bloodGroup: false, qrCode: true, emergencyContact: false, signatureLine: false,
};

const ID_CARD_FIELD_OPTIONS: { key: keyof IdCardFields; label: string }[] = [
  { key: "photo", label: "Photo" },
  { key: "nameAndId", label: "Name & Employee ID" },
  { key: "designationDept", label: "Designation & Department" },
  { key: "bloodGroup", label: "Blood Group" },
  { key: "qrCode", label: "QR Code (links to profile)" },
  { key: "emergencyContact", label: "Emergency Contact" },
  { key: "signatureLine", label: "Signature Line" },
];

function readFileAsDataUri(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function LogoUploadField({ value, onChange, label }: { value: string | null | undefined; onChange: (v: string | null) => void; label: string }) {
  const { toast } = useToast();
  return (
    <div className="space-y-2">
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-3">
        {value ? (
          <img src={value} alt="Logo" className="h-10 max-w-[120px] object-contain rounded border border-border bg-white p-1" />
        ) : (
          <div className="h-10 w-20 rounded border border-dashed border-border flex items-center justify-center text-[10px] text-muted-foreground">No logo</div>
        )}
        <input
          type="file"
          accept="image/png,image/jpeg"
          className="text-xs"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            if (file.size > 300_000) {
              toast({ title: "Image too large", description: "Please use an image under ~300KB.", variant: "destructive" });
              return;
            }
            onChange(await readFileAsDataUri(file));
          }}
        />
        {value && (
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onChange(null)}>Remove</Button>
        )}
      </div>
    </div>
  );
}

function PayslipIdCardTab({ tenant }: { tenant: TenantDetail }) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: config, isLoading } = useQuery({
    queryKey: ["platform-tenant-config", tenant.id],
    queryFn: () => api.getTenantConfig(tenant.id),
  });

  const [payslip, setPayslip] = useState<PayslipConfig | null>(null);
  const [idCard, setIdCard] = useState<IdCardConfig | null>(null);
  const [prefix, setPrefix] = useState<string>(tenant.employeeIdPrefix ?? "");
  const [dirty, setDirty] = useState(false);

  const effectivePayslip: PayslipConfig = payslip ?? (config as any)?.payslipConfig ?? {};
  const effectiveIdCard: IdCardConfig = idCard ?? (config as any)?.idCardConfig ?? { fields: DEFAULT_ID_CARD_FIELDS };
  const fields = effectiveIdCard.fields ?? DEFAULT_ID_CARD_FIELDS;

  const setPayslipField = <K extends keyof PayslipConfig>(k: K, v: PayslipConfig[K]) => {
    setPayslip({ ...effectivePayslip, [k]: v });
    setDirty(true);
  };
  const setIdCardField = <K extends keyof IdCardConfig>(k: K, v: IdCardConfig[K]) => {
    setIdCard({ ...effectiveIdCard, fields, [k]: v });
    setDirty(true);
  };
  const toggleField = (k: keyof IdCardFields) => {
    setIdCard({ ...effectiveIdCard, fields: { ...fields, [k]: !fields[k] } });
    setDirty(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Only PATCH the sections the admin actually touched. `payslip`/`idCard`
      // are null until their section is edited — sending the raw draft state
      // unconditionally would overwrite an untouched section with null and
      // wipe out previously saved config for it.
      const calls: Promise<unknown>[] = [];
      if (payslip !== null) calls.push(api.updateTenantPayslipConfig(tenant.id, payslip));
      if (idCard !== null) calls.push(api.updateTenantIdCardConfig(tenant.id, idCard));
      if (prefix !== (tenant.employeeIdPrefix ?? "")) {
        calls.push(api.updateTenantEmployeeIdPrefix(tenant.id, prefix.trim() ? prefix.trim().toUpperCase() : null));
      }
      await Promise.all(calls);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["platform-tenant-config", tenant.id] });
      void qc.invalidateQueries({ queryKey: ["platform-tenant", tenant.id] });
      toast({ title: "Saved", description: "Payslip & ID card design updated for this tenant." });
      setDirty(false);
      setPayslip(null);
      setIdCard(null);
    },
    onError: (e: Error) => toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  if (isLoading) return <div className="text-sm text-muted-foreground py-6 text-center">Loading…</div>;

  const brandColor = effectiveIdCard.brandColorHex || "#3b82f6";

  return (
    <div className="space-y-6">
      {/* Payslip letterhead */}
      <Card className="bg-card border-card-border">
        <CardHeader className="pb-3 border-b border-border px-5 pt-5">
          <CardTitle className="text-sm font-semibold flex items-center gap-2"><FileText className="w-4 h-4" />Payslip Letterhead</CardTitle>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          <p className="text-xs text-muted-foreground -mt-1">Leave blank to keep the platform default letterhead ("Automystics Technologies").</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Company Name</Label>
              <Input placeholder="Automystics Technologies" value={effectivePayslip.companyName ?? ""} onChange={e => setPayslipField("companyName", e.target.value)} className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Brand Color</Label>
              <div className="flex items-center gap-2">
                <input type="color" value={effectivePayslip.brandColorHex || "#1e293b"} onChange={e => setPayslipField("brandColorHex", e.target.value)} className="h-9 w-12 rounded border border-border bg-transparent" />
                <Input value={effectivePayslip.brandColorHex ?? ""} placeholder="#1e293b" onChange={e => setPayslipField("brandColorHex", e.target.value)} className="h-9" />
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Address Line</Label>
            <Input placeholder="123 Business Park, Bengaluru" value={effectivePayslip.addressLine1 ?? ""} onChange={e => setPayslipField("addressLine1", e.target.value)} className="h-9" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Footer Note</Label>
            <Input placeholder="This is a system-generated payslip." value={effectivePayslip.footerNote ?? ""} onChange={e => setPayslipField("footerNote", e.target.value)} className="h-9" />
          </div>
          <LogoUploadField label="Logo" value={effectivePayslip.logoDataUri} onChange={v => setPayslipField("logoDataUri", v)} />
        </CardContent>
      </Card>

      {/* ID card design */}
      <Card className="bg-card border-card-border">
        <CardHeader className="pb-3 border-b border-border px-5 pt-5">
          <CardTitle className="text-sm font-semibold flex items-center gap-2"><CreditCard className="w-4 h-4" />Employee ID Card Design</CardTitle>
        </CardHeader>
        <CardContent className="p-5 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Card Title</Label>
              <Input placeholder="EMPLOYEE ID CARD" value={effectiveIdCard.cardTitle ?? ""} onChange={e => setIdCardField("cardTitle", e.target.value)} className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Company Name</Label>
              <Input placeholder="AUTOMYSTICS TECHNOLOGIES" value={effectiveIdCard.companyName ?? ""} onChange={e => setIdCardField("companyName", e.target.value)} className="h-9" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Brand Color</Label>
            <div className="flex items-center gap-2">
              <input type="color" value={brandColor} onChange={e => setIdCardField("brandColorHex", e.target.value)} className="h-9 w-12 rounded border border-border bg-transparent" />
              <Input value={effectiveIdCard.brandColorHex ?? ""} placeholder="#3b82f6" onChange={e => setIdCardField("brandColorHex", e.target.value)} className="h-9 max-w-[160px]" />
            </div>
          </div>
          <LogoUploadField label="Logo" value={effectiveIdCard.logoDataUri} onChange={v => setIdCardField("logoDataUri", v)} />

          <div className="space-y-2">
            <Label className="text-xs">Fields shown on the card</Label>
            <div className="grid grid-cols-2 gap-2">
              {ID_CARD_FIELD_OPTIONS.map(opt => (
                <label key={opt.key} className="flex items-center gap-2 text-xs p-2 rounded-lg border border-border bg-muted/20 cursor-pointer">
                  <Switch checked={!!fields[opt.key]} onCheckedChange={() => toggleField(opt.key)} />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          {/* Live preview */}
          <div className="flex justify-center pt-2">
            <div className="w-[220px] rounded-2xl overflow-hidden shadow-lg" style={{ backgroundColor: "#1e2d4c" }}>
              <div className="h-2" style={{ backgroundColor: brandColor }} />
              <div className="text-center pt-3 pb-1">
                {effectiveIdCard.logoDataUri
                  ? <img src={effectiveIdCard.logoDataUri} className="h-6 mx-auto object-contain" />
                  : <div className="text-white text-xs font-bold">{effectiveIdCard.companyName || "AUTOMYSTICS TECHNOLOGIES"}</div>}
                <div className="text-[9px] text-slate-400 mt-1 tracking-wide">{effectiveIdCard.cardTitle || "EMPLOYEE ID CARD"}</div>
              </div>
              {fields.photo && <div className="w-16 h-16 mx-auto my-2 rounded bg-slate-700 flex items-center justify-center text-[9px] text-slate-400">PHOTO</div>}
              {fields.nameAndId && <div className="text-center text-white text-sm font-semibold">Jane Doe</div>}
              {fields.designationDept && <div className="text-center text-[10px] mt-0.5" style={{ color: brandColor }}>Software Engineer</div>}
              <div className="border-t border-slate-700 my-3 mx-5" />
              <div className="px-5 space-y-1.5 text-[10px]">
                <div className="flex justify-between text-slate-300"><span className="text-slate-500">Employee ID</span><span>{tenant.employeeIdPrefix || "EMP"}-1024</span></div>
                {fields.bloodGroup && <div className="flex justify-between text-slate-300"><span className="text-slate-500">Blood Group</span><span>O+</span></div>}
                {fields.emergencyContact && <div className="flex justify-between text-slate-300"><span className="text-slate-500">Emergency</span><span>John — 98XXXXXXXX</span></div>}
              </div>
              {fields.qrCode && <div className="flex justify-center py-3"><div className="w-14 h-14 bg-white rounded" /></div>}
              {fields.signatureLine && <div className="mx-8 mb-4 border-t border-slate-500 text-center text-[8px] text-slate-500 pt-1">Authorized Signature</div>}
              {!fields.qrCode && !fields.signatureLine && <div className="h-4" />}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Employee ID prefix */}
      <Card className="bg-card border-card-border">
        <CardHeader className="pb-3 border-b border-border px-5 pt-5">
          <CardTitle className="text-sm font-semibold">Employee ID Prefix</CardTitle>
        </CardHeader>
        <CardContent className="p-5 space-y-2">
          <p className="text-xs text-muted-foreground">
            Optional validation hint. When set, new employee IDs must start with this prefix. IDs are still entered manually — this does not auto-generate or auto-increment them.
          </p>
          <Input placeholder="e.g. EMP-" value={prefix} onChange={e => { setPrefix(e.target.value); setDirty(true); }} className="h-9 max-w-[200px]" />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !dirty} className="h-9 px-6">
          {saveMutation.isPending ? "Saving…" : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export function TenantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const tenantId = Number(id);
  const qc = useQueryClient();

  const { data: tenant, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["platform-tenant", tenantId],
    queryFn: () => api.getTenant(tenantId),
    enabled: !!tenantId,
    retry: (failureCount, err) => (err as { status?: number })?.status !== 404 && failureCount < 2,
  });

  const { data: plansData } = useQuery({
    queryKey: ["platform-plans"],
    queryFn: () => api.listPlans(),
  });

  if (isLoading) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError) {
    const status = (error as { status?: number } | undefined)?.status;
    const isNotFound = status === 404;
    return (
      <div className="p-6 max-w-md mx-auto text-center space-y-3">
        <p className="text-sm text-muted-foreground">
          {isNotFound
            ? "This tenant doesn't exist or was removed."
            : "Something went wrong loading this tenant. This is usually temporary — please try again."}
        </p>
        <div className="flex items-center justify-center gap-3">
          {!isNotFound && (
            <Button size="sm" variant="outline" onClick={() => void refetch()} disabled={isFetching}>
              {isFetching ? "Retrying…" : "Try again"}
            </Button>
          )}
          <Link href="/tenants" className="text-sm text-primary hover:underline">Back to tenants</Link>
        </div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Tenant not found.{" "}
        <Link href="/tenants" className="text-primary hover:underline">Back to tenants</Link>
      </div>
    );
  }

  const plans = plansData?.data ?? [];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link href="/tenants" className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="w-4 h-4" />Tenants
        </Link>
        <span className="text-border">/</span>
        <span className="text-foreground font-medium">{tenant.name}</span>
      </div>

      {/* Header Card */}
      <div className="bg-card border border-card-border rounded-xl p-5">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-lg font-semibold text-foreground">{tenant.name}</h1>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <code className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{tenant.slug}</code>
              <Badge variant="outline" className={`text-xs capitalize ${STATUS_STYLES[tenant.status] ?? ""}`}>
                {tenant.status}
              </Badge>
              {tenant.planName && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PLAN_STYLES[tenant.planType ?? ""] ?? "bg-muted text-muted-foreground"}`}>
                  {tenant.planName}
                </span>
              )}
              {tenant.industry && <span className="text-xs text-muted-foreground">{tenant.industry}</span>}
              {tenant.country && <span className="text-xs text-muted-foreground">{tenant.country}</span>}
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-2xl font-bold text-foreground">{tenant.userCount ?? 0}</p>
              <p className="text-xs text-muted-foreground">Users</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-foreground">{tenant.employeeCount ?? 0}</p>
              <p className="text-xs text-muted-foreground">Employees</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="bg-muted border border-border">
          <TabsTrigger value="overview" className="gap-1.5 text-xs">
            <Building2 className="w-3.5 h-3.5" />Overview
          </TabsTrigger>
          <TabsTrigger value="subscription" className="gap-1.5 text-xs">
            <CreditCard className="w-3.5 h-3.5" />Subscription
          </TabsTrigger>
          <TabsTrigger value="modules" className="gap-1.5 text-xs">
            <Settings className="w-3.5 h-3.5" />Modules & Features
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-1.5 text-xs">
            <Users className="w-3.5 h-3.5" />Users
          </TabsTrigger>
          <TabsTrigger value="billing" className="gap-1.5 text-xs">
            <Receipt className="w-3.5 h-3.5" />Billing
          </TabsTrigger>
          <TabsTrigger value="theme" className="gap-1.5 text-xs">
            <Palette className="w-3.5 h-3.5" />Theme
          </TabsTrigger>
          <TabsTrigger value="payslip-idcard" className="gap-1.5 text-xs">
            <CreditCard className="w-3.5 h-3.5" />Payslip & ID Card
          </TabsTrigger>
          <TabsTrigger value="health" className="gap-1.5 text-xs">
            <Activity className="w-3.5 h-3.5" />Health
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-5">
          <OverviewTab tenant={tenant} plans={plans} onRefresh={() => void refetch()} />
        </TabsContent>
        <TabsContent value="subscription" className="mt-5">
          <SubscriptionTab tenant={tenant} plans={plans} />
        </TabsContent>
        <TabsContent value="modules" className="mt-5">
          <ModulesTab tenant={tenant} />
        </TabsContent>
        <TabsContent value="users" className="mt-5">
          <UsersTab tenantId={tenantId} />
        </TabsContent>
        <TabsContent value="billing" className="mt-5">
          <BillingTab tenantId={tenantId} />
        </TabsContent>
        <TabsContent value="theme" className="mt-5">
          <ThemeTab tenant={tenant} />
        </TabsContent>
        <TabsContent value="payslip-idcard" className="mt-5">
          <PayslipIdCardTab tenant={tenant} />
        </TabsContent>
        <TabsContent value="health" className="mt-5">
          <HealthTab tenantId={tenantId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
