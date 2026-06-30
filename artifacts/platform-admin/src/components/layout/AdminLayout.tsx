import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { usePlatformAuth } from "@/contexts/PlatformAuthContext";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, Building2, ShieldCheck, ScrollText,
  LogOut, ChevronRight, CreditCard, BarChart3, Receipt, TrendingUp,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/tenants", icon: Building2, label: "Tenants" },
  { href: "/subscription-plans", icon: CreditCard, label: "Subscription Plans" },
  { href: "/invoices", icon: Receipt, label: "Invoices" },
  { href: "/billing-reports", icon: TrendingUp, label: "Billing Reports" },
  { href: "/admins", icon: ShieldCheck, label: "Platform Admins" },
  { href: "/analytics", icon: BarChart3, label: "Analytics" },
  { href: "/audit-logs", icon: ScrollText, label: "Audit Logs" },
];

export function AdminLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { admin, logout } = usePlatformAuth();

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <aside className="w-60 flex-shrink-0 flex flex-col bg-sidebar border-r border-sidebar-border">
        <div className="h-14 flex items-center px-5 border-b border-sidebar-border">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded bg-primary flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <p className="text-sm font-semibold text-sidebar-foreground leading-none">MysticsHR</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 leading-none uppercase tracking-widest">Platform Admin</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
            const active = location === href || location.startsWith(href + "/");
            return (
              <Link key={href} href={href} className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors cursor-pointer group ${
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
              }`}>
                <Icon className={`w-4 h-4 flex-shrink-0 ${active ? "text-primary" : "text-muted-foreground group-hover:text-sidebar-accent-foreground"}`} />
                <span className="flex-1">{label}</span>
                {active && <ChevronRight className="w-3 h-3 text-primary opacity-60" />}
              </Link>
            );
          })}
        </nav>

        <div className="px-3 py-4 border-t border-sidebar-border">
          <div className="flex items-center gap-2.5 px-2 mb-3">
            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-primary">{admin?.name?.charAt(0)?.toUpperCase() ?? "P"}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-sidebar-foreground truncate">{admin?.name ?? "Admin"}</p>
              <p className="text-[11px] text-muted-foreground truncate">{admin?.email ?? ""}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm"
            className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10 gap-2 h-8"
            onClick={() => void logout()}>
            <LogOut className="w-3.5 h-3.5" />
            Sign out
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
