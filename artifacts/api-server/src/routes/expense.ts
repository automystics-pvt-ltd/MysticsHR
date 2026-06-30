import { Router } from "express";
import { db } from "../lib/db";
import {
  expenseClaimsTable,
  expenseClaimItemsTable,
  employeesTable,
} from "@workspace/db/schema";
import { and, eq, desc, sql } from "drizzle-orm";
import { requireHrmsUser } from "../lib/auth";
import { logAudit } from "../lib/audit";

const router = Router();

// List expense claims
router.get("/expense-claims", requireHrmsUser, async (req, res) => {
  try {
    const tenantId = req.hrmsUser!.tenantId;
    const role = req.hrmsUser!.role;
    const employeeId = req.hrmsUser!.employeeId;

    const isHr = ["customer_admin", "hr_manager", "hr_executive"].includes(role);

    const rows = await db
      .select({
        id: expenseClaimsTable.id,
        employeeId: expenseClaimsTable.employeeId,
        title: expenseClaimsTable.title,
        claimDate: expenseClaimsTable.claimDate,
        totalAmount: expenseClaimsTable.totalAmount,
        status: expenseClaimsTable.status,
        notes: expenseClaimsTable.notes,
        managerRemarks: expenseClaimsTable.managerRemarks,
        hrRemarks: expenseClaimsTable.hrRemarks,
        financeRemarks: expenseClaimsTable.financeRemarks,
        paidDate: expenseClaimsTable.paidDate,
        createdAt: expenseClaimsTable.createdAt,
        firstName: employeesTable.firstName,
        lastName: employeesTable.lastName,
        empCode: employeesTable.employeeId,
      })
      .from(expenseClaimsTable)
      .leftJoin(employeesTable, eq(expenseClaimsTable.employeeId, employeesTable.id))
      .where(
        and(
          eq(expenseClaimsTable.tenantId, tenantId),
          !isHr && employeeId
            ? eq(expenseClaimsTable.employeeId, employeeId)
            : undefined,
        )
      )
      .orderBy(desc(expenseClaimsTable.createdAt));

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get single claim with items
router.get("/expense-claims/:id", requireHrmsUser, async (req, res) => {
  try {
    const tenantId = req.hrmsUser!.tenantId;
    const id = parseInt(req.params.id as string, 10);

    const [claim] = await db
      .select()
      .from(expenseClaimsTable)
      .where(and(eq(expenseClaimsTable.id, id), eq(expenseClaimsTable.tenantId, tenantId)))
      .limit(1);

    if (!claim) { res.status(404).json({ error: "Not found" }); return; }

    const items = await db
      .select()
      .from(expenseClaimItemsTable)
      .where(eq(expenseClaimItemsTable.claimId, id))
      .orderBy(expenseClaimItemsTable.expenseDate);

    res.json({ ...claim, items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create claim (with optional items)
router.post("/expense-claims", requireHrmsUser, async (req, res) => {
  try {
    const tenantId = req.hrmsUser!.tenantId;
    const employeeId = req.hrmsUser!.employeeId;

    if (!employeeId) {
      res.status(403).json({ error: "You must be linked to an employee record to submit expense claims" });
      return;
    }

    const { title, claimDate, notes, items = [] } = req.body as {
      title: string;
      claimDate: string;
      notes?: string;
      items: { category: string; description: string; amount: number; receiptUrl?: string; expenseDate: string }[];
    };

    if (!title || !claimDate) {
      res.status(400).json({ error: "title and claimDate are required" });
      return;
    }

    const totalAmount = items.reduce((sum, i) => sum + Number(i.amount), 0).toFixed(2);

    const [claim] = await db
      .insert(expenseClaimsTable)
      .values({ tenantId, employeeId, title, claimDate, notes, totalAmount, status: "Draft" })
      .returning();

    if (items.length > 0) {
      await db.insert(expenseClaimItemsTable).values(
        items.map((item) => ({
          claimId: claim.id,
          tenantId,
          category: item.category as typeof expenseClaimItemsTable.$inferInsert["category"],
          description: item.description,
          amount: String(item.amount),
          receiptUrl: item.receiptUrl ?? null,
          expenseDate: item.expenseDate,
        }))
      );
    }

    await logAudit({ user: req.hrmsUser, action: "CREATE", module: "ExpenseClaims", recordId: claim.id, ipAddress: req.ip });
    res.status(201).json(claim);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Submit (Draft → Submitted)
router.post("/expense-claims/:id/submit", requireHrmsUser, async (req, res) => {
  try {
    const tenantId = req.hrmsUser!.tenantId;
    const employeeId = req.hrmsUser!.employeeId;
    const id = parseInt(req.params.id as string, 10);

    const [claim] = await db
      .select()
      .from(expenseClaimsTable)
      .where(and(eq(expenseClaimsTable.id, id), eq(expenseClaimsTable.tenantId, tenantId)))
      .limit(1);

    if (!claim) { res.status(404).json({ error: "Not found" }); return; }
    if (claim.employeeId !== employeeId) { res.status(403).json({ error: "Forbidden" }); return; }
    if (claim.status !== "Draft") { res.status(422).json({ error: "Only Draft claims can be submitted" }); return; }

    const [updated] = await db
      .update(expenseClaimsTable)
      .set({ status: "Submitted", updatedAt: new Date() })
      .where(eq(expenseClaimsTable.id, id))
      .returning();

    await logAudit({ user: req.hrmsUser, action: "UPDATE", module: "ExpenseClaims", recordId: id, ipAddress: req.ip });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Add item to existing claim
router.post("/expense-claims/:id/items", requireHrmsUser, async (req, res) => {
  try {
    const tenantId = req.hrmsUser!.tenantId;
    const employeeId = req.hrmsUser!.employeeId;
    const id = parseInt(req.params.id as string, 10);

    const [claim] = await db
      .select()
      .from(expenseClaimsTable)
      .where(and(eq(expenseClaimsTable.id, id), eq(expenseClaimsTable.tenantId, tenantId)))
      .limit(1);

    if (!claim) { res.status(404).json({ error: "Not found" }); return; }
    if (claim.employeeId !== employeeId) { res.status(403).json({ error: "Forbidden" }); return; }
    if (claim.status !== "Draft") { res.status(422).json({ error: "Cannot add items to a non-Draft claim" }); return; }

    const { category, description, amount, receiptUrl, expenseDate } = req.body;

    const [item] = await db
      .insert(expenseClaimItemsTable)
      .values({ claimId: id, tenantId, category, description, amount: String(amount), receiptUrl, expenseDate })
      .returning();

    // Recalculate total
    const allItems = await db
      .select({ amount: expenseClaimItemsTable.amount })
      .from(expenseClaimItemsTable)
      .where(eq(expenseClaimItemsTable.claimId, id));
    const newTotal = allItems.reduce((s, i) => s + Number(i.amount), 0).toFixed(2);
    await db.update(expenseClaimsTable).set({ totalAmount: newTotal, updatedAt: new Date() }).where(eq(expenseClaimsTable.id, id));

    res.status(201).json(item);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete item
router.delete("/expense-claims/:id/items/:itemId", requireHrmsUser, async (req, res) => {
  try {
    const tenantId = req.hrmsUser!.tenantId;
    const employeeId = req.hrmsUser!.employeeId;
    const id = parseInt(req.params.id as string, 10);
    const itemId = parseInt(req.params.itemId as string, 10);

    const [claim] = await db.select().from(expenseClaimsTable)
      .where(and(eq(expenseClaimsTable.id, id), eq(expenseClaimsTable.tenantId, tenantId))).limit(1);
    if (!claim) { res.status(404).json({ error: "Not found" }); return; }
    if (claim.employeeId !== employeeId) { res.status(403).json({ error: "Forbidden" }); return; }
    if (claim.status !== "Draft") { res.status(422).json({ error: "Cannot modify a submitted claim" }); return; }

    await db.delete(expenseClaimItemsTable)
      .where(and(eq(expenseClaimItemsTable.id, itemId), eq(expenseClaimItemsTable.claimId, id)));

    const allItems = await db.select({ amount: expenseClaimItemsTable.amount })
      .from(expenseClaimItemsTable).where(eq(expenseClaimItemsTable.claimId, id));
    const newTotal = allItems.reduce((s, i) => s + Number(i.amount), 0).toFixed(2);
    await db.update(expenseClaimsTable).set({ totalAmount: newTotal, updatedAt: new Date() }).where(eq(expenseClaimsTable.id, id));

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Manager/HR/Finance action
router.post("/expense-claims/:id/action", requireHrmsUser, async (req, res) => {
  try {
    const tenantId = req.hrmsUser!.tenantId;
    const userId = req.hrmsUser!.id;
    const role = req.hrmsUser!.role;
    const id = parseInt(req.params.id as string, 10);

    const isHr = ["customer_admin", "hr_manager", "hr_executive"].includes(role);
    if (!isHr && role !== "hod") { res.status(403).json({ error: "Insufficient role" }); return; }

    const { action, remarks, paidDate } = req.body as {
      action: "Approved" | "Rejected" | "Paid";
      remarks?: string;
      paidDate?: string;
    };

    const [existing] = await db.select().from(expenseClaimsTable)
      .where(and(eq(expenseClaimsTable.id, id), eq(expenseClaimsTable.tenantId, tenantId))).limit(1);
    if (!existing) { res.status(404).json({ error: "Not found" }); return; }

    const now = new Date();
    let updateFields: Record<string, unknown> = { updatedAt: now };

    if (action === "Approved") {
      updateFields = { ...updateFields, status: "Approved", hrActionedById: userId, hrRemarks: remarks ?? null, hrActionedAt: now };
    } else if (action === "Rejected") {
      updateFields = { ...updateFields, status: "Rejected", hrActionedById: userId, hrRemarks: remarks ?? null, hrActionedAt: now };
    } else if (action === "Paid") {
      updateFields = { ...updateFields, status: "Paid", financeActionedById: userId, financeRemarks: remarks ?? null, financeActionedAt: now, paidDate: paidDate ?? now.toISOString().slice(0, 10) };
    } else {
      res.status(400).json({ error: "Invalid action" }); return;
    }

    const [updated] = await db.update(expenseClaimsTable).set(updateFields).where(eq(expenseClaimsTable.id, id)).returning();
    await logAudit({ user: req.hrmsUser, action: "UPDATE", module: "ExpenseClaims", recordId: id, ipAddress: req.ip });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
