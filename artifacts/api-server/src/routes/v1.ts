import { Router } from "express";
import { and, desc, eq, gte, isNull, lte, sql } from "drizzle-orm";
import { db } from "../lib/db";
import { verifyApiKey, requireScope } from "../lib/apiKeys";
import {
  employeesTable, departmentsTable, designationsTable,
  attendanceRecordsTable, leaveBalancesTable, leaveTypesTable, payslipsTable,
} from "@workspace/db/schema";
import { logAudit } from "../lib/audit";

const router: ReturnType<typeof Router> = Router();

// Every /v1 endpoint requires a valid API key.
router.use(verifyApiKey);

// Lightweight per-call audit. Doesn't block the response.
router.use((req, _res, next) => {
  if (req.apiKey) {
    void logAudit({
      action: "API_V1_CALL",
      module: "ApiV1",
      newValue: `${req.method} ${req.path}`,
      ipAddress: req.ip,
      recordId: req.apiKey.id,
    });
  }
  next();
});

function paging(req: any) {
  const limit = Math.min(Math.max(parseInt(req.query.limit ?? "50", 10) || 50, 1), 200);
  const offset = Math.max(parseInt(req.query.offset ?? "0", 10) || 0, 0);
  return { limit, offset };
}

// ─── /me ──────────────────────────────────────────────────────────────────────
// Useful for callers to verify their key and inspect granted scopes.
router.get("/me", (req, res) => {
  const k = req.apiKey!;
  res.json({
    name: k.name,
    prefix: k.prefix,
    scopes: k.scopes,
    createdAt: k.createdAt,
    expiresAt: k.expiresAt,
    lastUsedAt: k.lastUsedAt,
  });
});

// ─── EMPLOYEES ────────────────────────────────────────────────────────────────
router.get("/employees", requireScope("employees:read"), async (req, res) => {
  try {
    const tenantId = req.apiKey!.tenantId;
    const { limit, offset } = paging(req);
    const status = (req.query.status as string | undefined)?.trim();
    const departmentId = req.query.departmentId ? Number(req.query.departmentId) : undefined;

    const conditions = [
      isNull(employeesTable.deletedAt),
      eq(employeesTable.tenantId, tenantId),
    ];
    if (status) conditions.push(sql`${employeesTable.status} = ${status}`);
    if (departmentId) conditions.push(eq(employeesTable.departmentId, departmentId));
    const where = and(...conditions);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(employeesTable)
      .where(where);

    const rows = await db
      .select({
        id: employeesTable.id,
        employeeId: employeesTable.employeeId,
        firstName: employeesTable.firstName,
        lastName: employeesTable.lastName,
        email: employeesTable.email,
        phone: employeesTable.phone,
        status: employeesTable.status,
        employmentType: employeesTable.employmentType,
        dateOfJoining: employeesTable.dateOfJoining,
        department: departmentsTable.name,
        designation: designationsTable.title,
        location: employeesTable.location,
      })
      .from(employeesTable)
      .leftJoin(departmentsTable, and(eq(employeesTable.departmentId, departmentsTable.id), eq(departmentsTable.tenantId, tenantId)))
      .leftJoin(designationsTable, and(eq(employeesTable.designationId, designationsTable.id), eq(designationsTable.tenantId, tenantId)))
      .where(where)
      .orderBy(desc(employeesTable.createdAt))
      .limit(limit)
      .offset(offset);

    res.json({ data: rows, total: count ?? 0, limit, offset });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/employees/:id", requireScope("employees:read"), async (req, res) => {
  try {
    const tenantId = req.apiKey!.tenantId;
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id) || id <= 0) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const [row] = await db
      .select({
        id: employeesTable.id,
        employeeId: employeesTable.employeeId,
        firstName: employeesTable.firstName,
        lastName: employeesTable.lastName,
        email: employeesTable.email,
        phone: employeesTable.phone,
        gender: employeesTable.gender,
        dateOfBirth: employeesTable.dateOfBirth,
        status: employeesTable.status,
        employmentType: employeesTable.employmentType,
        dateOfJoining: employeesTable.dateOfJoining,
        department: departmentsTable.name,
        designation: designationsTable.title,
        location: employeesTable.location,
      })
      .from(employeesTable)
      .leftJoin(departmentsTable, and(eq(employeesTable.departmentId, departmentsTable.id), eq(departmentsTable.tenantId, tenantId)))
      .leftJoin(designationsTable, and(eq(employeesTable.designationId, designationsTable.id), eq(designationsTable.tenantId, tenantId)))
      .where(and(eq(employeesTable.id, id), isNull(employeesTable.deletedAt), eq(employeesTable.tenantId, tenantId)))
      .limit(1);
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    res.json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── DEPARTMENTS ──────────────────────────────────────────────────────────────
router.get("/departments", requireScope("departments:read"), async (req, res) => {
  try {
    const tenantId = req.apiKey!.tenantId;
    const rows = await db
      .select({
        id: departmentsTable.id,
        name: departmentsTable.name,
        code: departmentsTable.code,
        description: departmentsTable.description,
        isActive: departmentsTable.isActive,
      })
      .from(departmentsTable)
      .where(and(isNull(departmentsTable.deletedAt), eq(departmentsTable.tenantId, tenantId)))
      .orderBy(departmentsTable.name);
    res.json({ data: rows, total: rows.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── ATTENDANCE ───────────────────────────────────────────────────────────────
router.get("/attendance", requireScope("attendance:read"), async (req, res) => {
  try {
    const tenantId = req.apiKey!.tenantId;
    const { limit, offset } = paging(req);
    const employeeId = req.query.employeeId ? Number(req.query.employeeId) : undefined;
    const fromDate = (req.query.fromDate as string | undefined)?.trim();
    const toDate = (req.query.toDate as string | undefined)?.trim();

    const conditions = [eq(attendanceRecordsTable.tenantId, tenantId)];
    if (employeeId) conditions.push(eq(attendanceRecordsTable.employeeId, employeeId));
    if (fromDate) conditions.push(gte(attendanceRecordsTable.attendanceDate, fromDate));
    if (toDate) conditions.push(lte(attendanceRecordsTable.attendanceDate, toDate));
    const where = and(...conditions);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(attendanceRecordsTable)
      .where(where);

    const rows = await db
      .select({
        id: attendanceRecordsTable.id,
        employeeId: attendanceRecordsTable.employeeId,
        attendanceDate: attendanceRecordsTable.attendanceDate,
        signInTime: attendanceRecordsTable.signInTime,
        signOutTime: attendanceRecordsTable.signOutTime,
        totalMinutesWorked: attendanceRecordsTable.totalMinutesWorked,
        overtimeMinutes: attendanceRecordsTable.overtimeMinutes,
        status: attendanceRecordsTable.status,
      })
      .from(attendanceRecordsTable)
      .where(where)
      .orderBy(desc(attendanceRecordsTable.attendanceDate))
      .limit(limit)
      .offset(offset);

    res.json({ data: rows, total: count ?? 0, limit, offset });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── PAYSLIPS ─────────────────────────────────────────────────────────────────
router.get("/payslips", requireScope("payslips:read"), async (req, res) => {
  try {
    const tenantId = req.apiKey!.tenantId;
    const { limit, offset } = paging(req);
    const employeeId = req.query.employeeId ? Number(req.query.employeeId) : undefined;
    const year = req.query.year ? Number(req.query.year) : undefined;
    const month = req.query.month ? Number(req.query.month) : undefined;

    const conditions = [eq(payslipsTable.tenantId, tenantId)];
    if (employeeId) conditions.push(eq(payslipsTable.employeeId, employeeId));
    if (year) conditions.push(eq(payslipsTable.periodYear, year));
    if (month) conditions.push(eq(payslipsTable.periodMonth, month));
    const where = and(...conditions);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(payslipsTable)
      .where(where);

    const rows = await db
      .select({
        id: payslipsTable.id,
        employeeId: payslipsTable.employeeId,
        periodYear: payslipsTable.periodYear,
        periodMonth: payslipsTable.periodMonth,
        generatedAt: payslipsTable.generatedAt,
        payslipData: payslipsTable.payslipData,
      })
      .from(payslipsTable)
      .where(where)
      .orderBy(desc(payslipsTable.periodYear), desc(payslipsTable.periodMonth))
      .limit(limit)
      .offset(offset);

    res.json({ data: rows, total: count ?? 0, limit, offset });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── LEAVE BALANCES ───────────────────────────────────────────────────────────
router.get("/leave-balances", requireScope("leave:read"), async (req, res) => {
  try {
    const tenantId = req.apiKey!.tenantId;
    const { limit, offset } = paging(req);
    const employeeId = req.query.employeeId ? Number(req.query.employeeId) : undefined;
    const year = req.query.year ? Number(req.query.year) : new Date().getFullYear();

    const conditions = [
      eq(leaveBalancesTable.year, year),
      eq(leaveBalancesTable.tenantId, tenantId),
    ];
    if (employeeId) conditions.push(eq(leaveBalancesTable.employeeId, employeeId));
    const where = and(...conditions);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(leaveBalancesTable)
      .where(where);

    const rows = await db
      .select({
        id: leaveBalancesTable.id,
        employeeId: leaveBalancesTable.employeeId,
        leaveTypeId: leaveBalancesTable.leaveTypeId,
        leaveType: leaveTypesTable.name,
        leaveTypeCode: leaveTypesTable.code,
        year: leaveBalancesTable.year,
        allocated: leaveBalancesTable.allocated,
        used: leaveBalancesTable.used,
        pending: leaveBalancesTable.pending,
        carryForward: leaveBalancesTable.carryForward,
      })
      .from(leaveBalancesTable)
      .leftJoin(leaveTypesTable, and(eq(leaveBalancesTable.leaveTypeId, leaveTypesTable.id), eq(leaveTypesTable.tenantId, tenantId)))
      .where(where)
      .limit(limit)
      .offset(offset);

    res.json({ data: rows, total: count ?? 0, limit, offset });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
