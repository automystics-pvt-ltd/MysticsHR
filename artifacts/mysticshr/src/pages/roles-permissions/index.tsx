import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Lock, RotateCcw, Save, ChevronDown, ChevronRight, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { MODULE_REGISTRY, PERMISSION_ACTIONS, type PermissionAction } from "@/lib/module-registry";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${BASE}/api${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

const ROLE_LABELS: Record<string, string> = {
  customer_admin: "Customer Admin",
  hr_manager: "HR Manager",
  hr_executive: "HR Executive",
  hod: "Head of Department",
  payroll_admin: "Payroll Admin",
  employee: "Employee",
};

const EDITABLE_ROLES = ["hr_manager", "hr_executive", "hod", "payroll_admin", "employee"];

const ACTION_LABELS: Record<string, string> = {
  view: "View",
  create: "Create",
  edit: "Edit",
  delete: "Delete",
  approve: "Approve",
  export: "Export",
  print: "Print",
  reports: "Reports",
  settings: "Settings",
  admin: "Admin",
};

type PermMatrix = Record<string, Record<string, string[]>>;

type LocalMatrix = Record<string, Record<string, boolean>>;

function matrixToLocal(matrix: PermMatrix, roleSlug: string): LocalMatrix {
  const local: LocalMatrix = {};
  const rolePerms = matrix[roleSlug] ?? {};
  for (const mod of MODULE_REGISTRY) {
    local[mod.key] = {};
    const granted = rolePerms[mod.key] ?? [];
    for (const action of PERMISSION_ACTIONS) {
      local[mod.key][action] = granted.includes(action);
    }
  }
  return local;
}

function localToPermissions(local: LocalMatrix): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const [moduleKey, actions] of Object.entries(local)) {
    result[moduleKey] = Object.entries(actions)
      .filter(([, granted]) => granted)
      .map(([action]) => action);
  }
  return result;
}

const groupedModules = (() => {
  const groups: Record<string, typeof MODULE_REGISTRY[number][]> = {};
  for (const mod of MODULE_REGISTRY) {
    if (!groups[mod.group]) groups[mod.group] = [];
    groups[mod.group].push(mod);
  }
  return groups;
})();

export default function RolesPermissionsPage() {
  const [selectedRole, setSelectedRole] = useState("hr_manager");
  const [local, setLocal] = useState<LocalMatrix>({});
  const [isDirty, setIsDirty] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const qc = useQueryClient();

  const { data: matrix, isLoading } = useQuery<PermMatrix>({
    queryKey: ["rbac", "permissions"],
    queryFn: () => apiFetch("/rbac/permissions"),
    staleTime: 60_000,
  });

  useEffect(() => {
    if (matrix) {
      setLocal(matrixToLocal(matrix, selectedRole));
      setIsDirty(false);
    }
  }, [matrix, selectedRole]);

  const saveMutation = useMutation({
    mutationFn: async () =>
      apiFetch("/rbac/permissions", {
        method: "PUT",
        body: JSON.stringify({ roleSlug: selectedRole, permissions: localToPermissions(local) }),
      }),
    onSuccess: () => {
      toast.success("Permissions saved");
      qc.invalidateQueries({ queryKey: ["rbac"] });
      setIsDirty(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const resetMutation = useMutation({
    mutationFn: async () =>
      apiFetch("/rbac/permissions/reset", {
        method: "POST",
        body: JSON.stringify({ roleSlug: selectedRole }),
      }),
    onSuccess: () => {
      toast.success("Reset to defaults");
      qc.invalidateQueries({ queryKey: ["rbac"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const toggle = useCallback((moduleKey: string, action: string) => {
    setLocal((prev) => ({
      ...prev,
      [moduleKey]: { ...prev[moduleKey], [action]: !prev[moduleKey]?.[action] },
    }));
    setIsDirty(true);
  }, []);

  const toggleAllActions = useCallback((moduleKey: string, checked: boolean) => {
    setLocal((prev) => ({
      ...prev,
      [moduleKey]: Object.fromEntries(PERMISSION_ACTIONS.map((a) => [a, checked])),
    }));
    setIsDirty(true);
  }, []);

  const toggleAllModules = useCallback((action: string, checked: boolean) => {
    setLocal((prev) => {
      const next = { ...prev };
      for (const mod of MODULE_REGISTRY) {
        next[mod.key] = { ...next[mod.key], [action]: checked };
      }
      return next;
    });
    setIsDirty(true);
  }, []);

  const isReadOnlyRole = selectedRole === "customer_admin";

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Lock className="w-6 h-6 text-primary" />
              Roles & Permissions
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Configure what each role can do across all modules. New modules appear here automatically.
            </p>
          </div>
          {!isReadOnlyRole && (
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => resetMutation.mutate()}
                disabled={resetMutation.isPending}
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                Reset to Defaults
              </Button>
              <Button
                size="sm"
                onClick={() => saveMutation.mutate()}
                disabled={!isDirty || saveMutation.isPending}
              >
                <Save className="w-3.5 h-3.5 mr-1.5" />
                {saveMutation.isPending ? "Saving…" : "Save Changes"}
              </Button>
            </div>
          )}
        </div>

        {/* Role selector */}
        <div className="flex flex-wrap gap-2">
          {Object.entries(ROLE_LABELS).map(([slug, label]) => (
            <button
              key={slug}
              onClick={() => { setSelectedRole(slug); setIsDirty(false); }}
              className={cn(
                "px-3 py-1.5 rounded-full text-sm font-medium border transition-colors",
                selectedRole === slug
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border hover:border-primary/60 hover:bg-muted/60",
              )}
            >
              {label}
              {slug === "customer_admin" && (
                <span className="ml-1.5 text-xs opacity-70">★</span>
              )}
            </button>
          ))}
        </div>

        {isReadOnlyRole && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-sm">
            <Info className="w-4 h-4 shrink-0" />
            <span>
              <strong>Customer Admin</strong> has unrestricted access to all modules and cannot be modified.
            </span>
          </div>
        )}

        {isDirty && !isReadOnlyRole && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-600 dark:text-blue-400 text-sm">
            <Info className="w-4 h-4 shrink-0" />
            You have unsaved changes. Click <strong>Save Changes</strong> to apply.
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden bg-card">
            {/* Table header */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground w-48 sticky left-0 bg-muted/50 z-10">
                      Module
                    </th>
                    {PERMISSION_ACTIONS.map((action) => (
                      <th key={action} className="px-2 py-3 text-center font-semibold text-muted-foreground min-w-[72px]">
                        <div className="flex flex-col items-center gap-1.5">
                          <span>{ACTION_LABELS[action]}</span>
                          {!isReadOnlyRole && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Checkbox
                                  checked={MODULE_REGISTRY.every((m) => local[m.key]?.[action])}
                                  onCheckedChange={(v) => toggleAllModules(action, !!v)}
                                  className="w-3.5 h-3.5"
                                  aria-label={`Grant ${action} for all modules`}
                                />
                              </TooltipTrigger>
                              <TooltipContent>Toggle {ACTION_LABELS[action]} for all modules</TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </th>
                    ))}
                    {!isReadOnlyRole && (
                      <th className="px-3 py-3 text-center font-semibold text-muted-foreground min-w-[72px]">
                        All
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(groupedModules).map(([group, mods]) => {
                    const isCollapsed = collapsedGroups[group];
                    return [
                      <tr key={`group-${group}`} className="bg-muted/20 border-t border-border">
                        <td
                          colSpan={PERMISSION_ACTIONS.length + (isReadOnlyRole ? 1 : 2)}
                          className="px-4 py-2 sticky left-0 bg-muted/20"
                        >
                          <button
                            onClick={() => setCollapsedGroups((p) => ({ ...p, [group]: !p[group] }))}
                            className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {isCollapsed
                              ? <ChevronRight className="w-3 h-3" />
                              : <ChevronDown className="w-3 h-3" />}
                            {group}
                            <Badge variant="secondary" className="text-[10px] py-0 px-1.5 ml-1">
                              {mods.length}
                            </Badge>
                          </button>
                        </td>
                      </tr>,
                      ...(!isCollapsed ? mods.map((mod, idx) => {
                        const allGranted = PERMISSION_ACTIONS.every((a) => local[mod.key]?.[a]);
                        const someGranted = PERMISSION_ACTIONS.some((a) => local[mod.key]?.[a]);
                        return (
                          <tr
                            key={mod.key}
                            className={cn(
                              "border-t border-border/50 hover:bg-muted/10 transition-colors",
                              idx % 2 === 0 ? "" : "bg-muted/5",
                            )}
                          >
                            <td className="px-4 py-2.5 sticky left-0 bg-card z-10">
                              <span className="font-medium">{mod.label}</span>
                            </td>
                            {PERMISSION_ACTIONS.map((action) => {
                              const checked = isReadOnlyRole || !!local[mod.key]?.[action];
                              return (
                                <td key={action} className="px-2 py-2.5 text-center">
                                  <Checkbox
                                    checked={checked}
                                    onCheckedChange={isReadOnlyRole ? undefined : () => toggle(mod.key, action)}
                                    disabled={isReadOnlyRole}
                                    className={cn("w-4 h-4", isReadOnlyRole && "opacity-50 cursor-not-allowed")}
                                    aria-label={`${mod.label} — ${ACTION_LABELS[action]}`}
                                  />
                                </td>
                              );
                            })}
                            {!isReadOnlyRole && (
                              <td className="px-3 py-2.5 text-center">
                                <Checkbox
                                  checked={allGranted}
                                  ref={(el) => {
                                    if (el) (el as HTMLButtonElement & { indeterminate?: boolean }).indeterminate = someGranted && !allGranted;
                                  }}
                                  onCheckedChange={(v) => toggleAllActions(mod.key, !!v)}
                                  className="w-4 h-4"
                                  aria-label={`Toggle all for ${mod.label}`}
                                />
                              </td>
                            )}
                          </tr>
                        );
                      }) : []),
                    ];
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          <strong>Note:</strong> Menu visibility, API access, and dashboard widgets are all enforced
          automatically based on these permissions. Any new module added by developers will appear here
          without additional configuration.
        </p>
      </div>
    </TooltipProvider>
  );
}
