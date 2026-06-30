import { useState, useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { CommandPalette } from "./CommandPalette";
import { useCurrentHrmsUser } from "@/lib/useCurrentHrmsUser";

function LayoutSkeleton() {
  return (
    <div className="h-screen flex bg-background overflow-hidden">
      {/* Sidebar skeleton */}
      <div className="hidden md:flex w-60 shrink-0 flex-col" style={{ background: "hsl(252 56% 12%)" }}>
        <div className="h-14 border-b border-white/10 px-4 flex items-center gap-3">
          <Skeleton className="w-7 h-7 rounded-lg bg-white/10" />
          <Skeleton className="h-4 w-24 bg-white/10" />
        </div>
        <div className="flex-1 p-3 space-y-4">
          {[3, 2, 4, 2].map((count, gi) => (
            <div key={gi} className="space-y-1">
              <Skeleton className="h-2.5 w-16 mb-2 ml-1 bg-white/10" />
              {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="flex items-center gap-2.5 px-2 py-1.5">
                  <Skeleton className="w-4 h-4 rounded bg-white/10" />
                  <Skeleton className="h-3 w-28 bg-white/10" />
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="p-3 border-t border-white/10 flex items-center gap-2">
          <Skeleton className="w-8 h-8 rounded-full bg-white/10" />
          <div className="space-y-1.5 flex-1">
            <Skeleton className="h-2.5 w-20 bg-white/10" />
            <Skeleton className="h-2 w-14 bg-white/10" />
          </div>
        </div>
      </div>
      {/* Main content skeleton */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="h-14 border-b border-border bg-card px-5 flex items-center gap-3">
          <Skeleton className="h-3 w-8" />
          <Skeleton className="h-3 w-3" />
          <Skeleton className="h-3 w-20" />
          <div className="flex-1" />
          <Skeleton className="h-8 w-36 rounded-lg" />
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
        <div className="flex-1 p-6 lg:p-8">
          <div className="mx-auto max-w-7xl space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-7 w-40" />
              <Skeleton className="h-4 w-56" />
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-l-4 border-border bg-card p-5 space-y-4">
                  <div className="flex items-start justify-between">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-10 w-10 rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                </div>
              ))}
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <Skeleton className="h-56 rounded-xl" />
              <Skeleton className="h-56 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function MainLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("mysticshr.sidebarCollapsed") === "1";
  });
  const [commandOpen, setCommandOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("mysticshr.sidebarCollapsed", sidebarCollapsed ? "1" : "0");
  }, [sidebarCollapsed]);

  const { isLoading, isNotProvisioned } = useCurrentHrmsUser();

  if (isLoading) {
    return <LayoutSkeleton />;
  }

  if (isNotProvisioned) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-lg">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Account Not Provisioned</AlertTitle>
            <AlertDescription>
              No HRMS account found for your email address. Please contact your HR administrator to create your profile and assign access.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      <Sidebar
        isOpen={sidebarOpen}
        setOpen={setSidebarOpen}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          onMobileMenuOpen={() => setSidebarOpen(true)}
          onCommandOpen={() => setCommandOpen(true)}
        />

        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="mx-auto w-full max-w-7xl">
            {children}
          </div>
        </main>
      </div>

      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
    </div>
  );
}
