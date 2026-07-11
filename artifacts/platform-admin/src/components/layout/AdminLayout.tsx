import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { usePlatformAuth } from "@/contexts/PlatformAuthContext";
import {
  LayoutDashboard, Building2, ShieldCheck, ScrollText,
  LogOut, CreditCard, BarChart3, Receipt, TrendingUp, Settings, Database,
} from "lucide-react";

const NAV_GROUPS = [
  {
    label: "Overview",
    items: [
      { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
      { href: "/tenants", icon: Building2, label: "Tenants" },
      { href: "/analytics", icon: BarChart3, label: "Analytics" },
    ],
  },
  {
    label: "Billing",
    items: [
      { href: "/subscription-plans", icon: CreditCard, label: "Subscription Plans" },
      { href: "/invoices", icon: Receipt, label: "Invoices" },
      { href: "/billing-reports", icon: TrendingUp, label: "Billing Reports" },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/admins", icon: ShieldCheck, label: "Platform Admins" },
      { href: "/audit-logs", icon: ScrollText, label: "Audit Logs" },
      { href: "/db-admin", icon: Database, label: "DB Admin" },
      { href: "/settings", icon: Settings, label: "Settings" },
    ],
  },
];

export function AdminLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { admin, logout } = usePlatformAuth();

  const initials = admin?.name
    ? admin.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : "PA";

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <aside className="w-[220px] flex-shrink-0 flex flex-col" style={{ background: "hsl(228 35% 6%)", borderRight: "1px solid hsl(228 20% 12%)" }}>

        {/* Brand header */}
        <div className="h-[58px] flex items-center px-5 gap-3" style={{ borderBottom: "1px solid hsl(228 20% 12%)" }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg, hsl(217 91% 52%), hsl(245 78% 62%))" }}>
            <ShieldCheck className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-white leading-none tracking-tight">MysticsHR</p>
            <p className="text-[9.5px] font-medium mt-[3px] leading-none tracking-[0.12em] uppercase" style={{ color: "hsl(217 70% 58%)" }}>
              Platform Admin
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-5">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="px-2 mb-1.5 text-[10px] font-semibold tracking-[0.1em] uppercase select-none"
                style={{ color: "hsl(220 15% 38%)" }}>
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map(({ href, icon: Icon, label }) => {
                  const active = location === href || location.startsWith(href + "/");
                  return (
                    <Link
                      key={href}
                      href={href}
                      className="relative flex items-center gap-3 px-3 py-[8px] rounded-md text-[13px] font-medium transition-all duration-150 cursor-pointer group select-none"
                      style={active ? {
                        background: "hsl(217 80% 52% / 0.14)",
                        color: "hsl(213 60% 90%)",
                      } : {
                        color: "hsl(220 15% 52%)",
                      }}
                      onMouseEnter={(e) => {
                        if (!active) {
                          (e.currentTarget as HTMLElement).style.background = "hsl(228 20% 10%)";
                          (e.currentTarget as HTMLElement).style.color = "hsl(220 20% 72%)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!active) {
                          (e.currentTarget as HTMLElement).style.background = "";
                          (e.currentTarget as HTMLElement).style.color = "hsl(220 15% 52%)";
                        }
                      }}
                    >
                      {/* Active indicator bar */}
                      {active && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full"
                          style={{ background: "hsl(217 91% 62%)" }} />
                      )}
                      <Icon
                        className="w-[15px] h-[15px] flex-shrink-0 transition-colors duration-150"
                        style={{ color: active ? "hsl(217 91% 65%)" : undefined }}
                      />
                      <span className="flex-1 truncate">{label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User footer */}
        <div className="px-3 pb-4 pt-3" style={{ borderTop: "1px solid hsl(228 20% 12%)" }}>
          <div className="flex items-center gap-2.5 px-2 py-2 mb-1 rounded-md"
            style={{ background: "hsl(228 25% 9%)" }}>
            {/* Avatar */}
            <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-[11px] font-bold text-white"
              style={{ background: "linear-gradient(135deg, hsl(217 80% 48%), hsl(245 70% 58%))" }}>
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-semibold text-white/90 truncate leading-none">{admin?.name ?? "Admin"}</p>
              <p className="text-[10.5px] mt-[3px] truncate leading-none" style={{ color: "hsl(220 15% 42%)" }}>
                {admin?.email ?? ""}
              </p>
            </div>
          </div>
          <button
            onClick={() => void logout()}
            className="w-full flex items-center gap-2.5 px-3 py-[7px] rounded-md text-[12px] font-medium transition-all duration-150 cursor-pointer"
            style={{ color: "hsl(220 15% 40%)" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "hsl(0 60% 50% / 0.10)";
              (e.currentTarget as HTMLElement).style.color = "hsl(0 80% 68%)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "";
              (e.currentTarget as HTMLElement).style.color = "hsl(220 15% 40%)";
            }}
          >
            <LogOut className="w-3.5 h-3.5 flex-shrink-0" />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
