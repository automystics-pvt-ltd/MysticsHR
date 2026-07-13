import { Router } from "express";
import { requireHrmsUser, requireRole } from "../lib/auth";
import { logAudit } from "../lib/audit";
import { db } from "../lib/db";
import {
  employeesTable,
  departmentsTable,
  designationsTable,
  systemSettingsTable,
  employeeSkillsTable,
  employeeCertificationsTable,
  branchesTable,
  shiftTemplatesTable,
  tenantsTable,
  ticketAttachmentsTable,
  employeeDocumentsTable,
} from "@workspace/db/schema";
import { eq, isNull, and, sql, desc, asc } from "drizzle-orm";
import { autoCreateOnboardingChecklist } from "../lib/onboarding-utils";
import { recordHistory } from "../lib/history-utils";
import { seedNotificationPreferencesForEmployee } from "../lib/notification-service";
import { DEFAULT_TIMEZONE, isValidIanaTimezone } from "../lib/timezones";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage";
import { Readable } from "node:stream";

const objectStorageService = new ObjectStorageService();

// Validation hint only — checked as a required prefix on manually-entered
// employee IDs. Does NOT auto-generate or auto-increment IDs.
async function getEmployeeIdPrefix(tenantId: number): Promise<string | null> {
  const [row] = await db
    .select({ employeeIdPrefix: tenantsTable.employeeIdPrefix })
    .from(tenantsTable)
    .where(eq(tenantsTable.id, tenantId))
    .limit(1);
  return row?.employeeIdPrefix?.trim() || null;
}

async function getCompanyDefaultTimezone(tenantId: number): Promise<string> {
  const [row] = await db
    .select({ value: systemSettingsTable.value })
    .from(systemSettingsTable)
    .where(and(eq(systemSettingsTable.category, "org_profile"), eq(systemSettingsTable.key, "timezone"), eq(systemSettingsTable.tenantId, tenantId)))
    .limit(1);
  const v = row?.value;
  if (typeof v === "string" && isValidIanaTimezone(v)) return v;
  return DEFAULT_TIMEZONE;
}

const router = Router();

const employeeSelect = {
  id: employeesTable.id,
  employeeId: employeesTable.employeeId,
  firstName: employeesTable.firstName,
  lastName: employeesTable.lastName,
  email: employeesTable.email,
  phone: employeesTable.phone,
  dateOfBirth: employeesTable.dateOfBirth,
  gender: employeesTable.gender,
  departmentId: employeesTable.departmentId,
  departmentName: departmentsTable.name,
  designationId: employeesTable.designationId,
  designationTitle: designationsTable.title,
  employmentType: employeesTable.employmentType,
  status: employeesTable.status,
  dateOfJoining: employeesTable.dateOfJoining,
  ctc: employeesTable.ctc,
  managerId: employeesTable.managerId,
  location: employeesTable.location,
  branchId: employeesTable.branchId,
  branchName: branchesTable.name,
  defaultShiftTemplateId: employeesTable.defaultShiftTemplateId,
  defaultShiftTemplateName: shiftTemplatesTable.name,
  timezone: employeesTable.timezone,
  avatarUrl: employeesTable.avatarUrl,
  isActive: employeesTable.isActive,
  createdAt: employeesTable.createdAt,
  updatedAt: employeesTable.updatedAt,
};

// Self-service: any authenticated employee may update their own preferred timezone.
router.patch("/employees/me/timezone", requireHrmsUser, async (req, res) => {
  try {
    const empId = req.hrmsUser?.employeeId;
    if (!empId) {
      res.status(403).json({ error: "Authenticated user is not linked to an employee record" });
      return;
    }
    const { timezone } = req.body ?? {};
    if (!isValidIanaTimezone(timezone)) {
      res.status(400).json({ error: "Invalid IANA timezone identifier" });
      return;
    }
    const [existing] = await db
      .select({ tz: employeesTable.timezone })
      .from(employeesTable)
      .where(and(eq(employeesTable.id, empId), isNull(employeesTable.deletedAt), eq(employeesTable.tenantId, req.hrmsUser!.tenantId)))
      .limit(1);
    if (!existing) {
      res.status(404).json({ error: "Employee not found" });
      return;
    }
    const [emp] = await db
      .update(employeesTable)
      .set({ timezone, updatedAt: new Date() })
      .where(and(eq(employeesTable.id, empId), isNull(employeesTable.deletedAt), eq(employeesTable.tenantId, req.hrmsUser!.tenantId)))
      .returning();
    if (existing.tz !== timezone) {
      await recordHistory(empId, "Employee", "timezone", existing.tz, timezone, req.hrmsUser?.id ?? null, req.hrmsUser!.tenantId);
    }
    await logAudit({ user: req.hrmsUser, action: "UPDATE", module: "Employees", recordId: empId, ipAddress: req.ip });
    res.json(emp);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Employee-facing metadata needed by forms (e.g. the ID prefix validation hint).
router.get("/employees/id-config", requireHrmsUser, async (req, res) => {
  try {
    const employeeIdPrefix = await getEmployeeIdPrefix(req.hrmsUser!.tenantId);
    res.json({ employeeIdPrefix });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Object paths accepted for avatars must be freshly-issued upload objects
// (the shape returned by POST /storage/uploads/request-url), never an
// arbitrary string. Without this, a user could point their own avatarUrl at
// someone else's private object path (e.g. a confidential ticket attachment
// or employee document) and, since avatars are viewable by any tenant user
// via GET /employees/:id/avatar, use themselves as a relay to leak content
// that record's real ACL would otherwise block.
const AVATAR_OBJECT_PATH_RE = /^\/objects\/uploads\/[a-f0-9-]{36}$/;

async function isObjectClaimedElsewhere(objectPath: string, tenantId: number): Promise<boolean> {
  const [asAttachment] = await db.select({ id: ticketAttachmentsTable.id })
    .from(ticketAttachmentsTable)
    .where(and(eq(ticketAttachmentsTable.objectPath, objectPath), eq(ticketAttachmentsTable.tenantId, tenantId)))
    .limit(1);
  if (asAttachment) return true;
  const apiPrefixed = `/api/storage${objectPath}`;
  const [asDocument] = await db.select({ id: employeeDocumentsTable.id })
    .from(employeeDocumentsTable)
    .where(and(sql`${employeeDocumentsTable.fileUrl} in (${objectPath}, ${apiPrefixed})`, eq(employeeDocumentsTable.tenantId, tenantId)))
    .limit(1);
  return !!asDocument;
}

// Self-service: any authenticated employee may update their own photo.
router.patch("/employees/me/avatar", requireHrmsUser, async (req, res) => {
  try {
    const empId = req.hrmsUser?.employeeId;
    if (!empId) {
      res.status(403).json({ error: "Authenticated user is not linked to an employee record" });
      return;
    }
    const { avatarUrl } = req.body ?? {};
    if (typeof avatarUrl !== "string" || !avatarUrl) {
      res.status(400).json({ error: "avatarUrl is required" });
      return;
    }
    if (!AVATAR_OBJECT_PATH_RE.test(avatarUrl)) {
      res.status(400).json({ error: "Invalid avatar object path" });
      return;
    }
    if (await isObjectClaimedElsewhere(avatarUrl, req.hrmsUser!.tenantId)) {
      res.status(400).json({ error: "This file is already in use elsewhere and cannot be used as an avatar" });
      return;
    }
    const [emp] = await db
      .update(employeesTable)
      .set({ avatarUrl, updatedAt: new Date() })
      .where(and(eq(employeesTable.id, empId), isNull(employeesTable.deletedAt), eq(employeesTable.tenantId, req.hrmsUser!.tenantId)))
      .returning();
    if (!emp) {
      res.status(404).json({ error: "Employee not found" });
      return;
    }
    await logAudit({ user: req.hrmsUser, action: "UPDATE", module: "Employees", recordId: empId, ipAddress: req.ip });
    res.json(emp);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Serves an employee's photo. Any authenticated user in the same tenant may
// view it (avatars already surface on ID cards, org chart, and directories),
// unlike ticket/document attachments which use per-record ACLs.
router.get("/employees/:id/avatar", requireHrmsUser, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const tenantId = req.hrmsUser!.tenantId;
    const [emp] = await db
      .select({ avatarUrl: employeesTable.avatarUrl })
      .from(employeesTable)
      .where(and(eq(employeesTable.id, id), eq(employeesTable.tenantId, tenantId), isNull(employeesTable.deletedAt)))
      .limit(1);
    if (!emp?.avatarUrl) {
      res.status(404).json({ error: "No photo on file" });
      return;
    }
    const file = await objectStorageService.getObjectEntityFile(emp.avatarUrl);
    const response = await objectStorageService.downloadObject(file);
    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));
    if (response.body) {
      Readable.fromWeb(response.body as any).pipe(res);
    } else {
      res.end();
    }
  } catch (err) {
    if (err instanceof ObjectNotFoundError) { res.status(404).json({ error: "Photo not found" }); return; }
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/employees", requireHrmsUser, async (req, res) => {
  try {
    const {
      status, departmentId, search, skill, certification,
      limit = "50", offset = "0",
    } = req.query as Record<string, string>;

    const conditions = [isNull(employeesTable.deletedAt), eq(employeesTable.tenantId, req.hrmsUser!.tenantId)];

    if (status) {
      conditions.push(
        sql`lower(${employeesTable.status}::text) = lower(${status})`
      );
    }
    if (departmentId) conditions.push(eq(employeesTable.departmentId, parseInt(departmentId, 10)));
    if (search) {
      conditions.push(
        sql`(${employeesTable.firstName} ilike ${`%${search}%`} OR ${employeesTable.lastName} ilike ${`%${search}%`} OR ${employeesTable.email} ilike ${`%${search}%`} OR ${employeesTable.employeeId} ilike ${`%${search}%`})`
      );
    }
    if (skill && skill.trim()) {
      // EXISTS subquery: employee has at least one skill whose name matches.
      conditions.push(
        sql`EXISTS (SELECT 1 FROM ${employeeSkillsTable}
          WHERE ${employeeSkillsTable.employeeId} = ${employeesTable.id}
          AND ${employeeSkillsTable.tenantId} = ${req.hrmsUser!.tenantId}
          AND ${employeeSkillsTable.name} ilike ${`%${skill.trim()}%`})`
      );
    }
    if (certification && certification.trim()) {
      conditions.push(
        sql`EXISTS (SELECT 1 FROM ${employeeCertificationsTable}
          WHERE ${employeeCertificationsTable.employeeId} = ${employeesTable.id}
          AND ${employeeCertificationsTable.tenantId} = ${req.hrmsUser!.tenantId}
          AND ${employeeCertificationsTable.name} ilike ${`%${certification.trim()}%`})`
      );
    }

    const whereClause = and(...conditions);

    const [countRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(employeesTable)
      .where(whereClause);

    const employees = await db
      .select(employeeSelect)
      .from(employeesTable)
      .leftJoin(departmentsTable, eq(employeesTable.departmentId, departmentsTable.id))
      .leftJoin(designationsTable, eq(employeesTable.designationId, designationsTable.id))
      .leftJoin(branchesTable, eq(employeesTable.branchId, branchesTable.id))
      .leftJoin(shiftTemplatesTable, eq(employeesTable.defaultShiftTemplateId, shiftTemplatesTable.id))
      .where(whereClause)
      .orderBy(desc(employeesTable.createdAt))
      .limit(parseInt(limit, 10))
      .offset(parseInt(offset, 10));

    res.json({
      data: employees,
      total: countRow?.count ?? 0,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post(
  "/employees",
  requireHrmsUser,
  requireRole("customer_admin", "hr_manager", "hr_executive"),
  async (req, res) => {
    try {
      const {
        employeeId, firstName, lastName, email, phone, dateOfBirth,
        gender, departmentId, designationId, employmentType, status,
        dateOfJoining, ctc, managerId, location, avatarUrl, timezone,
        branchId, defaultShiftTemplateId,
      } = req.body;

      if (!employeeId || !firstName || !lastName || !email) {
        res.status(400).json({ error: "employeeId, firstName, lastName, and email are required" });
        return;
      }

      if (avatarUrl !== undefined && avatarUrl !== null) {
        if (!AVATAR_OBJECT_PATH_RE.test(avatarUrl) || await isObjectClaimedElsewhere(avatarUrl, req.hrmsUser!.tenantId)) {
          res.status(400).json({ error: "Invalid avatar object path" });
          return;
        }
      }

      const idPrefix = await getEmployeeIdPrefix(req.hrmsUser!.tenantId);
      if (idPrefix && !String(employeeId).toUpperCase().startsWith(idPrefix.toUpperCase())) {
        res.status(400).json({ error: `Employee ID must start with "${idPrefix}" (this tenant's configured prefix).` });
        return;
      }

      let resolvedTimezone: string;
      if (timezone === undefined || timezone === null || timezone === "") {
        resolvedTimezone = await getCompanyDefaultTimezone(req.hrmsUser!.tenantId);
      } else if (!isValidIanaTimezone(timezone)) {
        res.status(400).json({ error: "Invalid IANA timezone identifier" });
        return;
      } else {
        resolvedTimezone = timezone;
      }

      const [emp] = await db
        .insert(employeesTable)
        .values({
          employeeId, firstName, lastName, email, phone, dateOfBirth,
          gender, departmentId, designationId, employmentType, status,
          dateOfJoining, ctc, managerId, location, avatarUrl,
          branchId: branchId ? Number(branchId) : undefined,
          defaultShiftTemplateId: defaultShiftTemplateId ? Number(defaultShiftTemplateId) : undefined,
          timezone: resolvedTimezone,
          tenantId: req.hrmsUser!.tenantId,
        })
        .returning();

      await logAudit({ user: req.hrmsUser, action: "CREATE", module: "Employees", recordId: emp.id, ipAddress: req.ip });

      // Seed per-event notification preferences from the company-wide defaults
      // (or "everything on" if no defaults are configured). Failure here is
      // non-fatal — the ESS prefs page falls back to the same defaults at read
      // time, so a missed seed only affects subsequent admin reporting.
      try {
        await seedNotificationPreferencesForEmployee(emp.id, req.hrmsUser!.tenantId);
      } catch (e) {
        console.error("Notification preference seeding failed (non-fatal):", e);
      }

      if (dateOfJoining) {
        try {
          await autoCreateOnboardingChecklist(emp.id, dateOfJoining, req.hrmsUser!.tenantId);
        } catch (e) {
          console.error("Auto-checklist creation failed (non-fatal):", e);
        }
      }

      res.status(201).json(emp);
    } catch (err: unknown) {
      const e = err as { code?: string };
      if (e?.code === "23505") {
        res.status(409).json({ error: "Employee ID or email already exists" });
        return;
      }
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Safe minimal projection for the org chart — no salary, DOB, phone, etc.
// Available to all HRMS users (the chart is intended to be visible org-wide).
router.get("/employees/org-chart", requireHrmsUser, async (_req, res) => {
  try {
    const rows = await db
      .select({
        id: employeesTable.id,
        firstName: employeesTable.firstName,
        lastName: employeesTable.lastName,
        avatarUrl: employeesTable.avatarUrl,
        managerId: employeesTable.managerId,
        departmentId: employeesTable.departmentId,
        departmentName: departmentsTable.name,
        designationTitle: designationsTable.title,
        location: employeesTable.location,
        employmentType: employeesTable.employmentType,
      })
      .from(employeesTable)
      .leftJoin(departmentsTable, eq(employeesTable.departmentId, departmentsTable.id))
      .leftJoin(designationsTable, eq(employeesTable.designationId, designationsTable.id))
      .leftJoin(branchesTable, eq(employeesTable.branchId, branchesTable.id))
      .leftJoin(shiftTemplatesTable, eq(employeesTable.defaultShiftTemplateId, shiftTemplatesTable.id))
      .where(and(isNull(employeesTable.deletedAt), eq(employeesTable.isActive, true), eq(employeesTable.tenantId, _req.hrmsUser!.tenantId)));

    res.json({ data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Distinct skill names across all employees — powers the skill filter dropdown.
router.get("/employees/skills/distinct", requireHrmsUser, async (_req, res) => {
  try {
    const rows = await db
      .selectDistinct({ name: employeeSkillsTable.name })
      .from(employeeSkillsTable)
      .innerJoin(employeesTable, eq(employeesTable.id, employeeSkillsTable.employeeId))
      .where(and(isNull(employeesTable.deletedAt), eq(employeesTable.tenantId, _req.hrmsUser!.tenantId)))
      .orderBy(asc(employeeSkillsTable.name));
    res.json({ data: rows.map((r) => r.name) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Distinct certification names across all employees — powers the cert filter.
router.get("/employees/certifications/distinct", requireHrmsUser, async (_req, res) => {
  try {
    const rows = await db
      .selectDistinct({ name: employeeCertificationsTable.name })
      .from(employeeCertificationsTable)
      .innerJoin(employeesTable, eq(employeesTable.id, employeeCertificationsTable.employeeId))
      .where(and(isNull(employeesTable.deletedAt), eq(employeesTable.tenantId, _req.hrmsUser!.tenantId)))
      .orderBy(asc(employeeCertificationsTable.name));
    res.json({ data: rows.map((r) => r.name) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/employees/:id", requireHrmsUser, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const [emp] = await db
      .select(employeeSelect)
      .from(employeesTable)
      .leftJoin(departmentsTable, eq(employeesTable.departmentId, departmentsTable.id))
      .leftJoin(designationsTable, eq(employeesTable.designationId, designationsTable.id))
      .leftJoin(branchesTable, eq(employeesTable.branchId, branchesTable.id))
      .leftJoin(shiftTemplatesTable, eq(employeesTable.defaultShiftTemplateId, shiftTemplatesTable.id))
      .where(and(eq(employeesTable.id, id), isNull(employeesTable.deletedAt), eq(employeesTable.tenantId, req.hrmsUser!.tenantId)))
      .limit(1);

    if (!emp) {
      res.status(404).json({ error: "Employee not found" });
      return;
    }
    res.json(emp);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch(
  "/employees/:id",
  requireHrmsUser,
  requireRole("customer_admin", "hr_manager", "hr_executive"),
  async (req, res) => {
    try {
      const id = parseInt(String(req.params.id), 10);
      const {
        firstName, lastName, email, phone, dateOfBirth, gender,
        departmentId, designationId, employmentType, status,
        dateOfJoining, ctc, managerId, location, avatarUrl, isActive, timezone,
        branchId, defaultShiftTemplateId,
      } = req.body;

      if (timezone !== undefined && !isValidIanaTimezone(timezone)) {
        res.status(400).json({ error: "Invalid IANA timezone identifier" });
        return;
      }

      if (avatarUrl !== undefined && avatarUrl !== null) {
        if (!AVATAR_OBJECT_PATH_RE.test(avatarUrl) || await isObjectClaimedElsewhere(avatarUrl, req.hrmsUser!.tenantId)) {
          res.status(400).json({ error: "Invalid avatar object path" });
          return;
        }
      }

      const [existing] = await db
        .select()
        .from(employeesTable)
        .where(and(eq(employeesTable.id, id), isNull(employeesTable.deletedAt), eq(employeesTable.tenantId, req.hrmsUser!.tenantId)))
        .limit(1);

      if (!existing) {
        res.status(404).json({ error: "Employee not found" });
        return;
      }

      const [emp] = await db
        .update(employeesTable)
        .set({
          firstName, lastName, email, phone, dateOfBirth, gender,
          departmentId, designationId, employmentType, status,
          dateOfJoining, ctc, managerId, location, avatarUrl, isActive,
          ...(branchId !== undefined ? { branchId: branchId ? Number(branchId) : null } : {}),
          ...(defaultShiftTemplateId !== undefined ? { defaultShiftTemplateId: defaultShiftTemplateId ? Number(defaultShiftTemplateId) : null } : {}),
          ...(timezone !== undefined ? { timezone } : {}),
          updatedAt: new Date(),
        })
        .where(and(eq(employeesTable.id, id), isNull(employeesTable.deletedAt), eq(employeesTable.tenantId, req.hrmsUser!.tenantId)))
        .returning();

      if (!emp) {
        res.status(404).json({ error: "Employee not found" });
        return;
      }

      const changedById = req.hrmsUser?.id ?? null;
      const coreFields: Array<{ key: keyof typeof existing; val: unknown }> = [
        { key: "firstName", val: firstName },
        { key: "lastName", val: lastName },
        { key: "email", val: email },
        { key: "phone", val: phone },
        { key: "dateOfBirth", val: dateOfBirth },
        { key: "gender", val: gender },
        { key: "departmentId", val: departmentId },
        { key: "designationId", val: designationId },
        { key: "employmentType", val: employmentType },
        { key: "status", val: status },
        { key: "dateOfJoining", val: dateOfJoining },
        { key: "ctc", val: ctc },
        { key: "managerId", val: managerId },
        { key: "location", val: location },
        { key: "timezone", val: timezone },
        { key: "isActive", val: isActive },
      ];
      for (const { key, val } of coreFields) {
        if (val !== undefined) {
          const oldVal = String(existing[key] ?? "");
          const newVal = String(val ?? "");
          await recordHistory(id, "Employee", key as string, oldVal === "null" ? null : oldVal, newVal === "null" ? null : newVal, changedById, req.hrmsUser!.tenantId);
        }
      }

      await logAudit({ user: req.hrmsUser, action: "UPDATE", module: "Employees", recordId: id, ipAddress: req.ip });

      if (dateOfJoining) {
        try {
          await autoCreateOnboardingChecklist(id, dateOfJoining, req.hrmsUser!.tenantId);
        } catch (e) {
          console.error("Auto-checklist creation on update failed (non-fatal):", e);
        }
      }

      res.json(emp);
    } catch (err: unknown) {
      const e = err as { code?: string };
      if (e?.code === "23505") {
        res.status(409).json({ error: "Email already exists" });
        return;
      }
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

router.delete(
  "/employees/:id",
  requireHrmsUser,
  requireRole("customer_admin", "hr_manager"),
  async (req, res) => {
    try {
      const id = parseInt(String(req.params.id), 10);
      const [emp] = await db
        .update(employeesTable)
        .set({ deletedAt: new Date(), isActive: false, updatedAt: new Date() })
        .where(and(eq(employeesTable.id, id), isNull(employeesTable.deletedAt), eq(employeesTable.tenantId, req.hrmsUser!.tenantId)))
        .returning();
      if (!emp) {
        res.status(404).json({ error: "Employee not found" });
        return;
      }
      await logAudit({ user: req.hrmsUser, action: "DELETE", module: "Employees", recordId: id, ipAddress: req.ip });
      res.status(204).send();
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

router.patch(
  "/employees/:id/status",
  requireHrmsUser,
  requireRole("customer_admin", "hr_manager"),
  async (req, res) => {
    try {
      const id = parseInt(String(req.params.id), 10);
      const { status } = req.body;
      if (!status) {
        res.status(400).json({ error: "status is required" });
        return;
      }
      const [existing] = await db
        .select({ status: employeesTable.status })
        .from(employeesTable)
        .where(and(eq(employeesTable.id, id), isNull(employeesTable.deletedAt), eq(employeesTable.tenantId, req.hrmsUser!.tenantId)))
        .limit(1);
      if (!existing) {
        res.status(404).json({ error: "Employee not found" });
        return;
      }
      const [emp] = await db
        .update(employeesTable)
        .set({ status, updatedAt: new Date() })
        .where(and(eq(employeesTable.id, id), isNull(employeesTable.deletedAt), eq(employeesTable.tenantId, req.hrmsUser!.tenantId)))
        .returning();
      if (!emp) {
        res.status(404).json({ error: "Employee not found" });
        return;
      }
      await recordHistory(id, "Employee", "status", existing.status, status, req.hrmsUser?.id ?? null, req.hrmsUser!.tenantId);
      await logAudit({ user: req.hrmsUser, action: "STATUS_CHANGE", module: "Employees", recordId: id, newValue: status, ipAddress: req.ip });
      res.json(emp);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

export default router;
