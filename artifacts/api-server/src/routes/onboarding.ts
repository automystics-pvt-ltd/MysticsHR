import { Router } from "express";
import { requireHrmsUser, requireRole } from "../lib/auth";
import { logAudit } from "../lib/audit";
import { db } from "../lib/db";
import {
  onboardingChecklistsTable,
  onboardingTasksTable,
  inductionSessionsTable,
  employeesTable,
  departmentsTable,
  designationsTable,
  hrmsUsersTable,
  preOnboardingRecordsTable,
  candidatesTable,
  employeeProfilesTable,
} from "@workspace/db/schema";
import { eq, sql, desc, and } from "drizzle-orm";
import QRCode from "qrcode";
import { PDFDocument, rgb, StandardFonts, PDFFont, PDFPage } from "pdf-lib";
import { DEFAULT_ONBOARDING_TASKS } from "../lib/onboarding-utils";
import { getIdCardConfig, embedLogoImage, hexToRgbTriple, type IdCardConfig } from "../lib/tenantBranding";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage";

const router = Router();

const HR_ROLES = ["customer_admin", "hr_manager", "hr_executive"] as const;
const HR_READ_ROLES = ["customer_admin", "hr_manager", "hr_executive", "hod", "payroll_admin"] as const;

function buildAppUrl(path: string): string {
  const base = process.env.APP_URL
    ?? (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "");
  if (!base) return path;
  return `${base.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

async function recomputeChecklist(checklistId: number, tenantId: number) {
  const tasks = await db
    .select()
    .from(onboardingTasksTable)
    .where(and(eq(onboardingTasksTable.checklistId, checklistId), eq(onboardingTasksTable.tenantId, tenantId)));
  const total = tasks.length || 1;
  const completed = tasks.filter((t) => t.completedAt !== null).length;
  const pct = Math.round((completed / total) * 100);
  const status = pct === 100 ? "Completed" : pct === 0 ? "Not Started" : "In Progress";
  const updates: Record<string, unknown> = { completionPercentage: pct, status, updatedAt: new Date() };
  await db
    .update(onboardingChecklistsTable)
    .set(updates)
    .where(and(eq(onboardingChecklistsTable.id, checklistId), eq(onboardingChecklistsTable.tenantId, tenantId)));
  return { pct, status };
}

const checklistSelect = {
  id: onboardingChecklistsTable.id,
  employeeId: onboardingChecklistsTable.employeeId,
  employeeName: sql<string>`${employeesTable.firstName} || ' ' || ${employeesTable.lastName}`,
  employeeCode: employeesTable.employeeId,
  departmentName: departmentsTable.name,
  status: onboardingChecklistsTable.status,
  completionPercentage: onboardingChecklistsTable.completionPercentage,
  joiningDate: onboardingChecklistsTable.joiningDate,
  welcomeEmailSentAt: onboardingChecklistsTable.welcomeEmailSentAt,
  idCardGeneratedAt: onboardingChecklistsTable.idCardGeneratedAt,
  notes: onboardingChecklistsTable.notes,
  createdAt: onboardingChecklistsTable.createdAt,
  updatedAt: onboardingChecklistsTable.updatedAt,
};

router.get("/onboarding/checklists", requireHrmsUser, requireRole(...HR_READ_ROLES), async (req, res) => {
  try {
    const { status } = req.query as Record<string, string>;
    const tenantId = req.hrmsUser!.tenantId;
    const query = db
      .select(checklistSelect)
      .from(onboardingChecklistsTable)
      .leftJoin(employeesTable, and(eq(onboardingChecklistsTable.employeeId, employeesTable.id), eq(employeesTable.tenantId, tenantId)))
      .leftJoin(departmentsTable, and(eq(employeesTable.departmentId, departmentsTable.id), eq(departmentsTable.tenantId, tenantId)));
    
    const conds = [eq(onboardingChecklistsTable.tenantId, tenantId)];
    if (status) conds.push(sql`${onboardingChecklistsTable.status} = ${status}`);
    
    const rows = await query.where(and(...conds)).orderBy(desc(onboardingChecklistsTable.createdAt));
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post(
  "/employees/:id/onboarding-checklist",
  requireHrmsUser,
  requireRole(...HR_ROLES),
  async (req, res) => {
    try {
      const employeeId = parseInt(String(req.params.id), 10);
      const tenantId = req.hrmsUser!.tenantId;
      const existing = await db
        .select({ id: onboardingChecklistsTable.id })
        .from(onboardingChecklistsTable)
        .where(and(eq(onboardingChecklistsTable.employeeId, employeeId), eq(onboardingChecklistsTable.tenantId, tenantId)))
        .limit(1);
      if (existing.length > 0) {
        res.status(409).json({ error: "Onboarding checklist already exists for this employee" });
        return;
      }
      const { joiningDate, notes } = req.body ?? {};
      const [checklist] = await db
        .insert(onboardingChecklistsTable)
        .values({ tenantId, employeeId, joiningDate: joiningDate ?? null, notes: notes ?? null })
        .returning();

      const taskDueDate = joiningDate ?? null;
      for (const t of DEFAULT_ONBOARDING_TASKS) {
        await db.insert(onboardingTasksTable).values({
          tenantId,
          checklistId: checklist.id,
          title: t.title,
          category: t.category,
          assigneeRole: t.assigneeRole,
          dueDate: taskDueDate,
        });
      }
      await logAudit({ user: req.hrmsUser, action: "CREATE", module: "OnboardingChecklist", recordId: checklist.id, ipAddress: req.ip });
      res.status(201).json(checklist);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

router.post(
  "/employees/:id/onboarding-checklist/welcome-email",
  requireHrmsUser,
  requireRole(...HR_ROLES),
  async (req, res) => {
    try {
      const employeeId = parseInt(String(req.params.id), 10);
      const tenantId = req.hrmsUser!.tenantId;
      const [checklist] = await db
        .select({ id: onboardingChecklistsTable.id, welcomeEmailSentAt: onboardingChecklistsTable.welcomeEmailSentAt })
        .from(onboardingChecklistsTable)
        .where(and(eq(onboardingChecklistsTable.employeeId, employeeId), eq(onboardingChecklistsTable.tenantId, tenantId)))
        .limit(1);
      if (!checklist) {
        res.status(404).json({ error: "Onboarding checklist not found for this employee" });
        return;
      }
      const sentAt = new Date();
      const [updated] = await db
        .update(onboardingChecklistsTable)
        .set({ welcomeEmailSentAt: sentAt, updatedAt: sentAt })
        .where(and(eq(onboardingChecklistsTable.id, checklist.id), eq(onboardingChecklistsTable.tenantId, tenantId)))
        .returning();
      await logAudit({ user: req.hrmsUser, action: "SEND_WELCOME_EMAIL", module: "OnboardingChecklist", recordId: checklist.id, ipAddress: req.ip });
      // Dispatch onboarding_access notification to the new employee
      const [empUser] = await db.select({ email: hrmsUsersTable.email, name: hrmsUsersTable.name })
        .from(hrmsUsersTable).where(and(eq(hrmsUsersTable.employeeId, employeeId), eq(hrmsUsersTable.tenantId, tenantId))).limit(1);
      if (empUser?.email) {
        import("../lib/notification-service").then(({ dispatchNotification }) => {
          dispatchNotification({
            eventType: "onboarding_access", module: "onboarding",
            recipientEmail: empUser.email, recipientName: empUser.name ?? "",
            recipientEmployeeDbId: employeeId,
            variables: { recipientName: empUser.name ?? "" },
            entityType: "onboarding_checklist", entityId: checklist.id,
          
          tenantId: req.hrmsUser!.tenantId,}).catch(() => {});
        }).catch(() => {});
      }
      res.json({ welcomeEmailSentAt: updated.welcomeEmailSentAt, message: "Welcome email trigger recorded" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

async function getChecklistWithTasks(checklistId: number, tenantId: number) {
  const [checklist] = await db
    .select(checklistSelect)
    .from(onboardingChecklistsTable)
    .leftJoin(employeesTable, and(eq(onboardingChecklistsTable.employeeId, employeesTable.id), eq(employeesTable.tenantId, tenantId)))
    .leftJoin(departmentsTable, and(eq(employeesTable.departmentId, departmentsTable.id), eq(departmentsTable.tenantId, tenantId)))
    .where(and(eq(onboardingChecklistsTable.id, checklistId), eq(onboardingChecklistsTable.tenantId, tenantId)))
    .limit(1);
  if (!checklist) return null;
  const tasks = await db
    .select()
    .from(onboardingTasksTable)
    .where(and(eq(onboardingTasksTable.checklistId, checklistId), eq(onboardingTasksTable.tenantId, tenantId)))
    .orderBy(onboardingTasksTable.category, onboardingTasksTable.id);
  return { checklist, tasks };
}

router.get("/employees/:id/onboarding-checklist", requireHrmsUser, requireRole(...HR_READ_ROLES, "employee"), async (req, res) => {
  try {
    const employeeId = parseInt(String(req.params.id), 10);
    const tenantId = req.hrmsUser!.tenantId;
    if (req.hrmsUser?.role === "employee") {
      const [hrmsUser] = await db
        .select({ employeeId: hrmsUsersTable.employeeId })
        .from(hrmsUsersTable)
        .where(and(eq(hrmsUsersTable.id, req.hrmsUser.id), eq(hrmsUsersTable.tenantId, tenantId)))
        .limit(1);
      if (!hrmsUser?.employeeId || hrmsUser.employeeId !== employeeId) {
        res.status(403).json({ error: "Access denied. You can only view your own onboarding checklist." });
        return;
      }
    }
    const [cl] = await db
      .select({ id: onboardingChecklistsTable.id })
      .from(onboardingChecklistsTable)
      .where(and(eq(onboardingChecklistsTable.employeeId, employeeId), eq(onboardingChecklistsTable.tenantId, tenantId)))
      .limit(1);
    if (!cl) {
      res.status(404).json({ error: "Onboarding checklist not found" });
      return;
    }
    const detail = await getChecklistWithTasks(cl.id, tenantId);
    res.json(detail);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/onboarding/checklists/:id", requireHrmsUser, requireRole(...HR_READ_ROLES, "employee"), async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const tenantId = req.hrmsUser!.tenantId;
    if (req.hrmsUser?.role === "employee") {
      const [hrmsUser] = await db
        .select({ employeeId: hrmsUsersTable.employeeId })
        .from(hrmsUsersTable)
        .where(and(eq(hrmsUsersTable.id, req.hrmsUser.id), eq(hrmsUsersTable.tenantId, tenantId)))
        .limit(1);
      const [cl] = await db
        .select({ employeeId: onboardingChecklistsTable.employeeId })
        .from(onboardingChecklistsTable)
        .where(and(eq(onboardingChecklistsTable.id, id), eq(onboardingChecklistsTable.tenantId, tenantId)))
        .limit(1);
      if (!hrmsUser?.employeeId || !cl || cl.employeeId !== hrmsUser.employeeId) {
        res.status(403).json({ error: "Access denied. You can only view your own onboarding checklist." });
        return;
      }
    }
    const detail = await getChecklistWithTasks(id, tenantId);
    if (!detail) {
      res.status(404).json({ error: "Checklist not found" });
      return;
    }
    res.json(detail);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/onboarding/checklists/:id", requireHrmsUser, requireRole(...HR_ROLES), async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const tenantId = req.hrmsUser!.tenantId;
    const { joiningDate, notes } = req.body;
    const [row] = await db
      .update(onboardingChecklistsTable)
      .set({ joiningDate: joiningDate ?? null, notes: notes ?? null, updatedAt: new Date() })
      .where(and(eq(onboardingChecklistsTable.id, id), eq(onboardingChecklistsTable.tenantId, tenantId)))
      .returning();
    if (!row) { res.status(404).json({ error: "Checklist not found" }); return; }
    res.json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/onboarding/checklists/:id/tasks", requireHrmsUser, requireRole(...HR_READ_ROLES), async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const tenantId = req.hrmsUser!.tenantId;
    const tasks = await db
      .select()
      .from(onboardingTasksTable)
      .where(and(eq(onboardingTasksTable.checklistId, id), eq(onboardingTasksTable.tenantId, tenantId)))
      .orderBy(onboardingTasksTable.category, onboardingTasksTable.id);
    res.json(tasks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/onboarding/checklists/:id/tasks", requireHrmsUser, requireRole(...HR_ROLES), async (req, res) => {
  try {
    const checklistId = parseInt(String(req.params.id), 10);
    const tenantId = req.hrmsUser!.tenantId;
    const { title, description, category, assigneeRole, dueDate, notes } = req.body;
    if (!title || !category) {
      res.status(400).json({ error: "title and category are required" });
      return;
    }
    const [task] = await db
      .insert(onboardingTasksTable)
      .values({ tenantId, checklistId, title, description, category, assigneeRole, dueDate, notes })
      .returning();
    await recomputeChecklist(checklistId, tenantId);
    await logAudit({ user: req.hrmsUser, action: "CREATE", module: "OnboardingTask", recordId: task.id, ipAddress: req.ip });
    res.status(201).json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/onboarding/tasks/:id", requireHrmsUser, requireRole(...HR_ROLES), async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const tenantId = req.hrmsUser!.tenantId;
    const { title, description, category, assigneeRole, dueDate, notes } = req.body;
    const [task] = await db
      .update(onboardingTasksTable)
      .set({ title, description, category, assigneeRole, dueDate, notes, updatedAt: new Date() })
      .where(and(eq(onboardingTasksTable.id, id), eq(onboardingTasksTable.tenantId, tenantId)))
      .returning();
    if (!task) { res.status(404).json({ error: "Task not found" }); return; }
    res.json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/onboarding/tasks/:id", requireHrmsUser, requireRole(...HR_ROLES), async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const tenantId = req.hrmsUser!.tenantId;
    const [task] = await db.delete(onboardingTasksTable).where(and(eq(onboardingTasksTable.id, id), eq(onboardingTasksTable.tenantId, tenantId))).returning();
    if (!task) { res.status(404).json({ error: "Task not found" }); return; }
    await recomputeChecklist(task.checklistId, tenantId);
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/onboarding/tasks/:id/complete", requireHrmsUser, requireRole(...HR_ROLES, "hod", "employee"), async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const tenantId = req.hrmsUser!.tenantId;
    const { notes } = req.body ?? {};

    const [existingTask] = await db
      .select()
      .from(onboardingTasksTable)
      .where(and(eq(onboardingTasksTable.id, id), eq(onboardingTasksTable.tenantId, tenantId)))
      .limit(1);
    if (!existingTask) { res.status(404).json({ error: "Task not found" }); return; }

    if (req.hrmsUser?.role === "employee") {
      if (existingTask.assigneeRole !== "employee") {
        res.status(403).json({ error: "You can only complete tasks assigned to employees." });
        return;
      }
      const [checklist] = await db
        .select({ employeeId: onboardingChecklistsTable.employeeId })
        .from(onboardingChecklistsTable)
        .where(and(eq(onboardingChecklistsTable.id, existingTask.checklistId), eq(onboardingChecklistsTable.tenantId, tenantId)))
        .limit(1);
      const [hrmsUser] = await db
        .select({ employeeId: hrmsUsersTable.employeeId })
        .from(hrmsUsersTable)
        .where(and(eq(hrmsUsersTable.id, req.hrmsUser.id), eq(hrmsUsersTable.tenantId, tenantId)))
        .limit(1);
      if (!checklist || !hrmsUser?.employeeId || checklist.employeeId !== hrmsUser.employeeId) {
        res.status(403).json({ error: "You can only complete tasks in your own onboarding checklist." });
        return;
      }
    }

    const [task] = await db
      .update(onboardingTasksTable)
      .set({
        completedAt: new Date(),
        completedById: req.hrmsUser?.id ?? null,
        notes: notes ?? null,
        updatedAt: new Date(),
      })
      .where(and(eq(onboardingTasksTable.id, id), eq(onboardingTasksTable.tenantId, tenantId)))
      .returning();
    if (!task) { res.status(404).json({ error: "Task not found" }); return; }
    await recomputeChecklist(task.checklistId, tenantId);
    await logAudit({ user: req.hrmsUser, action: "COMPLETE", module: "OnboardingTask", recordId: id, ipAddress: req.ip });
    res.json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/onboarding/tasks/:id/uncomplete", requireHrmsUser, requireRole(...HR_ROLES, "hod"), async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const tenantId = req.hrmsUser!.tenantId;
    const [task] = await db
      .update(onboardingTasksTable)
      .set({ completedAt: null, completedById: null, updatedAt: new Date() })
      .where(and(eq(onboardingTasksTable.id, id), eq(onboardingTasksTable.tenantId, tenantId)))
      .returning();
    if (!task) { res.status(404).json({ error: "Task not found" }); return; }
    await recomputeChecklist(task.checklistId, tenantId);
    res.json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/employees/:id/induction-sessions", requireHrmsUser, requireRole(...HR_READ_ROLES), async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const tenantId = req.hrmsUser!.tenantId;
    const sessions = await db
      .select()
      .from(inductionSessionsTable)
      .where(and(eq(inductionSessionsTable.employeeId, id), eq(inductionSessionsTable.tenantId, tenantId)))
      .orderBy(desc(inductionSessionsTable.sessionDate));
    res.json(sessions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/employees/:id/induction-sessions", requireHrmsUser, requireRole(...HR_ROLES), async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const tenantId = req.hrmsUser!.tenantId;
    const { sessionDate, trainerName, topics, durationMinutes, notes } = req.body;
    if (!sessionDate || !trainerName) {
      res.status(400).json({ error: "sessionDate and trainerName are required" });
      return;
    }
    const [session] = await db
      .insert(inductionSessionsTable)
      .values({
        tenantId,
        employeeId: id,
        sessionDate,
        trainerName,
        topics,
        durationMinutes,
        notes,
        recordedById: req.hrmsUser?.id ?? null,
      })
      .returning();
    await logAudit({ user: req.hrmsUser, action: "CREATE", module: "InductionSession", recordId: session.id, ipAddress: req.ip });
    res.status(201).json(session);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/induction-sessions/:id", requireHrmsUser, requireRole(...HR_ROLES), async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const tenantId = req.hrmsUser!.tenantId;
    const { sessionDate, trainerName, topics, durationMinutes, notes } = req.body;
    const [session] = await db
      .update(inductionSessionsTable)
      .set({ sessionDate, trainerName, topics, durationMinutes, notes, updatedAt: new Date() })
      .where(and(eq(inductionSessionsTable.id, id), eq(inductionSessionsTable.tenantId, tenantId)))
      .returning();
    if (!session) { res.status(404).json({ error: "Session not found" }); return; }
    res.json(session);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/induction-sessions/:id", requireHrmsUser, requireRole(...HR_ROLES), async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const tenantId = req.hrmsUser!.tenantId;
    await db.delete(inductionSessionsTable).where(and(eq(inductionSessionsTable.id, id), eq(inductionSessionsTable.tenantId, tenantId)));
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

class IdCardBlockedError extends Error {
  constructor(public statusPayload: Record<string, unknown>) { super("ID card blocked"); }
}

async function resolveIdCardEmployee(id: number, tenantId: number) {
  const [emp] = await db
    .select({
      id: employeesTable.id,
      employeeId: employeesTable.employeeId,
      firstName: employeesTable.firstName,
      lastName: employeesTable.lastName,
      email: employeesTable.email,
      avatarUrl: employeesTable.avatarUrl,
      designationTitle: designationsTable.title,
      departmentName: departmentsTable.name,
      bloodGroup: employeeProfilesTable.bloodGroup,
      emergencyContactName: employeeProfilesTable.emergencyContactName,
      emergencyContactPhone: employeeProfilesTable.emergencyContactPhone,
      emergencyContactRelation: employeeProfilesTable.emergencyContactRelation,
    })
    .from(employeesTable)
    .leftJoin(designationsTable, and(eq(employeesTable.designationId, designationsTable.id), eq(designationsTable.tenantId, tenantId)))
    .leftJoin(departmentsTable, and(eq(employeesTable.departmentId, departmentsTable.id), eq(departmentsTable.tenantId, tenantId)))
    .leftJoin(employeeProfilesTable, and(eq(employeeProfilesTable.employeeId, employeesTable.id), eq(employeeProfilesTable.tenantId, tenantId)))
    .where(and(eq(employeesTable.id, id), eq(employeesTable.tenantId, tenantId)))
    .limit(1);

  if (!emp) throw new IdCardBlockedError({ status: 404, body: { error: "Employee not found" } });

  const [checklist] = await db
    .select()
    .from(onboardingChecklistsTable)
    .where(and(eq(onboardingChecklistsTable.employeeId, id), eq(onboardingChecklistsTable.tenantId, tenantId)))
    .limit(1);

  if (!checklist || checklist.completionPercentage < 100) {
    throw new IdCardBlockedError({
      status: 403,
      body: {
        error: "ID card cannot be generated: onboarding checklist is not 100% complete.",
        completionPercentage: checklist?.completionPercentage ?? 0,
      },
    });
  }

  const [preOnboardingRecord] = await db
    .select({ completionPercentage: preOnboardingRecordsTable.completionPercentage })
    .from(preOnboardingRecordsTable)
    .innerJoin(candidatesTable, eq(preOnboardingRecordsTable.candidateId, candidatesTable.id))
    .where(and(eq(candidatesTable.email, emp.email), eq(preOnboardingRecordsTable.tenantId, tenantId)))
    .limit(1);

  if (preOnboardingRecord && preOnboardingRecord.completionPercentage < 100) {
    throw new IdCardBlockedError({
      status: 403,
      body: {
        error: "ID card cannot be generated: pre-onboarding document verification is not complete.",
        documentCompletionPercentage: preOnboardingRecord.completionPercentage,
      },
    });
  }

  return { emp, checklist };
}

async function embedEmployeePhoto(pdfDoc: PDFDocument, avatarUrl: string | null | undefined) {
  if (!avatarUrl) return null;
  try {
    const objectStorageService = new ObjectStorageService();
    const file = await objectStorageService.getObjectEntityFile(avatarUrl);
    const response = await objectStorageService.downloadObject(file);
    if (!response.body) return null;
    const buf = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("png")) return await pdfDoc.embedPng(buf);
    return await pdfDoc.embedJpg(buf);
  } catch (e) {
    if (!(e instanceof ObjectNotFoundError)) console.error("Employee photo embed failed (non-fatal):", e);
    return null;
  }
}

router.get("/employees/:id/id-card", requireHrmsUser, requireRole(...HR_READ_ROLES, "employee"), async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const tenantId = req.hrmsUser!.tenantId;
    if (req.hrmsUser?.role === "employee") {
      const [hrmsUser] = await db
        .select({ employeeId: hrmsUsersTable.employeeId })
        .from(hrmsUsersTable)
        .where(and(eq(hrmsUsersTable.id, req.hrmsUser.id), eq(hrmsUsersTable.tenantId, tenantId)))
        .limit(1);
      if (!hrmsUser?.employeeId || hrmsUser.employeeId !== id) {
        res.status(403).json({ error: "Access denied. You can only download your own ID card." });
        return;
      }
    }

    let emp, checklist;
    try {
      ({ emp, checklist } = await resolveIdCardEmployee(id, tenantId));
    } catch (e) {
      if (e instanceof IdCardBlockedError) { res.status(e.statusPayload.status as number).json(e.statusPayload.body); return; }
      throw e;
    }

    const config = await getIdCardConfig(tenantId);
    const { fields } = config;
    const employeeName = `${emp.firstName} ${emp.lastName}`;
    const profileUrl = buildAppUrl(`/employees/${emp.id}`);
    const qrCodeDataUrl = await QRCode.toDataURL(profileUrl, { width: 120, margin: 1 });
    const qrBuf = Buffer.from(qrCodeDataUrl.replace(/^data:image\/png;base64,/, ""), "base64");

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([226, 340]);
    const { width, height } = page.getSize();

    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const [br, bg, bb] = hexToRgbTriple(config.brandColorHex);
    const blue = rgb(br, bg, bb);
    const dark = rgb(0.118, 0.176, 0.298);
    const white = rgb(1, 1, 1);
    const muted = rgb(0.580, 0.627, 0.729);
    const panel = rgb(0.200, 0.263, 0.384);

    page.drawRectangle({ x: 0, y: 0, width, height, color: dark });
    page.drawRectangle({ x: 0, y: height - 8, width, height: 8, color: blue });
    page.drawRectangle({ x: 0, y: 0, width, height: 8, color: blue });

    const logoImg = await embedLogoImage(pdfDoc, config.logoDataUri);
    if (logoImg) {
      const logoH = 14;
      const logoW = (logoImg.width / logoImg.height) * logoH;
      page.drawImage(logoImg, { x: (width - logoW) / 2, y: height - 26, width: logoW, height: logoH });
    } else {
      page.drawText(config.companyName, { x: 0, y: height - 28, size: 9, font: boldFont, color: white, maxWidth: width, lineHeight: 14 });
    }
    page.drawText(config.cardTitle, { x: 68, y: height - 40, size: 7, font: regularFont, color: muted });

    let y = height - 60;

    const photoImg = fields.photo ? await embedEmployeePhoto(pdfDoc, emp.avatarUrl) : null;
    if (fields.photo) {
      page.drawRectangle({ x: 83, y: y - 60, width: 60, height: 60, color: panel });
      if (photoImg) {
        page.drawImage(photoImg, { x: 83, y: y - 60, width: 60, height: 60 });
      } else {
        page.drawText("PHOTO", { x: 101, y: y - 34, size: 7, font: regularFont, color: muted });
      }
      y -= 76;
    }

    if (fields.nameAndId) {
      const nameWidth = boldFont.widthOfTextAtSize(employeeName, 11);
      page.drawText(employeeName, { x: (width - nameWidth) / 2, y, size: 11, font: boldFont, color: white });
      y -= 15;
    }

    if (fields.designationDept) {
      const desigText = (emp.designationTitle ?? "—").slice(0, 32);
      const desigWidth = regularFont.widthOfTextAtSize(desigText, 8);
      page.drawText(desigText, { x: (width - desigWidth) / 2, y, size: 8, font: regularFont, color: blue });
      y -= 10;
    }

    y -= 5;
    page.drawLine({ start: { x: 20, y }, end: { x: 206, y }, thickness: 0.5, color: panel });
    y -= 16;

    const rows2: Array<[string, string]> = [["Employee ID", emp.employeeId], ["Email", emp.email.slice(0, 26)]];
    if (fields.designationDept) rows2.splice(1, 0, ["Department", emp.departmentName ?? "—"]);
    if (fields.bloodGroup) rows2.push(["Blood Group", emp.bloodGroup ?? "—"]);
    if (fields.emergencyContact && (emp.emergencyContactName || emp.emergencyContactPhone)) {
      rows2.push(["Emergency", `${emp.emergencyContactName ?? "—"} ${emp.emergencyContactPhone ?? ""}`.trim().slice(0, 26)]);
    }
    rows2.forEach(([label, value], i) => {
      const rowY = y - i * 22;
      page.drawText(label + ":", { x: 25, y: rowY, size: 7, font: regularFont, color: muted });
      page.drawText(value, { x: 115, y: rowY, size: 7, font: boldFont, color: white });
    });
    y -= rows2.length * 22 + 6;

    page.drawLine({ start: { x: 20, y }, end: { x: 206, y }, thickness: 0.5, color: panel });
    y -= 66;

    if (fields.qrCode) {
      const qrImage = await pdfDoc.embedPng(qrBuf);
      page.drawImage(qrImage, { x: 83, y, width: 60, height: 60 });
      page.drawText("Scan to view profile", { x: 72, y: y - 16, size: 6, font: regularFont, color: muted });
      y -= 24;
    }

    if (fields.signatureLine) {
      y -= 8;
      page.drawLine({ start: { x: 40, y }, end: { x: 186, y }, thickness: 0.5, color: muted });
      page.drawText("Authorized Signature", { x: 68, y: y - 10, size: 6, font: regularFont, color: muted });
    }

    const pdfBytes = await pdfDoc.save();
    const pdfBuffer = Buffer.from(pdfBytes);

    await db
      .update(onboardingChecklistsTable)
      .set({ idCardGeneratedAt: new Date(), updatedAt: new Date() })
      .where(eq(onboardingChecklistsTable.id, checklist.id));

    await logAudit({ user: req.hrmsUser, action: "GENERATE_ID_CARD", module: "Onboarding", recordId: id, ipAddress: req.ip });

    // Dispatch id_card_generated notification to the employee
    if (emp.email) {
      const empName = `${emp.firstName} ${emp.lastName}`;
      import("../lib/notification-service").then(({ dispatchNotification }) => {
        dispatchNotification({
          eventType: "id_card_generated", module: "onboarding",
          recipientEmail: emp.email, recipientName: empName,
          recipientEmployeeDbId: emp.id,
          variables: { recipientName: empName, employeeId: String(emp.employeeId ?? "") },
          entityType: "onboarding_checklist", entityId: checklist.id,
        
        tenantId: req.hrmsUser!.tenantId,}).catch(() => {});
      }).catch(() => {});
    }

    res.set("Content-Type", "application/pdf");
    res.set("Content-Disposition", `attachment; filename="idcard_${emp.employeeId}.pdf"`);
    res.set("Content-Length", String(pdfBuffer.length));
    res.send(pdfBuffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// On-screen HTML preview (same rules/branding as the PDF; used by the ID card page before download).
router.get("/employees/:id/id-card/preview", requireHrmsUser, requireRole(...HR_READ_ROLES, "employee"), async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const tenantId = req.hrmsUser!.tenantId;
    if (req.hrmsUser?.role === "employee") {
      const [hrmsUser] = await db
        .select({ employeeId: hrmsUsersTable.employeeId })
        .from(hrmsUsersTable)
        .where(and(eq(hrmsUsersTable.id, req.hrmsUser.id), eq(hrmsUsersTable.tenantId, tenantId)))
        .limit(1);
      if (!hrmsUser?.employeeId || hrmsUser.employeeId !== id) {
        res.status(403).json({ error: "Access denied. You can only view your own ID card." });
        return;
      }
    }

    const { emp } = await resolveIdCardEmployee(id, tenantId);
    const config = await getIdCardConfig(tenantId);
    const { fields } = config;
    const employeeName = `${emp.firstName} ${emp.lastName}`;
    const profileUrl = buildAppUrl(`/employees/${emp.id}`);
    const qrCodeDataUrl = fields.qrCode ? await QRCode.toDataURL(profileUrl, { width: 160, margin: 1 }) : null;

    const rows: Array<[string, string]> = [["Employee ID", emp.employeeId]];
    if (fields.designationDept) rows.push(["Department", emp.departmentName ?? "—"]);
    rows.push(["Email", emp.email]);
    if (fields.bloodGroup) rows.push(["Blood Group", emp.bloodGroup ?? "—"]);
    if (fields.emergencyContact && (emp.emergencyContactName || emp.emergencyContactPhone)) {
      rows.push(["Emergency Contact", `${emp.emergencyContactName ?? "—"} (${emp.emergencyContactRelation ?? "—"}) — ${emp.emergencyContactPhone ?? "—"}`]);
    }

    // All values below originate from tenant-configured branding or employee
    // profile fields — both are attacker-controllable (a malicious admin or
    // an employee editing their own emergency contact). This HTML is opened
    // via document.write() in the client, so any unescaped value here is a
    // stored-XSS vector. Escape every interpolated string and validate the
    // two attribute-context values (brand color, logo data URI) against a
    // strict allowlist rather than escaping alone.
    const esc = (s: unknown): string => String(s ?? "").replace(/[&<>"']/g, (c) => (
      { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string
    ));
    const safeBrandColor = /^#[0-9a-fA-F]{3,8}$/.test(config.brandColorHex || "") ? config.brandColorHex! : "#1e293b";
    const safeLogoDataUri = typeof config.logoDataUri === "string" && /^data:image\/(png|jpeg|jpg|gif|webp);base64,[A-Za-z0-9+/=]+$/.test(config.logoDataUri)
      ? config.logoDataUri
      : null;

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8" /><style>
  body { font-family: Arial, sans-serif; margin: 0; padding: 24px; background: #f1f5f9; display: flex; justify-content: center; }
  .card { width: 300px; border-radius: 14px; overflow: hidden; background: #1e2d4c; color: white; box-shadow: 0 8px 24px rgba(0,0,0,0.2); }
  .stripe { height: 8px; background: ${safeBrandColor}; }
  .brand { text-align: center; padding: 10px 0 4px; }
  .brand img { max-height: 24px; max-width: 140px; }
  .brand .title { font-size: 10px; letter-spacing: 1px; color: #94a3b8; margin-top: 4px; }
  .photo { width: 90px; height: 90px; border-radius: 8px; margin: 6px auto; background: #2e3f61; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 11px; overflow: hidden; }
  .photo img { width: 100%; height: 100%; object-fit: cover; }
  .name { text-align: center; font-size: 16px; font-weight: bold; margin-top: 6px; }
  .desig { text-align: center; font-size: 12px; color: ${safeBrandColor}; margin-top: 2px; }
  .divider { border: none; border-top: 1px solid #2e3f61; margin: 14px 20px; }
  .rows { padding: 0 20px; }
  .row { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 8px; }
  .row .label { color: #94a3b8; }
  .qr { text-align: center; padding: 8px 0 20px; }
  .qr img { width: 100px; height: 100px; }
  .qr .hint { font-size: 9px; color: #94a3b8; margin-top: 4px; }
  .sig { margin: 0 30px 20px; border-top: 1px solid #94a3b8; text-align: center; padding-top: 6px; font-size: 9px; color: #94a3b8; }
</style></head>
<body>
  <div class="card">
    <div class="stripe"></div>
    <div class="brand">
      ${safeLogoDataUri ? `<img src="${safeLogoDataUri}" alt="Logo" />` : `<div style="font-weight:bold;font-size:13px;">${esc(config.companyName)}</div>`}
      <div class="title">${esc(config.cardTitle)}</div>
    </div>
    ${fields.photo ? `<div class="photo">${emp.avatarUrl ? `<img src="/api/employees/${emp.id}/avatar" />` : "PHOTO"}</div>` : ""}
    ${fields.nameAndId ? `<div class="name">${esc(employeeName)}</div>` : ""}
    ${fields.designationDept ? `<div class="desig">${esc(emp.designationTitle ?? "—")}</div>` : ""}
    <hr class="divider" />
    <div class="rows">
      ${rows.map(([label, value]) => `<div class="row"><span class="label">${esc(label)}</span><span>${esc(value)}</span></div>`).join("")}
    </div>
    ${fields.qrCode && qrCodeDataUrl ? `<div class="qr"><img src="${qrCodeDataUrl}" /><div class="hint">Scan to view profile</div></div>` : ""}
    ${fields.signatureLine ? `<div class="sig">Authorized Signature</div>` : `<div style="height:20px"></div>`}
  </div>
</body></html>`;

    res.json({ html });
  } catch (err) {
    if (err instanceof IdCardBlockedError) { res.status(err.statusPayload.status as number).json(err.statusPayload.body); return; }
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
