import { useEffect, lazy, Suspense } from "react";
import { Switch, Route, useLocation, Router as WouterRouter, Redirect, Link } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { ShieldAlert } from "lucide-react";
import { AuthProvider, useAuth } from "@/lib/auth";
import { MainLayout } from "@/components/layout/MainLayout";
import { useCurrentHrmsUser, type HrmsRole, hasRole } from "@/lib/useCurrentHrmsUser";
import { useMyPermissions } from "@/lib/useMyPermissions";

const LandingPage = lazy(() => import("@/pages/landing"));
const LoginPage = lazy(() => import("@/pages/login"));
const MfaVerifyPage = lazy(() => import("@/pages/mfa-verify"));
const SecuritySettingsPage = lazy(() => import("@/pages/settings/security"));
const DashboardPage = lazy(() => import("@/pages/dashboard"));

const EmployeesPage = lazy(() => import("@/pages/employees/index"));
const EmployeeDetailPage = lazy(() => import("@/pages/employees/detail"));
const NewEmployeePage = lazy(() => import("@/pages/employees/new"));
const OrgChartPage = lazy(() => import("@/pages/org-chart/index"));
const DepartmentsPage = lazy(() => import("@/pages/departments"));
const DesignationsPage = lazy(() => import("@/pages/designations"));
const BranchesPage = lazy(() => import("@/pages/branches"));
const UsersPage = lazy(() => import("@/pages/users"));
const AuditLogsPage = lazy(() => import("@/pages/audit-logs"));
const RolesPermissionsPage = lazy(() => import("@/pages/roles-permissions/index"));

const RecruitmentPage = lazy(() => import("@/pages/recruitment/index"));
const RequisitionDetailPage = lazy(() => import("@/pages/recruitment/requisition-detail"));
const CandidateDetailPage = lazy(() => import("@/pages/recruitment/candidate-detail"));
const PreOnboardingPage = lazy(() => import("@/pages/pre-onboarding/index"));
const PreOnboardingDetailPage = lazy(() => import("@/pages/pre-onboarding/detail"));
const OnboardingPage = lazy(() => import("@/pages/onboarding/index"));
const OnboardingDetailPage = lazy(() => import("@/pages/onboarding/detail"));

const ShiftsPage = lazy(() => import("@/pages/shifts/index"));
const ShiftCalendarPage = lazy(() => import("@/pages/shifts/calendar"));

const AttendancePage = lazy(() => import("@/pages/attendance/index"));
const AttendanceRegularizationPage = lazy(() => import("@/pages/attendance/regularization"));
const AttendanceSummaryPage = lazy(() => import("@/pages/attendance/summary"));

const LeavePage = lazy(() => import("@/pages/leave/index"));
const LeaveTypesPage = lazy(() => import("@/pages/leave/types"));
const LeaveCalendarPage = lazy(() => import("@/pages/leave/calendar"));
const LeaveApprovalsPage = lazy(() => import("@/pages/leave/approvals"));
const LeavePoliciesPage = lazy(() => import("@/pages/leave/policies"));
const PermissionsPage = lazy(() => import("@/pages/permissions/index"));

const PayrollDashboardPage = lazy(() => import("@/pages/payroll/index"));
const SalaryStructuresPage = lazy(() => import("@/pages/payroll/salary-structures"));
const PayrollRunDetailPage = lazy(() => import("@/pages/payroll/runs"));
const PayslipsPage = lazy(() => import("@/pages/payroll/payslips"));
const TaxDeclarationPage = lazy(() => import("@/pages/payroll/tax-declaration"));
const StatutoryReportsPage = lazy(() => import("@/pages/payroll/reports"));
const SalaryRevisionsPage = lazy(() => import("@/pages/payroll/salary-revisions"));

const PerformancePage = lazy(() => import("@/pages/performance/index"));
const GoalsPage = lazy(() => import("@/pages/performance/goals"));
const AppraisalsPage = lazy(() => import("@/pages/performance/appraisals"));
const EvaluationsPage = lazy(() => import("@/pages/performance/evaluations"));
const CalibrationPage = lazy(() => import("@/pages/performance/calibration"));
const CycleDetailPage = lazy(() => import("@/pages/performance/cycle-detail"));
const PerformanceHistoryPage = lazy(() => import("@/pages/performance/history"));

const EssPortalPage = lazy(() => import("@/pages/ess/index"));
const HelpdeskPage = lazy(() => import("@/pages/helpdesk/index"));
const TicketDetailPage = lazy(() => import("@/pages/helpdesk/ticket-detail"));
const SlaReportPage = lazy(() => import("@/pages/helpdesk/sla-report"));
const DocumentsPage = lazy(() => import("@/pages/documents/index"));
const ExitPage = lazy(() => import("@/pages/exit/index"));
const ExitDetailPage = lazy(() => import("@/pages/exit/detail"));
const AnalyticsDashboard = lazy(() => import("@/pages/analytics/index"));
const ReportsPage = lazy(() => import("@/pages/reports/index"));
const CommunicationsPage = lazy(() => import("@/pages/communications/index"));
const SystemConfigPage = lazy(() => import("@/pages/system-config/index"));
const ApiKeysPage = lazy(() => import("@/pages/settings/api-keys"));
const ApiDocsPage = lazy(() => import("@/pages/settings/api-docs"));
const BillingPage = lazy(() => import("@/pages/billing/index"));
const WfhPage = lazy(() => import("@/pages/wfh/index"));
const ExpensePage = lazy(() => import("@/pages/expense/index"));
const ShiftChangePage = lazy(() => import("@/pages/shift-change/index"));
const ApprovalsHubPage = lazy(() => import("@/pages/approvals/index"));

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
  return (
    <Suspense fallback={<LoadingScreen />}>
      <LandingPage />
    </Suspense>
  );
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

/**
 * Guards a route by checking a live RBAC permission (module + action).
 * Falls back to allowing access while permissions are still loading so there
 * is no flash of the Forbidden screen on first paint.
 */
function PermissionProtectedRoute({
  children,
  module,
  action = "view",
}: {
  children: React.ReactNode;
  module: string;
  action?: string;
}) {
  const { data: permissionsMap, isLoading } = useMyPermissions();
  if (isLoading || !permissionsMap) return <>{children}</>;
  const allowed = (permissionsMap[module] ?? []).includes(action);
  if (!allowed) return <Forbidden />;
  return <>{children}</>;
}

function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">404</h1>
        <p className="text-muted-foreground mb-4">Page not found</p>
        <Link href="/" className="text-primary hover:underline">Return Home</Link>
      </div>
    </div>
  );
}

function AppRoutes() {
  return (
    <Suspense fallback={<LoadingScreen />}>
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
        <Route path="/sign-in/mfa">
          <Suspense fallback={<LoadingScreen />}>
            <MfaVerifyPage />
          </Suspense>
        </Route>
        <Route path="/sign-in/*?">
          <Suspense fallback={<LoadingScreen />}>
            <LoginPage />
          </Suspense>
        </Route>
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
              <PermissionProtectedRoute module="employees" action="create">
                <NewEmployeePage />
              </PermissionProtectedRoute>
            </RoleProtectedRoute>
          </ProtectedRoute>
        </Route>
        <Route path="/employees/:id">
          <ProtectedRoute>
            <RoleProtectedRoute allowedRoles={["customer_admin", "hr_manager", "hr_executive", "hod", "payroll_admin"]}>
              <PermissionProtectedRoute module="employees">
                <EmployeeDetailPage />
              </PermissionProtectedRoute>
            </RoleProtectedRoute>
          </ProtectedRoute>
        </Route>
        <Route path="/employees">
          <ProtectedRoute>
            <RoleProtectedRoute allowedRoles={["customer_admin", "hr_manager", "hr_executive", "hod", "payroll_admin"]}>
              <PermissionProtectedRoute module="employees">
                <EmployeesPage />
              </PermissionProtectedRoute>
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
        <Route path="/branches">
          <ProtectedRoute>
            <RoleProtectedRoute allowedRoles={["customer_admin", "hr_manager", "hr_executive"]}>
              <BranchesPage />
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

        <Route path="/roles-permissions">
          <ProtectedRoute>
            <RoleProtectedRoute allowedRoles={["customer_admin", "hr_manager"]}>
              <RolesPermissionsPage />
            </RoleProtectedRoute>
          </ProtectedRoute>
        </Route>

        <Route path="/recruitment/requisitions/:id">
          <ProtectedRoute>
            <RoleProtectedRoute allowedRoles={["customer_admin", "hr_manager", "hr_executive", "hod"]}>
              <PermissionProtectedRoute module="recruitment">
                <RequisitionDetailPage />
              </PermissionProtectedRoute>
            </RoleProtectedRoute>
          </ProtectedRoute>
        </Route>
        <Route path="/recruitment/candidates/:id">
          <ProtectedRoute>
            <RoleProtectedRoute allowedRoles={["customer_admin", "hr_manager", "hr_executive", "hod"]}>
              <PermissionProtectedRoute module="recruitment">
                <CandidateDetailPage />
              </PermissionProtectedRoute>
            </RoleProtectedRoute>
          </ProtectedRoute>
        </Route>
        <Route path="/recruitment">
          <ProtectedRoute>
            <RoleProtectedRoute allowedRoles={["customer_admin", "hr_manager", "hr_executive", "hod"]}>
              <PermissionProtectedRoute module="recruitment">
                <RecruitmentPage />
              </PermissionProtectedRoute>
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

        <Route path="/wfh">
          <ProtectedRoute>
            <WfhPage />
          </ProtectedRoute>
        </Route>

        <Route path="/shift-change">
          <ProtectedRoute>
            <ShiftChangePage />
          </ProtectedRoute>
        </Route>

        <Route path="/expense">
          <ProtectedRoute>
            <ExpensePage />
          </ProtectedRoute>
        </Route>

        <Route path="/approvals">
          <ProtectedRoute>
            <RoleProtectedRoute allowedRoles={["customer_admin", "hr_manager", "hr_executive", "hod"]}>
              <ApprovalsHubPage />
            </RoleProtectedRoute>
          </ProtectedRoute>
        </Route>

        <Route path="/payroll/salary-structures">
          <ProtectedRoute>
            <RoleProtectedRoute allowedRoles={["customer_admin", "hr_manager", "hr_executive", "payroll_admin"]}>
              <PermissionProtectedRoute module="payroll">
                <SalaryStructuresPage />
              </PermissionProtectedRoute>
            </RoleProtectedRoute>
          </ProtectedRoute>
        </Route>
        <Route path="/payroll/runs/:id">
          <ProtectedRoute>
            <RoleProtectedRoute allowedRoles={["customer_admin", "payroll_admin"]}>
              <PermissionProtectedRoute module="payroll">
                <PayrollRunDetailPage />
              </PermissionProtectedRoute>
            </RoleProtectedRoute>
          </ProtectedRoute>
        </Route>
        <Route path="/payroll/payslips">
          <ProtectedRoute>
            <RoleProtectedRoute allowedRoles={["customer_admin", "hr_manager", "hr_executive", "payroll_admin", "employee"]}>
              <PermissionProtectedRoute module="payroll">
                <PayslipsPage />
              </PermissionProtectedRoute>
            </RoleProtectedRoute>
          </ProtectedRoute>
        </Route>
        <Route path="/payroll/tax-declaration">
          <ProtectedRoute>
            <RoleProtectedRoute allowedRoles={["customer_admin", "hr_manager", "hr_executive", "payroll_admin", "employee"]}>
              <PermissionProtectedRoute module="payroll">
                <TaxDeclarationPage />
              </PermissionProtectedRoute>
            </RoleProtectedRoute>
          </ProtectedRoute>
        </Route>
        <Route path="/payroll/reports">
          <ProtectedRoute>
            <RoleProtectedRoute allowedRoles={["customer_admin", "payroll_admin"]}>
              <PermissionProtectedRoute module="payroll" action="reports">
                <StatutoryReportsPage />
              </PermissionProtectedRoute>
            </RoleProtectedRoute>
          </ProtectedRoute>
        </Route>
        <Route path="/payroll/salary-revisions">
          <ProtectedRoute>
            <RoleProtectedRoute allowedRoles={["customer_admin", "hr_manager", "hr_executive", "payroll_admin"]}>
              <PermissionProtectedRoute module="payroll">
                <SalaryRevisionsPage />
              </PermissionProtectedRoute>
            </RoleProtectedRoute>
          </ProtectedRoute>
        </Route>
        <Route path="/payroll">
          <ProtectedRoute>
            <RoleProtectedRoute allowedRoles={["customer_admin", "hr_manager", "hr_executive", "payroll_admin", "employee"]}>
              <PermissionProtectedRoute module="payroll">
                <PayrollDashboardPage />
              </PermissionProtectedRoute>
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
              <PermissionProtectedRoute module="analytics">
                <AnalyticsDashboard />
              </PermissionProtectedRoute>
            </RoleProtectedRoute>
          </ProtectedRoute>
        </Route>

        <Route path="/reports">
          <ProtectedRoute>
            <RoleProtectedRoute allowedRoles={["customer_admin", "hr_manager", "hr_executive", "payroll_admin"]}>
              <PermissionProtectedRoute module="reports">
                <ReportsPage />
              </PermissionProtectedRoute>
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
              <PermissionProtectedRoute module="audit-logs">
                <AuditLogsPage />
              </PermissionProtectedRoute>
            </RoleProtectedRoute>
          </ProtectedRoute>
        </Route>
        <Route path="/settings/security">
          <ProtectedRoute>
            <RoleProtectedRoute allowedRoles={["customer_admin", "hr_manager", "hr_executive", "hod", "payroll_admin", "employee"]}>
              <SecuritySettingsPage />
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
        <Route path="/billing">
          <ProtectedRoute>
            <RoleProtectedRoute allowedRoles={["customer_admin"]}>
              <BillingPage />
            </RoleProtectedRoute>
          </ProtectedRoute>
        </Route>

        <Route component={NotFound} />
      </Switch>
    </Suspense>
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
