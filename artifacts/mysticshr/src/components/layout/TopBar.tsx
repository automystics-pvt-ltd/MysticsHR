import { Link, useLocation } from "wouter";
import { LogOut, Search, User as UserIcon, Settings, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useCurrentHrmsUser } from "@/lib/useCurrentHrmsUser";
import { useAuth } from "@/lib/auth";
import { resolveActiveItem } from "./nav-config";
import { SidebarMenuButton } from "./Sidebar";
import { NotificationBell } from "./NotificationBell";

interface TopBarProps {
  onMobileMenuOpen: () => void;
  onCommandOpen: () => void;
}

const formatRole = (r: string) =>
  r.split("_").map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");

const isMac =
  typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/i.test(navigator.platform);

export function TopBar({ onMobileMenuOpen, onCommandOpen }: TopBarProps) {
  const [location, setLocation] = useLocation();
  const { logout } = useAuth();
  const { hrmsUser, role: hrmsRole } = useCurrentHrmsUser();

  const role = hrmsRole ?? "employee";
  const active = resolveActiveItem(location);

  const trailingSegments = (() => {
    if (!active) return [];
    const tail = location.slice(active.href.length).replace(/^\/+|\/+$/g, "");
    if (!tail) return [];
    return tail.split("/").map((seg, i, arr) => ({
      label: prettify(seg),
      href: active.href + "/" + arr.slice(0, i + 1).join("/"),
      isLast: i === arr.length - 1,
    }));
  })();

  const displayName = hrmsUser?.name ?? "User";
  const initial = displayName.charAt(0).toUpperCase();

  async function handleSignOut() {
    await logout();
    setLocation("/");
  }

  return (
    <header
      className="h-14 border-b border-border bg-background/95 backdrop-blur-sm flex items-center gap-2 px-3 md:px-5 shrink-0 sticky top-0 z-30"
      data-testid="app-topbar"
    >
      <SidebarMenuButton onOpen={onMobileMenuOpen} />

      {/* Breadcrumb — desktop */}
      <div className="hidden md:flex items-center min-w-0 flex-1">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors text-sm">Home</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            {active && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  {trailingSegments.length === 0 ? (
                    <BreadcrumbPage className="text-sm font-medium">{active.name}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink asChild>
                      <Link href={active.href} className="text-muted-foreground hover:text-foreground transition-colors text-sm">{active.name}</Link>
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </>
            )}
            {trailingSegments.map((s) => (
              <span key={s.href} className="contents">
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  {s.isLast ? (
                    <BreadcrumbPage className="text-sm font-medium">{s.label}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink asChild>
                      <Link href={s.href} className="text-muted-foreground hover:text-foreground transition-colors text-sm">{s.label}</Link>
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </span>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Page title — mobile */}
      <div className="flex-1 md:hidden font-semibold text-base truncate">
        {active?.name ?? "MysticsHR"}
      </div>

      {/* Search trigger */}
      <Button
        variant="outline"
        size="sm"
        className="hidden sm:inline-flex items-center gap-2 text-muted-foreground h-8 px-3 min-w-[180px] max-w-[220px] justify-between bg-muted/50 border-border/60 hover:bg-muted"
        onClick={onCommandOpen}
        data-testid="topbar-search-trigger"
        aria-label="Search modules and pages"
      >
        <span className="flex items-center gap-2">
          <Search className="w-3.5 h-3.5" />
          <span className="text-xs">Search…</span>
        </span>
        <kbd className="hidden md:inline-flex items-center gap-0.5 rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
          {isMac ? "⌘" : "Ctrl"}K
        </kbd>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="sm:hidden h-8 w-8"
        onClick={onCommandOpen}
        aria-label="Search"
      >
        <Search className="w-4 h-4" />
      </Button>

      {/* Notification bell */}
      <NotificationBell />

      {/* User menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="h-8 px-1.5 gap-2 hover:bg-muted rounded-lg"
            data-testid="topbar-user-menu"
            aria-label="User menu"
          >
            <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground font-semibold flex items-center justify-center text-xs">
              {initial}
            </div>
            <div className="hidden lg:flex flex-col items-start min-w-0 max-w-[140px]">
              <span className="text-xs font-medium leading-tight truncate w-full text-left">
                {displayName}
              </span>
              <span className="text-[10px] text-muted-foreground leading-tight truncate w-full text-left">
                {formatRole(role)}
              </span>
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground font-semibold flex items-center justify-center text-sm shrink-0">
                {initial}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-medium text-sm truncate">{displayName}</span>
                <span className="text-xs text-muted-foreground font-normal truncate">
                  {formatRole(role)}
                </span>
              </div>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setLocation("/ess")} data-testid="user-menu-profile">
            <UserIcon className="w-4 h-4 mr-2 text-muted-foreground" />
            My Profile
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setLocation("/settings/security")}>
            <Shield className="w-4 h-4 mr-2 text-muted-foreground" />
            Security
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setLocation("/settings/api-keys")}>
            <Settings className="w-4 h-4 mr-2 text-muted-foreground" />
            Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSignOut} data-testid="user-menu-signout" className="text-destructive focus:text-destructive">
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}

function prettify(seg: string): string {
  if (/^[0-9a-f]{8}-/i.test(seg) || /^\d+$/.test(seg)) return "Details";
  return seg
    .replace(/[-_]+/g, " ")
    .split(" ")
    .map((w) => (w.length === 0 ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
}
