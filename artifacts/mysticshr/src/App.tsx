import { useEffect, lazy, Suspense } from "react";
import { Switch, Route, useLocation, Router as WouterRouter, Redirect, Link } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { ShieldAlert } from "lucide-react";
import { AuthProvider, useAuth } from "@/lib/auth";

import LandingPage from "@/pages/landing";
import DashboardPage from "@/pages/dashboard";
import EmployeesPage from "@/pages/employees/index";
import EmployeeDetailPage from "@/pages/employees/detail";
import NewEmployeePage from "@/pages/employees/new";
import OrgChartPage from "@/pages/org-chart/index";
import DepartmentsPage from "@/pages/departments";
import DesignationsPage from "@/pages/designations";
import UsersPage from "@/pages/users";
import AuditLogsPage from "@/pages/audit-logs";
import RecruitmentPage from "@/pages/recruitment/index";
import RequisitionDetailPage from "@/pages/recruitment/requisition-detail";
import CandidateDetailPage from "@/pages/recruitment/candidate-detail";
import PreOnboardingPage from "@/pages/pre-onboarding/index";
import PreOnboardingDetailPage from "@/pages/pre-onboarding/detail";
import OnboardingPage from "@/pages/onboarding/index";
import OnboardingDetailPage from "@/pages/onboarding/detail";
import ShiftsPage from "@/pages/shifts/index";
import ShiftCalendarPage from "@/pages/shifts/calendar";
import AttendancePage from "@/pages/attendance/index";
import AttendanceRegularizationPage from "@/pages/attendance/regularization";
import AttendanceSummaryPage from "@/pages/attendance/summary";
import LeavePage from "@/pages/leave/index";
import LeaveTypesPage from "@/pages/leave/types";
import LeaveCalendarPage from "@/pages/leave/calendar";
import LeaveApprovalsPage from "@/pages/leave/approvals";
import LeavePoliciesPage from "@/pages/leave/policies";
import PermissionsPage from "@/pages/permissions/index";
import PayrollDashboardPage from "@/pages/payroll/index";
import SalaryStructuresPage from "@/pages/payroll/salary-structures";
import PayrollRunDetailPage from "@/pages/payroll/runs";
import PayslipsPage from "@/pages/payroll/payslips";
import TaxDeclarationPage from "@/pages/payroll/tax-declaration";
import StatutoryReportsPage from "@/pages/payroll/reports";
import SalaryRevisionsPage from "@/pages/payroll/salary-revisions";
import PerformancePage from "@/pages/performance/index";
import GoalsPage from "@/pages/performance/goals";
import AppraisalsPage from "@/pages/performance/appraisals";
import EvaluationsPage from "@/pages/performance/evaluations";
import CalibrationPage from "@/pages/performance/calibration";
import CycleDetailPage from "@/pages/performance/cycle-detail";
import PerformanceHistoryPage from "@/pages/performance/history";
import EssPortalPage from "@/pages/ess/index";
import HelpdeskPage from "@/pages/helpdesk/index";
import TicketDetailPage from "@/pages/helpdesk/ticket-detail";
import SlaReportPage from "@/pages/helpdesk/sla-report";
import DocumentsPage from "@/pages/documents/index";
import ExitPage from "@/pages/exit/index";
import ExitDetailPage from "@/pages/exit/detail";
import AnalyticsDashboard from "@/pages/analytics/index";
import ReportsPage from "@/pages/reports/index";
import CommunicationsPage from "@/pages/communications/index";
import SystemConfigPage from "@/pages/system-config/index";
import ApiKeysPage from "@/pages/settings/api-keys";
import ApiDocsPage from "@/pages/settings/api-docs";
import LoginPage from "@/pages/login";
import { MainLayout } from "@/components/layout/MainLayout";
import { useCurrentHrmsUser, type HrmsRole, hasRole } from "@/lib/useCurrentHrmsUser";

const NewEmployee = NewEmployeePage;

const PayrollChartHarnessLazy = lazy(() => import("./pages/__test__/payroll-chart-harness"));
const PayrollReportsHarnessLazy = lazy(() => import("./pages/__test__/payroll-reports-harness"));

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function LoadingScreen() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background">
      <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  );
}

function Forbidden() {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
      <ShieldAlert className="w-16 h-16 text-muted-foreground" />
      <h1 className="text-2xl font-bold">Access Denied</h1>
      <p className="text-muted-foreground max-w-sm">
        You don't have permission to view this page. Contact your HR administrator if you believe this is an error.
      </p>
      <Link href="/dashboard" className="text-primary hover:underline text-sm">
        Return to Dashboard
      </Link>
    </div>
  );
}

function HomeRedirect() {
  const { isSignedIn, isLoading } = useAuth();
  if (isLoading) return <LoadingScreen />;
  if (isSignedIn) return <Redirect to="/dashboard" />;
  return <LandingPage />;
}

function LogoutPage() {
  const { logout } = useAuth();
  const [, setLocation] = useLocation();
  useEffect(() => {
    void logout().then(() => setLocation("/"));
  }, [logout, setLocation]);
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-muted/30 px-4">
      <p className="text-sm text-muted-foreground">Signing you out…</p>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoading } = useAuth();
  if (isLoading) return <LoadingScreen />;
  if (!isSignedIn) return <Redirect to="/" />;
  return <MainLayout>{children}</MainLayout>;
}

function RoleProtectedRoute({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles: HrmsRole[];
}) {
  const { role, isLoading, isNotProvisioned } = useCurrentHrmsUser();

  if (isLoading) return null;
  if (isNotProvisioned) return <>{children}</>;

  if (!hasRole(role, allowedRoles)) {
    return <Forbidden />;
  }

  return <>{children}</>;
}

function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">404</h1>
        <p className="text-muted-foreground mb-4">Page not found</p>
        <Link href="/">
          <a className="text-primary hover:underline">Return Home</a>
        </Link>
      </div>
    </div>
  );
}

function AppRoutes() {
  return (
    <Switch>
      <Route path="/" component={HomeRedirect} />
      {import.meta.env.DEV && (
        <Route path="/__test/payroll-chart">
          <Suspense fallback={null}>
            <PayrollChartHarnessLazy />
          </Suspense>
        </Route>
      )}
      {import.meta.env.DEV && (
        <Route path="/__test/payroll-reports">
          <Suspense fallback={null}>
            <PayrollReportsHarnessLazy />
          </Suspense>
        </Route>
      )}
      <Route path="/sign-in/*?" component={LoginPage} />
      <Route path="/sign-up/*?"><Redirect to="/sign-in" /></Route>
      <Route path="/logout" component={LogoutPage} />

      <Route path="/dashboard">
        <ProtectedRoute><DashboardPage /></ProtectedRoute>
      </Route>

      <Route path="/org-chart">
        <ProtectedRoute>
          <RoleProtectedRoute allowedRoles={["customer_admin", "hr_manager", "hr_executive", "hod", "payroll_admin", "employee"]}>
            <OrgChartPage />
          </RoleProtectedRoute>
        </ProtectedRoute>
      </Route>

      <Route path="/employees/new">
        <ProtectedRoute>
          <RoleProtectedRoute allowedRoles={["customer_admin", "hr_manager", "hr_executive"]}>
            <NewEmployee />
          </RoleProtectedRoute>
        </ProtectedRoute>
      </Route>
      <Route path="/employees/:id">
        <ProtectedRoute>
          <RoleProtectedRoute allowedRoles={["customer_admin", "hr_manager", "hr_executive", "hod", "payroll_admin"]}>
            <EmployeeDetailPage />
          </RoleProtectedRoute>
        </ProtectedRoute>
      </Route>
      <Route path="/employees">
        <ProtectedRoute>
          <RoleProtectedRoute allowedRoles={["customer_admin", "hr_manager", "hr_executive", "hod", "payroll_admin"]}>
            <EmployeesPage />
          </RoleProtectedRoute>
        </ProtectedRoute>
      </Route>

      <Route path="/departments">
        <ProtectedRoute>
          <RoleProtectedRoute allowedRoles={["customer_admin", "hr_manager", "hr_executive"]}>
            <DepartmentsPage />
          </RoleProtectedRoute>
        </ProtectedRoute>
      </Route>
      <Route path="/designations">
        <ProtectedRoute>
          <RoleProtectedRoute allowedRoles={["customer_admin", "hr_manager", "hr_executive"]}>
            <DesignationsPage />
          </RoleProtectedRoute>
        </ProtectedRoute>
      </Route>

      <Route path="/users">
        <ProtectedRoute>
          <RoleProtectedRoute allowedRoles={["customer_admin", "hr_manager"]}>
            <UsersPage />
          </RoleProtectedRoute>
        </ProtectedRoute>
      </Route>

      <Route path="/recruitment/requisitions/:id">
        <ProtectedRoute>
          <RoleProtectedRoute allowedRoles={["customer_admin", "hr_manager", "hr_executive", "hod"]}>
            <RequisitionDetailPage />
          </RoleProtectedRoute>
        </ProtectedRoute>
      </Route>
      <Route path="/recruitment/candidates/:id">
        <ProtectedRoute>
          <RoleProtectedRoute allowedRoles={["customer_admin", "hr_manager", "hr_executive", "hod"]}>
            <CandidateDetailPage />
          </RoleProtectedRoute>
        </ProtectedRoute>
      </Route>
      <Route path="/recruitment">
        <ProtectedRoute>
          <RoleProtectedRoute allowedRoles={["customer_admin", "hr_manager", "hr_executive", "hod"]}>
            <RecruitmentPage />
          </RoleProtectedRoute>
        </ProtectedRoute>
      </Route>

      <Route path="/pre-onboarding/:id">
        <ProtectedRoute>
          <RoleProtectedRoute allowedRoles={["customer_admin", "hr_manager", "hr_executive"]}>
            <PreOnboardingDetailPage />
          </RoleProtectedRoute>
        </ProtectedRoute>
      </Route>
      <Route path="/pre-onboarding">
        <ProtectedRoute>
          <RoleProtectedRoute allowedRoles={["customer_admin", "hr_manager", "hr_executive"]}>
            <PreOnboardingPage />
          </RoleProtectedRoute>
        </ProtectedRoute>
      </Route>

      <Route path="/onboarding/:id">
        <ProtectedRoute>
          <RoleProtectedRoute allowedRoles={["customer_admin", "hr_manager", "hr_executive", "hod", "employee"]}>
            <OnboardingDetailPage />
          </RoleProtectedRoute>
        </ProtectedRoute>
      </Route>
      <Route path="/onboarding">
        <ProtectedRoute>
          <RoleProtectedRoute allowedRoles={["customer_admin", "hr_manager", "hr_executive", "hod"]}>
            <OnboardingPage />
          </RoleProtectedRoute>
        </ProtectedRoute>
      </Route>

      <Route path="/shifts/calendar">
        <ProtectedRoute>
          <RoleProtectedRoute allowedRoles={["customer_admin", "hr_manager", "hr_executive", "hod", "payroll_admin"]}>
            <ShiftCalendarPage />
          </RoleProtectedRoute>
        </ProtectedRoute>
      </Route>
      <Route path="/shifts">
        <ProtectedRoute>
          <RoleProtectedRoute allowedRoles={["customer_admin", "hr_manager", "hr_executive", "hod", "payroll_admin"]}>
            <ShiftsPage />
          </RoleProtectedRoute>
        </ProtectedRoute>
      </Route>

      <Route path="/attendance/regularization">
        <ProtectedRoute>
          <RoleProtectedRoute allowedRoles={["customer_admin", "hr_manager", "hr_executive", "hod", "payroll_admin", "employee"]}>
            <AttendanceRegularizationPage />
          </RoleProtectedRoute>
        </ProtectedRoute>
      </Route>
      <Route path="/attendance/summary">
        <ProtectedRoute>
          <RoleProtectedRoute allowedRoles={["customer_admin", "hr_manager", "hr_executive", "hod", "payroll_admin"]}>
            <AttendanceSummaryPage />
          </RoleProtectedRoute>
        </ProtectedRoute>
      </Route>
      <Route path="/attendance">
        <ProtectedRoute>
          <RoleProtectedRoute allowedRoles={["customer_admin", "hr_manager", "hr_executive", "hod", "payroll_admin", "employee"]}>
            <AttendancePage />
          </RoleProtectedRoute>
        </ProtectedRoute>
      </Route>
      <Route path="/my-attendance">
        <ProtectedRoute>
          <RoleProtectedRoute allowedRoles={["customer_admin", "hr_manager", "hr_executive", "hod", "payroll_admin", "employee"]}>
            <AttendancePage />
          </RoleProtectedRoute>
        </ProtectedRoute>
      </Route>

      <Route path="/leave/types">
        <ProtectedRoute>
          <RoleProtectedRoute allowedRoles={["customer_admin", "hr_manager", "hr_executive"]}>
            <LeaveTypesPage />
          </RoleProtectedRoute>
        </ProtectedRoute>
      </Route>
      <Route path="/leave/calendar">
        <ProtectedRoute>
          <RoleProtectedRoute allowedRoles={["customer_admin", "hr_manager", "hr_executive", "hod", "payroll_admin", "employee"]}>
            <LeaveCalendarPage />
          </RoleProtectedRoute>
        </ProtectedRoute>
      </Route>
      <Route path="/leave/approvals">
        <ProtectedRoute>
          <RoleProtectedRoute allowedRoles={["customer_admin", "hr_manager", "hr_executive", "hod"]}>
            <LeaveApprovalsPage />
          </RoleProtectedRoute>
        </ProtectedRoute>
      </Route>
      <Route path="/leave/policies">
        <ProtectedRoute>
          <RoleProtectedRoute allowedRoles={["customer_admin", "hr_manager", "hr_executive"]}>
            <LeavePoliciesPage />
          </RoleProtectedRoute>
        </ProtectedRoute>
      </Route>
      <Route path="/leave">
        <ProtectedRoute>
          <RoleProtectedRoute allowedRoles={["customer_admin", "hr_manager", "hr_executive", "hod", "payroll_admin", "employee"]}>
            <LeavePage />
          </RoleProtectedRoute>
        </ProtectedRoute>
      </Route>

      <Route path="/permissions">
        <ProtectedRoute>
          <RoleProtectedRoute allowedRoles={["customer_admin", "hr_manager", "hr_executive", "hod", "payroll_admin", "employee"]}>
            <PermissionsPage />
          </RoleProtectedRoute>
        </ProtectedRoute>
      </Route>

      <Route path="/payroll/salary-structures">
        <ProtectedRoute>
          <RoleProtectedRoute allowedRoles={["customer_admin", "hr_manager", "hr_executive", "payroll_admin"]}>
            <SalaryStructuresPage />
          </RoleProtectedRoute>
        </ProtectedRoute>
      </Route>
      <Route path="/payroll/runs/:id">
        <ProtectedRoute>
          <RoleProtectedRoute allowedRoles={["customer_admin", "payroll_admin"]}>
            <PayrollRunDetailPage />
          </RoleProtectedRoute>
        </ProtectedRoute>
      </Route>
      <Route path="/payroll/payslips">
        <ProtectedRoute>
          <RoleProtectedRoute allowedRoles={["customer_admin", "hr_manager", "hr_executive", "payroll_admin", "employee"]}>
            <PayslipsPage />
          </RoleProtectedRoute>
        </ProtectedRoute>
      </Route>
      <Route path="/payroll/tax-declaration">
        <ProtectedRoute>
          <RoleProtectedRoute allowedRoles={["customer_admin", "hr_manager", "hr_executive", "payroll_admin", "employee"]}>
            <TaxDeclarationPage />
          </RoleProtectedRoute>
        </ProtectedRoute>
      </Route>
      <Route path="/payroll/reports">
        <ProtectedRoute>
          <RoleProtectedRoute allowedRoles={["customer_admin", "payroll_admin"]}>
            <StatutoryReportsPage />
          </RoleProtectedRoute>
        </ProtectedRoute>
      </Route>
      <Route path="/payroll/salary-revisions">
        <ProtectedRoute>
          <RoleProtectedRoute allowedRoles={["customer_admin", "hr_manager", "hr_executive", "payroll_admin"]}>
            <SalaryRevisionsPage />
          </RoleProtectedRoute>
        </ProtectedRoute>
      </Route>
      <Route path="/payroll">
        <ProtectedRoute>
          <RoleProtectedRoute allowedRoles={["customer_admin", "hr_manager", "hr_executive", "payroll_admin", "employee"]}>
            <PayrollDashboardPage />
          </RoleProtectedRoute>
        </ProtectedRoute>
      </Route>

      <Route path="/performance/goals">
        <ProtectedRoute>
          <RoleProtectedRoute allowedRoles={["customer_admin", "hr_manager", "hr_executive", "hod", "employee"]}>
            <GoalsPage />
          </RoleProtectedRoute>
        </ProtectedRoute>
      </Route>
      <Route path="/performance/appraisals">
        <ProtectedRoute>
          <RoleProtectedRoute allowedRoles={["customer_admin", "hr_manager", "hr_executive", "hod", "employee"]}>
            <AppraisalsPage />
          </RoleProtectedRoute>
        </ProtectedRoute>
      </Route>
      <Route path="/performance/evaluations">
        <ProtectedRoute>
          <RoleProtectedRoute allowedRoles={["customer_admin", "hr_manager", "hr_executive", "hod"]}>
            <EvaluationsPage />
          </RoleProtectedRoute>
        </ProtectedRoute>
      </Route>
      <Route path="/performance/calibration">
        <ProtectedRoute>
          <RoleProtectedRoute allowedRoles={["customer_admin", "hr_manager", "hr_executive"]}>
            <CalibrationPage />
          </RoleProtectedRoute>
        </ProtectedRoute>
      </Route>
      <Route path="/performance/history">
        <ProtectedRoute>
          <RoleProtectedRoute allowedRoles={["customer_admin", "hr_manager", "hr_executive", "hod", "employee"]}>
            <PerformanceHistoryPage />
          </RoleProtectedRoute>
        </ProtectedRoute>
      </Route>
      <Route path="/performance/cycles/:id">
        <ProtectedRoute>
          <RoleProtectedRoute allowedRoles={["customer_admin", "hr_manager", "hr_executive", "hod", "employee"]}>
            <CycleDetailPage />
          </RoleProtectedRoute>
        </ProtectedRoute>
      </Route>
      <Route path="/performance">
        <ProtectedRoute>
          <RoleProtectedRoute allowedRoles={["customer_admin", "hr_manager", "hr_executive", "hod", "employee"]}>
            <PerformancePage />
          </RoleProtectedRoute>
        </ProtectedRoute>
      </Route>

      <Route path="/ess">
        <ProtectedRoute>
          <RoleProtectedRoute allowedRoles={["customer_admin", "hr_manager", "hr_executive", "hod", "payroll_admin", "employee"]}>
            <EssPortalPage />
          </RoleProtectedRoute>
        </ProtectedRoute>
      </Route>

      <Route path="/helpdesk/tickets/:id">
        <ProtectedRoute>
          <RoleProtectedRoute allowedRoles={["customer_admin", "hr_manager", "hr_executive", "hod", "payroll_admin", "employee"]}>
            <TicketDetailPage />
          </RoleProtectedRoute>
        </ProtectedRoute>
      </Route>
      <Route path="/helpdesk/sla-report">
        <ProtectedRoute>
          <RoleProtectedRoute allowedRoles={["customer_admin", "hr_manager", "hr_executive"]}>
            <SlaReportPage />
          </RoleProtectedRoute>
        </ProtectedRoute>
      </Route>
      <Route path="/helpdesk">
        <ProtectedRoute>
          <RoleProtectedRoute allowedRoles={["customer_admin", "hr_manager", "hr_executive", "hod", "payroll_admin", "employee"]}>
            <HelpdeskPage />
          </RoleProtectedRoute>
        </ProtectedRoute>
      </Route>

      <Route path="/documents">
        <ProtectedRoute>
          <RoleProtectedRoute allowedRoles={["customer_admin", "hr_manager", "hr_executive", "hod", "payroll_admin", "employee"]}>
            <DocumentsPage />
          </RoleProtectedRoute>
        </ProtectedRoute>
      </Route>

      <Route path="/exit/:id">
        <ProtectedRoute>
          <RoleProtectedRoute allowedRoles={["customer_admin", "hr_manager", "hr_executive", "hod", "employee"]}>
            <ExitDetailPage />
          </RoleProtectedRoute>
        </ProtectedRoute>
      </Route>
      <Route path="/exit">
        <ProtectedRoute>
          <RoleProtectedRoute allowedRoles={["customer_admin", "hr_manager", "hr_executive", "hod", "employee"]}>
            <ExitPage />
          </RoleProtectedRoute>
        </ProtectedRoute>
      </Route>

      <Route path="/analytics">
        <ProtectedRoute>
          <RoleProtectedRoute allowedRoles={["customer_admin", "hr_manager", "hr_executive", "payroll_admin"]}>
            <AnalyticsDashboard />
          </RoleProtectedRoute>
        </ProtectedRoute>
      </Route>

      <Route path="/reports">
        <ProtectedRoute>
          <RoleProtectedRoute allowedRoles={["customer_admin", "hr_manager", "hr_executive", "payroll_admin"]}>
            <ReportsPage />
          </RoleProtectedRoute>
        </ProtectedRoute>
      </Route>

      <Route path="/communications">
        <ProtectedRoute>
          <RoleProtectedRoute allowedRoles={["customer_admin", "hr_manager", "hr_executive", "hod", "payroll_admin", "employee"]}>
            <CommunicationsPage />
          </RoleProtectedRoute>
        </ProtectedRoute>
      </Route>

      <Route path="/system-config">
        <ProtectedRoute>
          <RoleProtectedRoute allowedRoles={["customer_admin"]}>
            <SystemConfigPage />
          </RoleProtectedRoute>
        </ProtectedRoute>
      </Route>
      <Route path="/audit-logs">
        <ProtectedRoute>
          <RoleProtectedRoute allowedRoles={["customer_admin", "hr_manager"]}>
            <AuditLogsPage />
          </RoleProtectedRoute>
        </ProtectedRoute>
      </Route>
      <Route path="/settings/api-keys">
        <ProtectedRoute>
          <RoleProtectedRoute allowedRoles={["customer_admin"]}>
            <ApiKeysPage />
          </RoleProtectedRoute>
        </ProtectedRoute>
      </Route>
      <Route path="/settings/api-docs">
        <ProtectedRoute>
          <RoleProtectedRoute allowedRoles={["customer_admin", "hr_manager", "hr_executive", "hod", "payroll_admin", "employee"]}>
            <ApiDocsPage />
          </RoleProtectedRoute>
        </ProtectedRoute>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </QueryClientProvider>
    </WouterRouter>
  );
}

export default App;
