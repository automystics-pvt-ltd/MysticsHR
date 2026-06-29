import { pgTable, serial, text, integer, boolean, timestamp, date, jsonb } from "drizzle-orm/pg-core";

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
  gateway: text("gateway").notNull().default("manual"),
  gatewayOrderId: text("gateway_order_id"),
  gatewayPaymentId: text("gateway_payment_id"),
  taxAmountCents: integer("tax_amount_cents").notNull().default(0),
  gstNumber: text("gst_number"),
  discountCents: integer("discount_cents").notNull().default(0),
  description: text("description"),
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

export const paymentTransactionsTable = pgTable("payment_transactions", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  invoiceId: integer("invoice_id"),
  gateway: text("gateway").notNull().default("razorpay"),
  gatewayOrderId: text("gateway_order_id"),
  gatewayPaymentId: text("gateway_payment_id"),
  gatewaySignature: text("gateway_signature"),
  amountCents: integer("amount_cents").notNull().default(0),
  currency: text("currency").notNull().default("INR"),
  status: text("status").notNull().default("created"),
  method: text("method"),
  errorCode: text("error_code"),
  errorMessage: text("error_message"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const subscriptionHistoryTable = pgTable("subscription_history", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull(),
  fromPlanId: integer("from_plan_id"),
  toPlanId: integer("to_plan_id"),
  changeType: text("change_type").notNull(),
  billingCycle: text("billing_cycle").notNull().default("monthly"),
  amountCents: integer("amount_cents").notNull().default(0),
  currency: text("currency").notNull().default("INR"),
  effectiveAt: timestamp("effective_at", { withTimezone: true }).notNull().defaultNow(),
  notes: text("notes"),
  createdBy: integer("created_by"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type TenantInvoice = typeof tenantInvoicesTable.$inferSelect;
export type TenantPayment = typeof tenantPaymentsTable.$inferSelect;
export type PaymentTransaction = typeof paymentTransactionsTable.$inferSelect;
export type SubscriptionHistory = typeof subscriptionHistoryTable.$inferSelect;
