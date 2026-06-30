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
import { notifyEmployee, notifyUser } from "../lib/notification-service";

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
        itemCount: sql<number>`(SELECT COUNT(*) FROM expense_claim_items WHERE claim_id = ${expenseClaimsTable.id})::int`,
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

    for (const item of items) {
      const a = Number(item.amount);
      if (!item.category || !item.description || !item.expenseDate) {
        res.status(400).json({ error: "Each item must have category, description, and expenseDate" });
        return;
      }
      if (isNaN(a) || a <= 0) {
        res.status(400).json({ error: "Each item amount must be a positive number" });
        return;
      }
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

    // Must have at least one item
    const [itemCount] = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(expenseClaimItemsTable)
      .where(eq(expenseClaimItemsTable.claimId, id));
    if (!itemCount || itemCount.count === 0) {
      res.status(422).json({ error: "Claim must have at least one item before submitting" });
      return;
    }

    const [updated] = await db
      .update(expenseClaimsTable)
      .set({ status: "Submitted", updatedAt: new Date() })
      .where(eq(expenseClaimsTable.id, id))
      .returning();

    await logAudit({ user: req.hrmsUser, action: "UPDATE", module: "ExpenseClaims", recordId: id, ipAddress: req.ip });
    notifyUser({ tenantId, userId: req.hrmsUser!.id, title: "Expense Claim Submitted", message: `Your expense claim "${updated?.title ?? ""}" is pending approval.`, entityType: "expense_claim", entityId: id }).catch(() => {});
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

    if (!category || !description || !expenseDate) {
      res.status(400).json({ error: "category, description, and expenseDate are required" });
      return;
    }
    const parsedAmount = Number(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      res.status(400).json({ error: "amount must be a positive number" });
      return;
    }

    const [item] = await db
      .insert(expenseClaimItemsTable)
      .values({ claimId: id, tenantId, category, description, amount: String(parsedAmount), receiptUrl: receiptUrl ?? null, expenseDate })
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

    // State machine validation
    if (action === "Approved" || action === "Rejected") {
      if (existing.status !== "Submitted") {
        res.status(422).json({ error: `Can only approve/reject a Submitted claim (current status: ${existing.status})` });
        return;
      }
    } else if (action === "Paid") {
      if (existing.status !== "Approved") {
        res.status(422).json({ error: "Can only mark an Approved claim as Paid" });
        return;
      }
    }

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
    if (action === "Approved" || action === "Rejected") {
      notifyEmployee({ tenantId, employeeId: existing.employeeId!, title: `Expense Claim ${action}`, message: `Your expense claim "${existing.title}" has been ${action.toLowerCase()}.`, entityType: "expense_claim", entityId: id }).catch(() => {});
    }
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
