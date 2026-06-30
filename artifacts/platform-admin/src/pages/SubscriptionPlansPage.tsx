import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, SubscriptionPlan } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Users, Building2, GitBranch, Zap, CreditCard } from "lucide-react";

const PLAN_TYPES = ["trial","starter","professional","enterprise","custom"] as const;
const PLAN_COLORS: Record<string, string> = {
  trial: "bg-slate-500/15 text-slate-400 border-slate-500/20",
  starter: "bg-green-500/15 text-green-400 border-green-500/20",
  professional: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  enterprise: "bg-purple-500/15 text-purple-400 border-purple-500/20",
  custom: "bg-orange-500/15 text-orange-400 border-orange-500/20",
};

const ALL_MODULES = [
  { id: "core", label: "Core HR" },
  { id: "recruitment", label: "Recruitment" },
  { id: "onboarding", label: "Onboarding" },
  { id: "attendance", label: "Attendance" },
  { id: "leave", label: "Leave Management" },
  { id: "payroll", label: "Payroll" },
  { id: "performance", label: "Performance" },
  { id: "helpdesk", label: "Help Desk" },
  { id: "documents", label: "Documents" },
  { id: "analytics", label: "Analytics" },
  { id: "exit", label: "Exit Management" },
];

const ALL_FEATURES = [
  { id: "api_access", label: "API Access" },
  { id: "sso", label: "Single Sign-On" },
  { id: "custom_branding", label: "Custom Branding" },
  { id: "advanced_analytics", label: "Advanced Analytics" },
  { id: "bulk_import", label: "Bulk Import/Export" },
  { id: "webhooks", label: "Webhooks" },
  { id: "custom_workflows", label: "Custom Workflows" },
  { id: "ai_insights", label: "AI Insights" },
];

function fmt$(cents: number) {
  if (cents === 0) return "Free";
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 0 })}`;
}
function fmtLimit(v: number) { return v === -1 ? "Unlimited" : v.toLocaleString(); }

const emptyForm = {
  name: "", type: "starter", priceMonthly: 0, priceYearly: 0,
  maxUsers: 10, maxEmployees: 50, maxBranches: 1, maxApiCalls: 10000,
  enabledModules: ["core"] as string[], enabledFeatures: [] as string[],
  description: "", offerText: "", badgeText: "", isFeatured: false, sortOrder: 0,
};

export function SubscriptionPlansPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [editPlan, setEditPlan] = useState<SubscriptionPlan | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmDlg, setConfirmDlg] = useState<{ open: boolean; label: string; onConfirm: () => void }>({ open: false, label: "", onConfirm: () => {} });

  const { data, isLoading } = useQuery({
    queryKey: ["platform-plans"],
    queryFn: () => api.listPlans(),
  });

  const createMutation = useMutation({
    mutationFn: () => api.createPlan({ ...form }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["platform-plans"] }); setCreateOpen(false); resetForm(); },
    onError: (e: Error) => setFormError(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: () => api.updatePlan(editPlan!.id, { ...form }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["platform-plans"] }); setEditPlan(null); },
    onError: (e: Error) => setFormError(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.deletePlan(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["platform-plans"] }),
    onError: (e: Error) => toast({ title: "Delete failed", description: e.message, variant: "destructive" }),
  });

  function resetForm() {
    setForm({ ...emptyForm });
    setFormError(null);
  }

  function openEdit(p: SubscriptionPlan) {
    setEditPlan(p);
    setForm({
      name: p.name, type: p.type,
      priceMonthly: p.priceMonthly, priceYearly: p.priceYearly,
      maxUsers: p.maxUsers, maxEmployees: p.maxEmployees,
      maxBranches: p.maxBranches, maxApiCalls: p.maxApiCalls,
      enabledModules: Array.isArray(p.enabledModules) ? p.enabledModules : [],
      enabledFeatures: Array.isArray(p.enabledFeatures) ? p.enabledFeatures : [],
      description: p.description ?? "",
      offerText: p.offerText ?? "", badgeText: p.badgeText ?? "",
      isFeatured: p.isFeatured ?? false, sortOrder: p.sortOrder ?? 0,
    });
    setFormError(null);
  }

  function toggleModule(id: string) {
    setForm((f) => ({
      ...f,
      enabledModules: f.enabledModules.includes(id)
        ? f.enabledModules.filter((m) => m !== id)
        : [...f.enabledModules, id],
    }));
  }

  function toggleFeature(id: string) {
    setForm((f) => ({
      ...f,
      enabledFeatures: f.enabledFeatures.includes(id)
        ? f.enabledFeatures.filter((m) => m !== id)
        : [...f.enabledFeatures, id],
    }));
  }

  const isOpen = createOpen || !!editPlan;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Subscription Plans</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Define pricing tiers, limits, and feature access for tenants</p>
        </div>
        <Button size="sm" className="gap-2" onClick={() => { setCreateOpen(true); resetForm(); }}>
          <Plus className="w-4 h-4" />New Plan
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-56 w-full rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data?.data.map((plan) => (
            <Card key={plan.id} className="bg-card border-card-border hover:border-primary/30 transition-colors">
              <CardContent className="p-5 space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Badge variant="outline" className={`text-xs capitalize ${PLAN_COLORS[plan.type] ?? ""}`}>
                        {plan.type}
                      </Badge>
                      {plan.isFeatured && (
                        <Badge variant="outline" className="text-xs bg-amber-500/15 text-amber-400 border-amber-500/25">★ Featured</Badge>
                      )}
                      {plan.badgeText && (
                        <Badge variant="outline" className="text-xs bg-sky-500/15 text-sky-400 border-sky-500/25">{plan.badgeText}</Badge>
                      )}
                      {plan.tenantCount !== undefined && (
                        <span className="text-xs text-muted-foreground">{plan.tenantCount} tenant{plan.tenantCount !== 1 ? "s" : ""}</span>
                      )}
                    </div>
                    {plan.offerText && (
                      <p className="text-xs text-emerald-400 font-medium mt-1">{plan.offerText}</p>
                    )}
                    <h3 className="text-base font-semibold text-foreground">{plan.name}</h3>
                    {plan.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{plan.description}</p>}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground"
                      onClick={() => openEdit(plan)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => setConfirmDlg({ open: true, label: `Delete plan "${plan.name}"? This cannot be undone.`, onConfirm: () => deleteMutation.mutate(plan.id) })}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Pricing */}
                <div className="flex gap-4">
                  <div>
                    <p className="text-2xl font-bold text-foreground">{fmt$(plan.priceMonthly)}</p>
                    <p className="text-xs text-muted-foreground">/ month</p>
                  </div>
                  {plan.priceYearly > 0 && (
                    <div>
                      <p className="text-lg font-semibold text-foreground">{fmt$(plan.priceYearly)}</p>
                      <p className="text-xs text-muted-foreground">/ year</p>
                    </div>
                  )}
                </div>

                {/* Limits */}
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { icon: Users, label: "Users", val: fmtLimit(plan.maxUsers) },
                    { icon: Building2, label: "Employees", val: fmtLimit(plan.maxEmployees) },
                    { icon: GitBranch, label: "Branches", val: fmtLimit(plan.maxBranches) },
                    { icon: Zap, label: "API calls/mo", val: fmtLimit(plan.maxApiCalls) },
                  ].map(({ icon: Icon, label, val }) => (
                    <div key={label} className="flex items-center gap-1.5 bg-muted/40 rounded-md px-2 py-1.5">
                      <Icon className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                      <span className="text-xs text-muted-foreground truncate">{label}</span>
                      <span className="text-xs font-semibold text-foreground ml-auto">{val}</span>
                    </div>
                  ))}
                </div>

                {/* Modules */}
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5 font-medium">Modules ({(Array.isArray(plan.enabledModules) ? plan.enabledModules : []).length}/{ALL_MODULES.length})</p>
                  <div className="flex flex-wrap gap-1">
                    {(Array.isArray(plan.enabledModules) ? plan.enabledModules : []).slice(0, 6).map((m) => {
                      const mod = ALL_MODULES.find((x) => x.id === m);
                      return <span key={m} className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{mod?.label ?? m}</span>;
                    })}
                    {(Array.isArray(plan.enabledModules) ? plan.enabledModules : []).length > 6 && (
                      <span className="text-[10px] text-muted-foreground">+{(Array.isArray(plan.enabledModules) ? plan.enabledModules : []).length - 6} more</span>
                    )}
                  </div>
                </div>

                {/* Features */}
                {(Array.isArray(plan.enabledFeatures) ? plan.enabledFeatures : []).length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1.5 font-medium">Premium Features</p>
                    <div className="flex flex-wrap gap-1">
                      {(Array.isArray(plan.enabledFeatures) ? plan.enabledFeatures : []).map((f) => {
                        const feat = ALL_FEATURES.find((x) => x.id === f);
                        return <span key={f} className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">{feat?.label ?? f}</span>;
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={isOpen} onOpenChange={(o) => { if (!o) { setCreateOpen(false); setEditPlan(null); resetForm(); } }}>
        <DialogContent className="bg-card border-card-border sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              {editPlan ? `Edit Plan: ${editPlan.name}` : "Create Subscription Plan"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Basic */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Plan Name *</Label>
                <Input placeholder="Professional" value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Plan Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PLAN_TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Monthly Price (cents)</Label>
                <Input type="number" min={0} value={form.priceMonthly}
                  onChange={(e) => setForm({ ...form, priceMonthly: Number(e.target.value) })} />
                <p className="text-xs text-muted-foreground">{fmt$(form.priceMonthly)}/mo</p>
              </div>
              <div className="space-y-1.5">
                <Label>Yearly Price (cents)</Label>
                <Input type="number" min={0} value={form.priceYearly}
                  onChange={(e) => setForm({ ...form, priceYearly: Number(e.target.value) })} />
                <p className="text-xs text-muted-foreground">{fmt$(form.priceYearly)}/yr</p>
              </div>
            </div>

            {/* Limits */}
            <div>
              <Label className="mb-3 block">Resource Limits <span className="text-muted-foreground font-normal text-xs">(use -1 for unlimited)</span></Label>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { key: "maxUsers" as const, label: "Max Users" },
                  { key: "maxEmployees" as const, label: "Max Employees" },
                  { key: "maxBranches" as const, label: "Max Branches" },
                  { key: "maxApiCalls" as const, label: "Max API Calls/Month" },
                ].map(({ key, label }) => (
                  <div key={key} className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">{label}</Label>
                    <Input type="number" min={-1} value={form[key]}
                      onChange={(e) => setForm({ ...form, [key]: Number(e.target.value) })} />
                  </div>
                ))}
              </div>
            </div>

            {/* Modules */}
            <div>
              <Label className="mb-3 block">Enabled Modules</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {ALL_MODULES.map((mod) => (
                  <label key={mod.id} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <Checkbox checked={form.enabledModules.includes(mod.id)}
                      onCheckedChange={() => toggleModule(mod.id)} />
                    <span className="text-xs text-foreground">{mod.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Features */}
            <div>
              <Label className="mb-3 block">Premium Features</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {ALL_FEATURES.map((feat) => (
                  <label key={feat.id} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <Checkbox checked={form.enabledFeatures.includes(feat.id)}
                      onCheckedChange={() => toggleFeature(feat.id)} />
                    <span className="text-xs text-foreground">{feat.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea placeholder="Brief description shown to tenants…" rows={2} value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>

            {/* Landing Page Controls */}
            <div className="border border-border rounded-lg p-4 space-y-4">
              <p className="text-sm font-semibold text-foreground">🌐 Landing Page Controls</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Badge Text <span className="text-muted-foreground font-normal text-xs">(shown on plan card)</span></Label>
                  <Input placeholder='e.g. "Most Popular" or "Best Value"' value={form.badgeText}
                    onChange={(e) => setForm({ ...form, badgeText: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Sort Order <span className="text-muted-foreground font-normal text-xs">(lower = first)</span></Label>
                  <Input type="number" min={0} value={form.sortOrder}
                    onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Offer Text <span className="text-muted-foreground font-normal text-xs">(promotional callout, optional)</span></Label>
                <Input placeholder='e.g. "🎉 Limited time: 3 months free on annual plan!"' value={form.offerText}
                  onChange={(e) => setForm({ ...form, offerText: e.target.value })} />
              </div>
              <label className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-muted/50 transition-colors">
                <Checkbox checked={form.isFeatured}
                  onCheckedChange={(v) => setForm({ ...form, isFeatured: !!v })} />
                <div>
                  <span className="text-sm font-medium text-foreground">Featured / Highlighted</span>
                  <p className="text-xs text-muted-foreground">Visually emphasise this plan on the landing page pricing section</p>
                </div>
              </label>
            </div>
          </div>

          {formError && <p className="text-sm text-destructive">{formError}</p>}
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setCreateOpen(false); setEditPlan(null); resetForm(); }}>Cancel</Button>
            <Button
              onClick={() => editPlan ? updateMutation.mutate() : createMutation.mutate()}
              disabled={!form.name || createMutation.isPending || updateMutation.isPending}>
              {(createMutation.isPending || updateMutation.isPending) ? "Saving…" : editPlan ? "Save Changes" : "Create Plan"}
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
