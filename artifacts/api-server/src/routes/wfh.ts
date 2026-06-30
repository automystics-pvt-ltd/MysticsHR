import { Router } from "express";
import { db } from "../lib/db";
import {
  wfhRequestsTable,
  employeesTable,
  hrmsUsersTable,
} from "@workspace/db/schema";
import { and, eq, desc, isNull, or, lte, gte, notInArray } from "drizzle-orm";
import { requireHrmsUser, requireRole } from "../lib/auth";
import { logAudit } from "../lib/audit";
import { notifyEmployee, notifyUser } from "../lib/notification-service";

const router = Router();

// List WFH requests — HR sees all; managers see their team's; employees see own
router.get("/wfh", requireHrmsUser, async (req, res) => {
  try {
    const tenantId = req.hrmsUser!.tenantId;
    const userId = req.hrmsUser!.id;
    const role = req.hrmsUser!.role;
    const employeeId = req.hrmsUser!.employeeId;

    const isHr = ["customer_admin", "hr_manager", "hr_executive"].includes(role);

    const rows = await db
      .select({
        id: wfhRequestsTable.id,
        employeeId: wfhRequestsTable.employeeId,
        fromDate: wfhRequestsTable.fromDate,
        toDate: wfhRequestsTable.toDate,
        reason: wfhRequestsTable.reason,
        status: wfhRequestsTable.status,
        managerRemarks: wfhRequestsTable.managerRemarks,
        hrRemarks: wfhRequestsTable.hrRemarks,
        managerActionedAt: wfhRequestsTable.managerActionedAt,
        hrActionedAt: wfhRequestsTable.hrActionedAt,
        createdAt: wfhRequestsTable.createdAt,
        firstName: employeesTable.firstName,
        lastName: employeesTable.lastName,
        empCode: employeesTable.employeeId,
      })
      .from(wfhRequestsTable)
      .leftJoin(employeesTable, eq(wfhRequestsTable.employeeId, employeesTable.id))
      .where(
        and(
          eq(wfhRequestsTable.tenantId, tenantId),
          isHr
            ? undefined
            : employeeId
            ? eq(wfhRequestsTable.employeeId, employeeId)
            : eq(wfhRequestsTable.tenantId, -1),
        )
      )
      .orderBy(desc(wfhRequestsTable.createdAt));

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create WFH request (employee self-service)
router.post("/wfh", requireHrmsUser, async (req, res) => {
  try {
    const tenantId = req.hrmsUser!.tenantId;
    const employeeId = req.hrmsUser!.employeeId;

    if (!employeeId) {
      res.status(403).json({ error: "You must be linked to an employee record to submit a WFH request" });
      return;
    }

    const { fromDate, toDate, reason } = req.body as { fromDate: string; toDate: string; reason: string };
    if (!fromDate || !toDate || !reason) {
      res.status(400).json({ error: "fromDate, toDate, and reason are required" });
      return;
    }
    if (toDate < fromDate) {
      res.status(400).json({ error: "toDate must be on or after fromDate" });
      return;
    }

    // Check for overlapping pending/approved WFH requests
    const [overlap] = await db
      .select({ id: wfhRequestsTable.id })
      .from(wfhRequestsTable)
      .where(
        and(
          eq(wfhRequestsTable.employeeId, employeeId),
          eq(wfhRequestsTable.tenantId, tenantId),
          notInArray(wfhRequestsTable.status, ["Rejected", "Cancelled"]),
          lte(wfhRequestsTable.fromDate, toDate),
          gte(wfhRequestsTable.toDate, fromDate),
        ),
      )
      .limit(1);
    if (overlap) {
      res.status(422).json({ error: "You already have a WFH request overlapping these dates" });
      return;
    }

    const [row] = await db
      .insert(wfhRequestsTable)
      .values({ tenantId, employeeId, fromDate, toDate, reason, status: "Pending" })
      .returning();

    await logAudit({ user: req.hrmsUser, action: "CREATE", module: "WFH", recordId: row.id, ipAddress: req.ip });
    notifyUser({ tenantId, userId: req.hrmsUser!.id, title: "WFH Request Submitted", message: `Your WFH request (${fromDate} – ${toDate}) is pending approval.`, entityType: "wfh_request", entityId: row.id }).catch(() => {});
    res.status(201).json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Cancel own WFH request
router.post("/wfh/:id/cancel", requireHrmsUser, async (req, res) => {
  try {
    const tenantId = req.hrmsUser!.tenantId;
    const employeeId = req.hrmsUser!.employeeId;
    const id = parseInt(req.params.id as string, 10);

    const [existing] = await db
      .select()
      .from(wfhRequestsTable)
      .where(and(eq(wfhRequestsTable.id, id), eq(wfhRequestsTable.tenantId, tenantId)))
      .limit(1);

    if (!existing) { res.status(404).json({ error: "Not found" }); return; }
    if (existing.employeeId !== employeeId) { res.status(403).json({ error: "Forbidden" }); return; }
    if (existing.status !== "Pending") { res.status(422).json({ error: "Only pending requests can be cancelled" }); return; }

    const [updated] = await db
      .update(wfhRequestsTable)
      .set({ status: "Cancelled", updatedAt: new Date() })
      .where(eq(wfhRequestsTable.id, id))
      .returning();

    await logAudit({ user: req.hrmsUser, action: "UPDATE", module: "WFH", recordId: id, ipAddress: req.ip });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Manager/HR approve or reject
router.post("/wfh/:id/action", requireHrmsUser, async (req, res) => {
  try {
    const tenantId = req.hrmsUser!.tenantId;
    const userId = req.hrmsUser!.id;
    const role = req.hrmsUser!.role;
    const id = parseInt(req.params.id as string, 10);

    const isHr = ["customer_admin", "hr_manager", "hr_executive"].includes(role);
    const isHod = role === "hod";
    if (!isHr && !isHod) { res.status(403).json({ error: "Insufficient role" }); return; }

    const { action, remarks } = req.body as { action: "Approved" | "Rejected"; remarks?: string };
    if (!["Approved", "Rejected"].includes(action)) { res.status(400).json({ error: "action must be Approved or Rejected" }); return; }

    const [existing] = await db
      .select()
      .from(wfhRequestsTable)
      .where(and(eq(wfhRequestsTable.id, id), eq(wfhRequestsTable.tenantId, tenantId)))
      .limit(1);

    if (!existing) { res.status(404).json({ error: "Not found" }); return; }
    if (existing.status !== "Pending") { res.status(422).json({ error: "Request is no longer pending" }); return; }

    const now = new Date();
    const updateFields = isHr
      ? {
          status: action as "Approved" | "Rejected",
          hrActionedById: userId,
          hrRemarks: remarks ?? null,
          hrActionedAt: now,
          updatedAt: now,
        }
      : {
          status: action as "Approved" | "Rejected",
          managerActionedById: userId,
          managerRemarks: remarks ?? null,
          managerActionedAt: now,
          updatedAt: now,
        };

    const [updated] = await db
      .update(wfhRequestsTable)
      .set(updateFields)
      .where(eq(wfhRequestsTable.id, id))
      .returning();

    await logAudit({ user: req.hrmsUser, action: "UPDATE", module: "WFH", recordId: id, ipAddress: req.ip });
    notifyEmployee({ tenantId, employeeId: existing.employeeId!, title: `WFH Request ${action}`, message: `Your WFH request has been ${action.toLowerCase()}.`, entityType: "wfh_request", entityId: id }).catch(() => {});
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
