import { pgTable, serial, integer, text, date, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { tenantsTable } from "./tenants";
import { employeesTable } from "./employees";
import { hrmsUsersTable } from "./hrms_users";

export const wfhStatusEnum = pgEnum("wfh_status", [
  "Pending",
  "Approved",
  "Rejected",
  "Cancelled",
]);

export const wfhRequestsTable = pgTable("wfh_requests", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenantsTable.id),
  employeeId: integer("employee_id").notNull().references(() => employeesTable.id),
  fromDate: date("from_date").notNull(),
  toDate: date("to_date").notNull(),
  reason: text("reason").notNull(),
  status: wfhStatusEnum("status").notNull().default("Pending"),
  managerActionedById: integer("manager_actioned_by_id").references(() => hrmsUsersTable.id),
  managerRemarks: text("manager_remarks"),
  managerActionedAt: timestamp("manager_actioned_at", { withTimezone: true }),
  hrActionedById: integer("hr_actioned_by_id").references(() => hrmsUsersTable.id),
  hrRemarks: text("hr_remarks"),
  hrActionedAt: timestamp("hr_actioned_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
