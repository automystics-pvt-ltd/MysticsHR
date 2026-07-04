import { Switch, Route, Router as WouterRouter, Redirect, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PlatformAuthProvider, usePlatformAuth } from "@/contexts/PlatformAuthContext";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { LoginPage } from "@/pages/LoginPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { TenantsPage } from "@/pages/TenantsPage";
import { TenantDetailPage } from "@/pages/TenantDetailPage";
import { AdminsPage } from "@/pages/AdminsPage";
import { AuditLogsPage } from "@/pages/AuditLogsPage";
import { SubscriptionPlansPage } from "@/pages/SubscriptionPlansPage";
import { AnalyticsPage } from "@/pages/AnalyticsPage";
import { InvoicesPage } from "@/pages/InvoicesPage";
import { BillingReportsPage } from "@/pages/BillingReportsPage";
import { SettingsPage } from "@/pages/SettingsPage";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoading } = usePlatformAuth();
  void useLocation();
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!isSignedIn) return <Redirect to="/login" />;
  return <AdminLayout>{children}</AdminLayout>;
}

function Router() {
  const { isSignedIn, isLoading } = usePlatformAuth();
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/dashboard"><ProtectedRoute><DashboardPage /></ProtectedRoute></Route>
      <Route path="/tenants/:id"><ProtectedRoute><TenantDetailPage /></ProtectedRoute></Route>
      <Route path="/tenants"><ProtectedRoute><TenantsPage /></ProtectedRoute></Route>
      <Route path="/subscription-plans"><ProtectedRoute><SubscriptionPlansPage /></ProtectedRoute></Route>
      <Route path="/invoices"><ProtectedRoute><InvoicesPage /></ProtectedRoute></Route>
      <Route path="/billing-reports"><ProtectedRoute><BillingReportsPage /></ProtectedRoute></Route>
      <Route path="/admins"><ProtectedRoute><AdminsPage /></ProtectedRoute></Route>
      <Route path="/analytics"><ProtectedRoute><AnalyticsPage /></ProtectedRoute></Route>
      <Route path="/audit-logs"><ProtectedRoute><AuditLogsPage /></ProtectedRoute></Route>
      <Route path="/settings"><ProtectedRoute><SettingsPage /></ProtectedRoute></Route>
      <Route path="/">
        {isLoading ? null : isSignedIn ? <Redirect to="/dashboard" /> : <Redirect to="/login" />}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <PlatformAuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </PlatformAuthProvider>
    </QueryClientProvider>
  );
}

export default App;
