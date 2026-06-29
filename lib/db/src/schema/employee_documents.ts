import { pgTable, serial, text, integer, timestamp, date, pgEnum } from "drizzle-orm/pg-core";
import { employeesTable } from "./employees";
import { tenantsTable } from "./tenants";

export const empDocStatusEnum = pgEnum("emp_doc_status", [
  "Active",
  "Expired",
  "Expiring Soon",
]);

export const employeeDocumentsTable = pgTable("employee_documents", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenantsTable.id),
  employeeId: integer("employee_id").notNull().references(() => employeesTable.id),
  documentType: text("document_type").notNull(),
  documentName: text("document_name").notNull(),
  fileUrl: text("file_url"),
  issueDate: date("issue_date"),
  expiryDate: date("expiry_date"),
  alertDays: integer("alert_days").default(30),
  status: empDocStatusEnum("status").notNull().default("Active"),
  notes: text("notes"),
  uploadedById: integer("uploaded_by_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type EmployeeDocument = typeof employeeDocumentsTable.$inferSelect;
