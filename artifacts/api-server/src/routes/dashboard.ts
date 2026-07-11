import { Router } from "express";
import { requireHrmsUser, requireRole } from "../lib/auth";

const HR_READ_ROLES = ["customer_admin", "hr_manager", "hr_executive", "hod", "payroll_admin"] as const;
import { db } from "../lib/db";
import {
  employeesTable,
  departmentsTable,
  auditLogsTable,
  employeeCertificationsTable,
  leaveApplicationsTable,
  helpdeskTicketsTable,
  wfhRequestsTable,
  expenseClaimsTable,
  attendanceRegularizationsTable,
} from "@workspace/db/schema";
import { eq, and, sql, desc, asc, isNull, isNotNull, lte, inArray } from "drizzle-orm";

const router = Router();

router.get("/dashboard/kpis", requireHrmsUser, async (req, res) => {
  try {
    const tenantId = req.hrmsUser!.tenantId;
    const notDeleted = and(isNull(employeesTable.deletedAt), eq(employeesTable.tenantId, tenantId));

    const [headcountRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(employeesTable)
      .where(notDeleted);

    const [activeRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(employeesTable)
      .where(and(notDeleted, eq(employeesTable.status, "Active")));

    const firstOfMonth = new Date();
    firstOfMonth.setDate(1);
    firstOfMonth.setHours(0, 0, 0, 0);

    const [newJoinersRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(employeesTable)
      .where(
        and(
          notDeleted,
          sql`${employeesTable.dateOfJoining} >= ${firstOfMonth.toISOString().split("T")[0]}`
        )
      );

    const [separatedRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(employeesTable)
      .where(and(notDeleted, eq(employeesTable.status, "Separated")));

    const [onLeaveRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(employeesTable)
      .where(and(notDeleted, eq(employeesTable.status, "On Leave of Absence")));

    const [noticePeriodRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(employeesTable)
      .where(and(notDeleted, eq(employeesTable.status, "Notice Period")));

    const [deptRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(departmentsTable)
      .where(and(isNull(departmentsTable.deletedAt), eq(departmentsTable.isActive, true), eq(departmentsTable.tenantId, tenantId)));

    const [pendingLeaveRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(leaveApplicationsTable)
      .where(and(
        eq(leaveApplicationsTable.tenantId, tenantId),
        inArray(leaveApplicationsTable.status, ["Pending", "HOD Approved"])
      ));

    const [pendingWfhRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(wfhRequestsTable)
      .where(and(eq(wfhRequestsTable.tenantId, tenantId), eq(wfhRequestsTable.status, "Pending")));

    const [pendingExpenseRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(expenseClaimsTable)
      .where(and(eq(expenseClaimsTable.tenantId, tenantId), eq(expenseClaimsTable.status, "Submitted")));

    const [pendingRegRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(attendanceRegularizationsTable)
      .where(and(eq(attendanceRegularizationsTable.tenantId, tenantId), eq(attendanceRegularizationsTable.status, "Pending")));

    const [openTicketsRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(helpdeskTicketsTable)
      .where(and(eq(helpdeskTicketsTable.tenantId, tenantId), eq(helpdeskTicketsTable.status, "Open")));

    const today30 = new Date();
    today30.setDate(today30.getDate() + 30);
    const [certsExpiringRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(employeeCertificationsTable)
      .innerJoin(employeesTable, and(eq(employeeCertificationsTable.employeeId, employeesTable.id), isNull(employeesTable.deletedAt)))
      .where(and(
        eq(employeeCertificationsTable.tenantId, tenantId),
        isNotNull(employeeCertificationsTable.expiryDate),
        lte(employeeCertificationsTable.expiryDate, sql`(CURRENT_DATE + '30 days'::interval)::date`)
      ));

    const totalHeadcount = headcountRow?.count ?? 0;
    const activeEmployees = activeRow?.count ?? 0;
    const newJoinersThisMonth = newJoinersRow?.count ?? 0;
    const separated = separatedRow?.count ?? 0;
    const onLeaveToday = onLeaveRow?.count ?? 0;
    const noticePeriodCount = noticePeriodRow?.count ?? 0;
    const departmentCount = deptRow?.count ?? 0;
    const pendingLeaveCount = pendingLeaveRow?.count ?? 0;
    const pendingWfhCount = pendingWfhRow?.count ?? 0;
    const pendingExpenseCount = pendingExpenseRow?.count ?? 0;
    const pendingRegCount = pendingRegRow?.count ?? 0;
    const openTicketsCount = openTicketsRow?.count ?? 0;
    const certsExpiringCount = certsExpiringRow?.count ?? 0;

    const pendingApprovals = pendingLeaveCount + pendingWfhCount + pendingExpenseCount + pendingRegCount;

    const attritionRate =
      totalHeadcount > 0
        ? parseFloat(((separated / totalHeadcount) * 100).toFixed(2))
        : 0;

    res.json({
      totalHeadcount,
      newJoinersThisMonth,
      attritionRate,
      attendanceRateToday: totalHeadcount > 0 ? parseFloat(((activeEmployees / totalHeadcount) * 100).toFixed(2)) : 0,
      openPositions: 0,
      pendingApprovals,
      pendingLeaveCount,
      pendingWfhCount,
      pendingExpenseCount,
      pendingRegCount,
      noticePeriodCount,
      departmentCount,
      openTicketsCount,
      certsExpiringCount,
      activeEmployees,
      onLeaveToday,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/dashboard/recent-activity", requireHrmsUser, async (req, res) => {
  try {
    const limit = parseInt(String(req.query.limit ?? "10"), 10);
    const logs = await db
      .select()
      .from(auditLogsTable)
      .where(eq(auditLogsTable.tenantId, req.hrmsUser!.tenantId))
      .orderBy(desc(auditLogsTable.createdAt))
      .limit(limit);

    res.json(
      logs.map((l) => ({
        id: l.id,
        type: l.action,
        description: `${l.action} on ${l.module}${l.recordId ? ` #${l.recordId}` : ""}`,
        module: l.module,
        actorName: l.userEmail ?? "System",
        createdAt: l.createdAt,
      }))
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/dashboard/headcount-by-department", requireHrmsUser, async (req, res) => {
  try {
    const rows = await db
      .select({
        departmentId: departmentsTable.id,
        departmentName: departmentsTable.name,
        count: sql<number>`count(${employeesTable.id})::int`,
      })
      .from(departmentsTable)
      .leftJoin(
        employeesTable,
        sql`${employeesTable.departmentId} = ${departmentsTable.id} AND ${employeesTable.deletedAt} IS NULL AND ${employeesTable.status} != 'Separated' AND ${employeesTable.tenantId} = ${req.hrmsUser!.tenantId}`
      )
      .where(and(eq(departmentsTable.isActive, true), isNull(departmentsTable.deletedAt), eq(departmentsTable.tenantId, req.hrmsUser!.tenantId)))
      .groupBy(departmentsTable.id, departmentsTable.name)
      .orderBy(desc(sql`count(${employeesTable.id})`));

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/dashboard/employee-status-breakdown", requireHrmsUser, async (req, res) => {
  try {
    const rows = await db
      .select({
        status: employeesTable.status,
        count: sql<number>`count(*)::int`,
      })
      .from(employeesTable)
      .where(and(isNull(employeesTable.deletedAt), eq(employeesTable.tenantId, req.hrmsUser!.tenantId)))
      .groupBy(employeesTable.status)
      .orderBy(desc(sql`count(*)`));

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/dashboard/expiring-certifications", requireHrmsUser, requireRole(...HR_READ_ROLES), async (req, res) => {
  try {
    const daysParam = parseInt(String(req.query.days ?? "60"), 10);
    const days = Number.isFinite(daysParam) ? Math.min(Math.max(daysParam, 1), 365) : 60;

    const rows = await db
      .select({
        id: employeeCertificationsTable.id,
        name: employeeCertificationsTable.name,
        issuingOrganization: employeeCertificationsTable.issuingOrganization,
        expiryDate: employeeCertificationsTable.expiryDate,
        employeeId: employeesTable.id,
        employeeCode: employeesTable.employeeId,
        firstName: employeesTable.firstName,
        lastName: employeesTable.lastName,
        departmentName: departmentsTable.name,
      })
      .from(employeeCertificationsTable)
      .innerJoin(employeesTable, eq(employeeCertificationsTable.employeeId, employeesTable.id))
      .leftJoin(departmentsTable, eq(employeesTable.departmentId, departmentsTable.id))
      .where(
        and(
          isNotNull(employeeCertificationsTable.expiryDate),
          isNull(employeesTable.deletedAt),
          eq(employeeCertificationsTable.tenantId, req.hrmsUser!.tenantId),
          lte(
            employeeCertificationsTable.expiryDate,
            sql`(CURRENT_DATE + (${days} || ' days')::interval)::date`
          )
        )
      )
      .orderBy(asc(employeeCertificationsTable.expiryDate));

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const items = rows.map((r) => {
      const expiry = r.expiryDate ? new Date(r.expiryDate) : null;
      const daysUntilExpiry = expiry
        ? Math.floor((expiry.getTime() - today.getTime()) / 86400000)
        : 0;
      const bucket: "expired" | "7" | "30" | "60" =
        daysUntilExpiry < 0 ? "expired" : daysUntilExpiry <= 7 ? "7" : daysUntilExpiry <= 30 ? "30" : "60";
      return {
        id: r.id,
        name: r.name,
        issuingOrganization: r.issuingOrganization,
        expiryDate: r.expiryDate ?? "",
        daysUntilExpiry,
        bucket,
        employeeId: r.employeeId,
        employeeCode: r.employeeCode,
        employeeName: `${r.firstName} ${r.lastName}`.trim(),
        departmentName: r.departmentName ?? null,
      };
    });

    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
