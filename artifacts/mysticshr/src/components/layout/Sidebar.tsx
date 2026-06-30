import { useState, useMemo } from "react";
import { Link, useLocation } from "wouter";
import {
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  Menu,
  X,
  LogOut,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useCurrentHrmsUser } from "@/lib/useCurrentHrmsUser";
import { useMyPermissions } from "@/lib/useMyPermissions";
import { filterNavByRole, filterNavByPermissions, type Role } from "./nav-config";
import { useAuth } from "@/lib/auth";

export function SidebarMenuButton({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="md:hidden p-2 rounded-lg hover:bg-muted/80 transition-colors text-foreground"
      aria-label="Open navigation menu"
    >
      <Menu className="w-5 h-5" />
    </button>
  );
}

interface SidebarProps {
  isOpen: boolean;
  setOpen: (v: boolean) => void;
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
}

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const formatRole = (r: string) =>
  r.split("_").map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");

const ROLE_COLORS: Record<string, string> = {
  customer_admin: "bg-violet-500/20 text-violet-300 border-violet-500/30",
  hr_manager: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  hr_executive: "bg-sky-500/20 text-sky-300 border-sky-500/30",
  hod: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  payroll_admin: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  employee: "bg-slate-500/20 text-slate-300 border-slate-500/30",
};

export function Sidebar({ isOpen, setOpen, collapsed, setCollapsed }: SidebarProps) {
  const [location] = useLocation();
  const { role: hrmsRole, hrmsUser } = useCurrentHrmsUser();
  const { logout } = useAuth();
  const role = (hrmsRole ?? "employee") as Role;
  const { data: permissionsMap } = useMyPermissions();

  const groups = useMemo(() => {
    if (permissionsMap && Object.keys(permissionsMap).length > 0) {
      return filterNavByPermissions(permissionsMap as Record<string, string[]>);
    }
    return filterNavByRole(role);
  }, [permissionsMap, role]);

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const g of groups) initial[g.id] = g.defaultOpen ?? false;
    return initial;
  });

  const effectiveOpen = useMemo(() => {
    const merged = { ...openGroups };
    for (const g of groups) {
      if (g.items.some((i) => location === i.href || location.startsWith(i.href + "/"))) {
        merged[g.id] = true;
      }
    }
    return merged;
  }, [openGroups, groups, location]);

  const toggleGroup = (id: string) =>
    setOpenGroups((s) => ({ ...s, [id]: !(s[id] ?? effectiveOpen[id]) }));

  const displayName = hrmsUser?.name ?? "User";
  const initials = displayName
    .split(" ")
    .slice(0, 2)
    .map((n: string) => n.charAt(0).toUpperCase())
    .join("");

  const roleColorClass = ROLE_COLORS[role] ?? ROLE_COLORS.employee;

  async function handleSignOut() {
    await logout();
    window.location.href = "/";
  }

  return (
    <TooltipProvider delayDuration={100}>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/70 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col",
          "bg-sidebar border-r border-sidebar-border",
          "transition-[width,transform] duration-200 ease-in-out",
          "md:translate-x-0 md:static",
          isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full",
          collapsed ? "w-[64px]" : "w-[252px]",
        )}
        data-testid="app-sidebar"
      >
        {/* ── Brand ── */}
        <div
          className={cn(
            "relative shrink-0 flex items-center justify-between gap-2 h-[58px]",
            "border-b border-sidebar-border/70",
            collapsed ? "px-0 justify-center" : "px-4",
          )}
        >
          {/* subtle gradient header glow */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none" />

          {!collapsed && (
            <Link href="/dashboard" className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shrink-0 shadow-md ring-1 ring-white/10">
                <img src={`${BASE}/logo.svg`} alt="MysticsHR" className="w-4.5 h-4.5" />
              </div>
              <div className="min-w-0">
                <p className="text-[13.5px] font-bold text-white leading-tight tracking-tight truncate">
                  MysticsHR
                </p>
                <p className="text-[9.5px] font-medium text-sidebar-foreground/30 leading-tight uppercase tracking-[0.1em]">
                  by Automystics
                </p>
              </div>
            </Link>
          )}

          {collapsed && (
            <Link href="/dashboard">
              <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shadow-md ring-1 ring-white/10">
                <img src={`${BASE}/logo.svg`} alt="MysticsHR" className="w-4 h-4" />
              </div>
            </Link>
          )}

          {/* Mobile close */}
          <button
            className="md:hidden flex items-center justify-center w-7 h-7 rounded-lg text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-white/10 transition-colors shrink-0"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Desktop collapse toggle */}
          {!collapsed && (
            <button
              className="hidden md:flex items-center justify-center w-7 h-7 rounded-lg text-sidebar-foreground/35 hover:text-sidebar-foreground hover:bg-white/10 transition-colors shrink-0"
              onClick={() => setCollapsed(true)}
              aria-label="Collapse sidebar"
            >
              <ChevronsLeft className="w-3.5 h-3.5" />
            </button>
          )}
          {collapsed && (
            <button
              className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-sidebar border border-sidebar-border text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-border transition-all shadow-md items-center justify-center z-10"
              onClick={() => setCollapsed(false)}
              aria-label="Expand sidebar"
            >
              <ChevronsRight className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* ── Navigation ── */}
        <nav
          className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
          aria-label="Main navigation"
        >
          {groups.map((group, gi) => (
            <div key={group.id} className={cn(gi > 0 && !collapsed && "mt-1")}>
              {/* Group header */}
              {!collapsed ? (
                <button
                  onClick={() => toggleGroup(group.id)}
                  className="w-full flex items-center justify-between px-2 py-1.5 mb-0.5 rounded-md group/grp"
                >
                  <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-sidebar-foreground/30 group-hover/grp:text-sidebar-foreground/55 transition-colors">
                    {group.label}
                  </span>
                  <ChevronDown
                    className={cn(
                      "w-3 h-3 text-sidebar-foreground/25 group-hover/grp:text-sidebar-foreground/50 transition-all duration-200",
                      effectiveOpen[group.id] ? "rotate-0" : "-rotate-90"
                    )}
                  />
                </button>
              ) : (
                gi > 0 && <div className="mx-3 my-2 h-px bg-sidebar-border/50" />
              )}

              {/* Nav items */}
              {(collapsed || effectiveOpen[group.id]) && (
                <ul className="space-y-0.5">
                  {group.items.map((item) => {
                    const isActive = location === item.href || location.startsWith(item.href + "/");
                    const Icon = item.icon;

                    const linkContent = (
                      <Link
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className={cn(
                          "group/item relative flex items-center gap-3 rounded-lg transition-all duration-150 outline-none",
                          "focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-0",
                          collapsed
                            ? "justify-center h-10 w-10 mx-auto"
                            : "px-3 py-2.5",
                          isActive
                            ? [
                                "bg-sidebar-accent/20 text-white",
                              ]
                            : "text-sidebar-foreground/55 hover:text-sidebar-foreground hover:bg-white/[0.06]"
                        )}
                        aria-current={isActive ? "page" : undefined}
                      >
                        {/* Active left accent bar */}
                        {isActive && !collapsed && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-sidebar-accent" />
                        )}

                        <Icon
                          className={cn(
                            "shrink-0 transition-colors",
                            collapsed ? "w-[18px] h-[18px]" : "w-4 h-4",
                            isActive
                              ? "text-sidebar-accent-foreground opacity-100"
                              : "opacity-60 group-hover/item:opacity-90"
                          )}
                          aria-hidden="true"
                        />

                        {!collapsed && (
                          <span
                            className={cn(
                              "text-[13px] font-medium truncate leading-none",
                              isActive ? "text-white" : ""
                            )}
                          >
                            {item.name}
                          </span>
                        )}

                        {/* Active right indicator dot */}
                        {isActive && !collapsed && (
                          <span className="ml-auto w-1.5 h-1.5 rounded-full bg-sidebar-accent shrink-0" />
                        )}
                      </Link>
                    );

                    return (
                      <li key={item.href}>
                        {collapsed ? (
                          <Tooltip>
                            <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                            <TooltipContent
                              side="right"
                              sideOffset={10}
                              className="font-medium text-xs"
                            >
                              {item.name}
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          linkContent
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ))}
        </nav>

        {/* ── User footer ── */}
        <div
          className={cn(
            "shrink-0 border-t border-sidebar-border/60",
            collapsed ? "p-2" : "p-3"
          )}
        >
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center justify-center rounded-xl p-2 hover:bg-white/10 transition-colors group/avatar"
                  aria-label="Sign out"
                >
                  <div className="relative">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-violet-600 text-white font-bold flex items-center justify-center text-xs shadow-md ring-2 ring-sidebar-border">
                      {initials}
                    </div>
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 border-2 border-sidebar rounded-full" />
                  </div>
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={10}>
                <div className="text-xs space-y-0.5">
                  <p className="font-semibold">{displayName}</p>
                  <p className="text-muted-foreground">{formatRole(role)}</p>
                  <p className="text-red-400 text-[10px] mt-1">Click to sign out</p>
                </div>
              </TooltipContent>
            </Tooltip>
          ) : (
            <div className="rounded-xl bg-white/[0.04] border border-white/[0.07] p-2.5 flex items-center gap-2.5">
              {/* Avatar */}
              <div className="relative shrink-0">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-violet-600 text-white font-bold flex items-center justify-center text-xs shadow-md ring-2 ring-sidebar-border">
                  {initials}
                </div>
                <span className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-400 border-2 border-sidebar rounded-full" />
              </div>

              {/* Name + role */}
              <div className="flex-1 min-w-0">
                <p className="text-[12.5px] font-semibold text-sidebar-foreground leading-tight truncate">
                  {displayName}
                </p>
                <span
                  className={cn(
                    "inline-flex items-center mt-0.5 px-1.5 py-0.5 rounded-md text-[9.5px] font-semibold uppercase tracking-wide border",
                    roleColorClass
                  )}
                >
                  {formatRole(role)}
                </span>
              </div>

              {/* Sign out */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleSignOut}
                    className="shrink-0 flex items-center justify-center w-7 h-7 rounded-lg text-sidebar-foreground/35 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    aria-label="Sign out"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">Sign out</TooltipContent>
              </Tooltip>
            </div>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}
