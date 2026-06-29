import { pgTable, serial, text, integer, timestamp, date } from "drizzle-orm/pg-core";
import { employeesTable } from "./employees";
import { tenantsTable } from "./tenants";

export const employeeCertificationsTable = pgTable("employee_certifications", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenantsTable.id),
  employeeId: integer("employee_id").notNull().references(() => employeesTable.id),
  name: text("name").notNull(),
  issuingOrganization: text("issuing_organization").notNull(),
  credentialId: text("credential_id"),
  credentialUrl: text("credential_url"),
  issueDate: date("issue_date"),
  expiryDate: date("expiry_date"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type EmployeeCertification = typeof employeeCertificationsTable.$inferSelect;
