import { Router } from "express";
import { db } from "../lib/db";
import {
  shiftChangeRequestsTable,
  shiftTemplatesTable,
  shiftAssignmentsTable,
} from "@workspace/db/schema";
import { and, eq, desc, inArray, isNull, or, lte, gte } from "drizzle-orm";
import { requireHrmsUser, requireRole } from "../lib/auth";
import { logAudit } from "../lib/audit";
import { employeesTable } from "@workspace/db/schema";

const router = Router();

// List shift change requests
router.get("/shift-change-requests", requireHrmsUser, async (req, res) => {
  try {
    const tenantId = req.hrmsUser!.tenantId;
    const role = req.hrmsUser!.role;
    const employeeId = req.hrmsUser!.employeeId;
    const canSeeAll = ["customer_admin", "hr_manager", "hr_executive", "hod"].includes(role);

    const whereClause = canSeeAll
      ? eq(shiftChangeRequestsTable.tenantId, tenantId)
      : and(
          eq(shiftChangeRequestsTable.tenantId, tenantId),
          employeeId
            ? eq(shiftChangeRequestsTable.employeeId, employeeId)
            : eq(shiftChangeRequestsTable.tenantId, tenantId),
        );

    const rows = await db
      .select({
        id: shiftChangeRequestsTable.id,
        employeeId: shiftChangeRequestsTable.employeeId,
        firstName: employeesTable.firstName,
        lastName: employeesTable.lastName,
        empCode: employeesTable.employeeId,
        currentShiftId: shiftChangeRequestsTable.currentShiftId,
        requestedShiftId: shiftChangeRequestsTable.requestedShiftId,
        effectiveDate: shiftChangeRequestsTable.effectiveDate,
        reason: shiftChangeRequestsTable.reason,
        status: shiftChangeRequestsTable.status,
        managerRemarks: shiftChangeRequestsTable.managerRemarks,
        hrRemarks: shiftChangeRequestsTable.hrRemarks,
        managerActionedAt: shiftChangeRequestsTable.managerActionedAt,
        hrActionedAt: shiftChangeRequestsTable.hrActionedAt,
        createdAt: shiftChangeRequestsTable.createdAt,
      })
      .from(shiftChangeRequestsTable)
      .innerJoin(employeesTable, eq(employeesTable.id, shiftChangeRequestsTable.employeeId))
      .where(whereClause)
      .orderBy(desc(shiftChangeRequestsTable.createdAt));

    // Enrich with shift names
    const shiftIds = [
      ...new Set(
        rows.flatMap((r) =>
          [r.currentShiftId, r.requestedShiftId].filter((id): id is number => id != null),
        ),
      ),
    ];
    let shiftMap: Record<number, string> = {};
    if (shiftIds.length) {
      const shifts = await db
        .select({ id: shiftTemplatesTable.id, name: shiftTemplatesTable.name })
        .from(shiftTemplatesTable)
        .where(inArray(shiftTemplatesTable.id, shiftIds));
      shiftMap = Object.fromEntries(shifts.map((s) => [s.id, s.name]));
    }

    res.json(
      rows.map((r) => ({
        ...r,
        employeeName: `${r.firstName ?? ""} ${r.lastName ?? ""}`.trim(),
        currentShiftName: r.currentShiftId ? (shiftMap[r.currentShiftId] ?? "—") : "—",
        requestedShiftName: shiftMap[r.requestedShiftId] ?? "—",
      })),
    );
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to fetch shift change requests" });
  }
});

// Create shift change request (employee)
router.post("/shift-change-requests", requireHrmsUser, async (req, res) => {
  try {
    const tenantId = req.hrmsUser!.tenantId;
    const employeeId = req.hrmsUser!.employeeId;
    if (!employeeId) {
      res.status(400).json({ error: "No employee profile linked" });
      return;
    }

    const { requestedShiftId, effectiveDate, reason } = req.body as {
      requestedShiftId: number;
      effectiveDate: string;
      reason: string;
    };
    if (!requestedShiftId || !effectiveDate || !reason?.trim()) {
      res.status(400).json({ error: "requestedShiftId, effectiveDate and reason are required" });
      return;
    }

    // Get employee's currently assigned shift (most recent active assignment)
    const [currentAssignment] = await db
      .select({ shiftId: shiftAssignmentsTable.shiftTemplateId })
      .from(shiftAssignmentsTable)
      .where(
        and(
          eq(shiftAssignmentsTable.employeeId, employeeId),
          eq(shiftAssignmentsTable.tenantId, tenantId),
        ),
      )
      .orderBy(desc(shiftAssignmentsTable.effectiveFrom))
      .limit(1);

    const [created] = await db
      .insert(shiftChangeRequestsTable)
      .values({
        tenantId,
        employeeId,
        currentShiftId: currentAssignment?.shiftId ?? null,
        requestedShiftId,
        effectiveDate,
        reason: reason.trim(),
      })
      .returning();

    await logAudit({ user: req.hrmsUser, action: "CREATE", module: "SHIFT_CHANGE", recordId: created.id, ipAddress: req.ip });
    res.status(201).json(created);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to create shift change request" });
  }
});

// Cancel shift change request (employee)
router.post("/shift-change-requests/:id/cancel", requireHrmsUser, async (req, res) => {
  try {
    const tenantId = req.hrmsUser!.tenantId;
    const employeeId = req.hrmsUser!.employeeId;
    const id = Number(req.params.id);

    const [existing] = await db
      .select()
      .from(shiftChangeRequestsTable)
      .where(
        and(
          eq(shiftChangeRequestsTable.id, id),
          eq(shiftChangeRequestsTable.tenantId, tenantId),
        ),
      );

    if (!existing) {
      res.status(404).json({ error: "Request not found" });
      return;
    }
    if (existing.employeeId !== employeeId) {
      res.status(403).json({ error: "Not authorized" });
      return;
    }
    if (existing.status !== "Pending") {
      res.status(400).json({ error: "Only pending requests can be cancelled" });
      return;
    }

    const [updated] = await db
      .update(shiftChangeRequestsTable)
      .set({ status: "Cancelled", updatedAt: new Date() })
      .where(eq(shiftChangeRequestsTable.id, id))
      .returning();

    await logAudit({ user: req.hrmsUser, action: "UPDATE", module: "SHIFT_CHANGE", recordId: id, ipAddress: req.ip });
    res.json(updated);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to cancel shift change request" });
  }
});

// Approve/Reject (manager or HR)
router.post(
  "/shift-change-requests/:id/action",
  requireHrmsUser,
  requireRole("customer_admin", "hr_manager", "hr_executive", "hod"),
  async (req, res) => {
    try {
      const tenantId = req.hrmsUser!.tenantId;
      const userId = req.hrmsUser!.id;
      const id = Number(req.params.id);
      const { action, remarks } = req.body as { action: "Approved" | "Rejected"; remarks?: string };

      if (!["Approved", "Rejected"].includes(action)) {
        res.status(400).json({ error: "action must be Approved or Rejected" });
        return;
      }

      const [existing] = await db
        .select()
        .from(shiftChangeRequestsTable)
        .where(
          and(
            eq(shiftChangeRequestsTable.id, id),
            eq(shiftChangeRequestsTable.tenantId, tenantId),
          ),
        );

      if (!existing) {
        res.status(404).json({ error: "Request not found" });
        return;
      }
      if (existing.status !== "Pending") {
        res.status(400).json({ error: "Request is no longer pending" });
        return;
      }

      const now = new Date();
      const role = req.hrmsUser!.role;
      const isHr = ["customer_admin", "hr_manager", "hr_executive"].includes(role);

      const [updated] = await db
        .update(shiftChangeRequestsTable)
        .set({
          status: action,
          ...(isHr
            ? {
                hrActionedById: userId,
                hrRemarks: remarks ?? null,
                hrActionedAt: now,
              }
            : {
                managerActionedById: userId,
                managerRemarks: remarks ?? null,
                managerActionedAt: now,
              }),
          updatedAt: now,
        })
        .where(eq(shiftChangeRequestsTable.id, id))
        .returning();

      // If approved, close the old active assignment and create a new one in a transaction
      if (action === "Approved" && existing.requestedShiftId) {
        const effectiveDate = existing.effectiveDate; // "YYYY-MM-DD"
        // Calculate effectiveTo for the old assignment (day before effectiveDate)
        const effectiveDateObj = new Date(effectiveDate + "T00:00:00Z");
        effectiveDateObj.setUTCDate(effectiveDateObj.getUTCDate() - 1);
        const dayBefore = effectiveDateObj.toISOString().split("T")[0];

        await db.transaction(async (tx) => {
          // Close current active assignment (effectiveTo = effectiveDate - 1 day)
          await tx
            .update(shiftAssignmentsTable)
            .set({ effectiveTo: dayBefore, updatedAt: new Date() })
            .where(
              and(
                eq(shiftAssignmentsTable.employeeId, existing.employeeId),
                eq(shiftAssignmentsTable.tenantId, tenantId),
                or(
                  isNull(shiftAssignmentsTable.effectiveTo),
                  gte(shiftAssignmentsTable.effectiveTo, effectiveDate),
                ),
              ),
            );

          // Insert the new assignment
          await tx.insert(shiftAssignmentsTable).values({
            tenantId,
            employeeId: existing.employeeId,
            shiftTemplateId: existing.requestedShiftId!,
            effectiveFrom: effectiveDate,
            assignedById: userId,
          });
        });
      }

      await logAudit({ user: req.hrmsUser, action: `ACTION_${action.toUpperCase()}`, module: "SHIFT_CHANGE", recordId: id, ipAddress: req.ip });
      res.json(updated);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to process shift change request" });
    }
  },
);

export default router;
