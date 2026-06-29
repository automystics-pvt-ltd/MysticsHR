import { useState, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { ChevronDown, ChevronsLeft, ChevronsRight, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useCurrentHrmsUser } from "@/lib/useCurrentHrmsUser";
import { useMyPermissions } from "@/lib/useMyPermissions";
import { filterNavByRole, filterNavByPermissions, type Role } from "./nav-config";

export function SidebarMenuButton({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="md:hidden p-2 rounded-md hover:bg-accent transition-colors"
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

export function Sidebar({ isOpen, setOpen, collapsed, setCollapsed }: SidebarProps) {
  const [location] = useLocation();
  const { role: hrmsRole } = useCurrentHrmsUser();
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

  return (
    <TooltipProvider delayDuration={150}>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 bg-sidebar border-r border-sidebar-border text-sidebar-foreground transition-all duration-200 ease-in-out flex flex-col md:translate-x-0 md:static",
          isOpen ? "translate-x-0" : "-translate-x-full",
          collapsed ? "w-[72px]" : "w-64",
        )}
        data-testid="app-sidebar"
      >
        {/* Brand row */}
        <div className="h-16 px-3 border-b border-sidebar-border flex items-center justify-between gap-2 shrink-0">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 font-bold text-sidebar-primary min-w-0"
          >
            <img src={`${BASE}/logo.svg`} alt="MysticsHR" className="w-8 h-8 shrink-0" />
            {!collapsed && <span className="text-lg truncate">MysticsHR</span>}
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-sidebar-foreground shrink-0"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="hidden md:flex text-sidebar-foreground shrink-0"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronsRight className="w-4 h-4" /> : <ChevronsLeft className="w-4 h-4" />}
          </Button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1" aria-label="Main navigation">
          {groups.map((group) => (
            <div key={group.id}>
              {!collapsed && (
                <button
                  onClick={() => toggleGroup(group.id)}
                  className="w-full flex items-center justify-between px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50 hover:text-sidebar-foreground/80 transition-colors"
                >
                  <span>{group.label}</span>
                  <ChevronDown
                    className={cn("w-3 h-3 transition-transform", effectiveOpen[group.id] ? "rotate-0" : "-rotate-90")}
                  />
                </button>
              )}
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
                          "flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition-colors",
                          isActive
                            ? "bg-sidebar-accent text-sidebar-accent-foreground"
                            : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                          collapsed && "justify-center",
                        )}
                        aria-current={isActive ? "page" : undefined}
                      >
                        <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                        {!collapsed && <span className="truncate">{item.name}</span>}
                      </Link>
                    );

                    return (
                      <li key={item.href}>
                        {collapsed ? (
                          <Tooltip>
                            <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                            <TooltipContent side="right">{item.name}</TooltipContent>
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
      </aside>
    </TooltipProvider>
  );
}
