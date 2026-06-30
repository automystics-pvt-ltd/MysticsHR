import { useState, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { ChevronDown, ChevronsLeft, ChevronsRight, Menu, X, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
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
      className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors text-foreground"
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

  async function handleSignOut() {
    await logout();
    window.location.href = "/";
  }

  return (
    <TooltipProvider delayDuration={150}>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 bg-sidebar border-r border-sidebar-border text-sidebar-foreground transition-all duration-200 ease-in-out flex flex-col md:translate-x-0 md:static",
          isOpen ? "translate-x-0" : "-translate-x-full",
          collapsed ? "w-[60px]" : "w-[230px]",
        )}
        data-testid="app-sidebar"
      >
        {/* Brand row */}
        <div
          className={cn(
            "h-14 border-b border-sidebar-border flex items-center justify-between gap-2 shrink-0",
            collapsed ? "px-2" : "px-3"
          )}
        >
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 min-w-0"
          >
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shrink-0 shadow-sm">
              <img src={`${BASE}/logo.svg`} alt="MysticsHR" className="w-4 h-4" />
            </div>
            {!collapsed && (
              <span className="text-sm font-bold text-sidebar-primary truncate tracking-tight">
                MysticsHR
              </span>
            )}
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-border/50 shrink-0 h-7 w-7"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          >
            <X className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="hidden md:flex text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-border/50 shrink-0 h-7 w-7"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronsRight className="w-3.5 h-3.5" /> : <ChevronsLeft className="w-3.5 h-3.5" />}
          </Button>
        </div>

        {/* Nav */}
        <nav
          className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5 scrollbar-thin"
          aria-label="Main navigation"
        >
          {groups.map((group) => (
            <div key={group.id} className="mb-2">
              {!collapsed && (
                <button
                  onClick={() => toggleGroup(group.id)}
                  className="w-full flex items-center justify-between px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-sidebar-foreground/35 hover:text-sidebar-foreground/60 transition-colors"
                >
                  <span>{group.label}</span>
                  <ChevronDown
                    className={cn(
                      "w-3 h-3 transition-transform duration-200",
                      effectiveOpen[group.id] ? "rotate-0" : "-rotate-90"
                    )}
                  />
                </button>
              )}
              {collapsed && <div className="my-1.5 mx-2 h-px bg-sidebar-border/40" />}
              {(collapsed || effectiveOpen[group.id]) && (
                <ul className="space-y-0.5 mt-0.5">
                  {group.items.map((item) => {
                    const isActive = location === item.href || location.startsWith(item.href + "/");
                    const Icon = item.icon;
                    const linkContent = (
                      <Link
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className={cn(
                          "flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm font-medium transition-all duration-150",
                          isActive
                            ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                            : "text-sidebar-foreground/60 hover:bg-sidebar-border/50 hover:text-sidebar-foreground",
                          collapsed && "justify-center px-0 py-2.5",
                        )}
                        aria-current={isActive ? "page" : undefined}
                      >
                        <Icon
                          className={cn(
                            "shrink-0 transition-colors",
                            collapsed ? "w-4.5 h-4.5" : "w-4 h-4",
                            isActive ? "text-sidebar-accent-foreground" : "opacity-70"
                          )}
                          aria-hidden="true"
                        />
                        {!collapsed && <span className="truncate">{item.name}</span>}
                      </Link>
                    );

                    return (
                      <li key={item.href}>
                        {collapsed ? (
                          <Tooltip>
                            <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                            <TooltipContent side="right" className="font-medium text-xs">
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

        {/* User footer */}
        <div className={cn("shrink-0 border-t border-sidebar-border/60", collapsed ? "p-2" : "p-2.5")}>
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center justify-center rounded-lg p-2 hover:bg-sidebar-border/50 transition-colors"
                  aria-label="Sign out"
                >
                  <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center text-xs">
                    {initials}
                  </div>
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <div className="text-xs space-y-0.5">
                  <p className="font-semibold">{displayName}</p>
                  <p className="text-muted-foreground">{formatRole(role)}</p>
                </div>
              </TooltipContent>
            </Tooltip>
          ) : (
            <div className="flex items-center gap-2.5 px-1.5 py-1.5 rounded-lg hover:bg-sidebar-border/50 transition-colors group cursor-default">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center text-xs shrink-0 shadow-sm">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-sidebar-foreground truncate">{displayName}</p>
                <p className="text-[10px] text-sidebar-foreground/45 truncate">{formatRole(role)}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-transparent shrink-0"
                onClick={handleSignOut}
                aria-label="Sign out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}
