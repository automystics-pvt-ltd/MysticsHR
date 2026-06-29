import { pgTable, serial, integer, text, date, timestamp, numeric, pgEnum } from "drizzle-orm/pg-core";
import { tenantsTable } from "./tenants";
import { employeesTable } from "./employees";
import { hrmsUsersTable } from "./hrms_users";

export const expenseClaimStatusEnum = pgEnum("expense_claim_status", [
  "Draft",
  "Submitted",
  "Approved",
  "Rejected",
  "Paid",
]);

export const expenseCategoryEnum = pgEnum("expense_category", [
  "Meals",
  "Travel",
  "Accommodation",
  "Communications",
  "Office Supplies",
  "Training",
  "Client Entertainment",
  "Other",
]);

export const expenseClaimsTable = pgTable("expense_claims", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenantsTable.id),
  employeeId: integer("employee_id").notNull().references(() => employeesTable.id),
  title: text("title").notNull(),
  claimDate: date("claim_date").notNull(),
  totalAmount: numeric("total_amount", { precision: 14, scale: 2 }).notNull().default("0"),
  status: expenseClaimStatusEnum("status").notNull().default("Draft"),
  notes: text("notes"),
  managerActionedById: integer("manager_actioned_by_id").references(() => hrmsUsersTable.id),
  managerRemarks: text("manager_remarks"),
  managerActionedAt: timestamp("manager_actioned_at", { withTimezone: true }),
  hrActionedById: integer("hr_actioned_by_id").references(() => hrmsUsersTable.id),
  hrRemarks: text("hr_remarks"),
  hrActionedAt: timestamp("hr_actioned_at", { withTimezone: true }),
  financeActionedById: integer("finance_actioned_by_id").references(() => hrmsUsersTable.id),
  financeRemarks: text("finance_remarks"),
  financeActionedAt: timestamp("finance_actioned_at", { withTimezone: true }),
  paidDate: date("paid_date"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const expenseClaimItemsTable = pgTable("expense_claim_items", {
  id: serial("id").primaryKey(),
  claimId: integer("claim_id").notNull().references(() => expenseClaimsTable.id, { onDelete: "cascade" }),
  tenantId: integer("tenant_id").notNull().references(() => tenantsTable.id),
  category: expenseCategoryEnum("category").notNull(),
  description: text("description").notNull(),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  receiptUrl: text("receipt_url"),
  expenseDate: date("expense_date").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
