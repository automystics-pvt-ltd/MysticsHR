import { pgTable, serial, text, integer, boolean, timestamp, date } from "drizzle-orm/pg-core";

export const tenantInvoicesTable = pgTable("tenant_invoices", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  planId: integer("plan_id"),
  invoiceNumber: text("invoice_number").notNull().unique(),
  billingCycle: text("billing_cycle").notNull().default("monthly"),
  amountCents: integer("amount_cents").notNull().default(0),
  currency: text("currency").notNull().default("INR"),
  billingPeriodStart: date("billing_period_start"),
  billingPeriodEnd: date("billing_period_end"),
  dueDate: date("due_date"),
  status: text("status").notNull().default("pending"),
  issuedAt: timestamp("issued_at", { withTimezone: true }).notNull().defaultNow(),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  paymentMethod: text("payment_method"),
  paymentReference: text("payment_reference"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const tenantPaymentsTable = pgTable("tenant_payments", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  invoiceId: integer("invoice_id"),
  amountCents: integer("amount_cents").notNull().default(0),
  currency: text("currency").notNull().default("INR"),
  paymentDate: date("payment_date").notNull(),
  paymentMethod: text("payment_method"),
  referenceNumber: text("reference_number"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type TenantInvoice = typeof tenantInvoicesTable.$inferSelect;
export type TenantPayment = typeof tenantPaymentsTable.$inferSelect;
