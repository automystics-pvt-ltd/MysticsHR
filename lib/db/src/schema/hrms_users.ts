import {
  pgTable, serial, text, boolean, integer, timestamp, pgEnum, uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { employeesTable } from "./employees";
import { tenantsTable } from "./tenants";

export const hrmsRoleEnum = pgEnum("hrms_role", [
  "customer_admin",
  "hr_manager",
  "hr_executive",
  "hod",
  "payroll_admin",
  "employee",
]);

export const hrmsUsersTable = pgTable("hrms_users", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenantsTable.id),
  employeeId: integer("employee_id").references(() => employeesTable.id),
  email: text("email").notNull(),
  name: text("name").notNull(),
  role: hrmsRoleEnum("role").notNull().default("employee"),
  passwordHash: text("password_hash"),
  isActive: boolean("is_active").notNull().default(true),
  isLocked: boolean("is_locked").notNull().default(false),
  lockedAt: timestamp("locked_at"),
  lockedReason: text("locked_reason"),
  failedLoginAttempts: integer("failed_login_attempts").notNull().default(0),
  lastLoginAt: timestamp("last_login_at"),
  inviteToken: text("invite_token"),
  inviteExpiry: timestamp("invite_expiry"),
  invitedAt: timestamp("invited_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("hrms_users_email_tenant_idx").on(table.email, table.tenantId),
]);

export const insertHrmsUserSchema = createInsertSchema(hrmsUsersTable).omit({
  id: true,
  passwordHash: true,
  inviteToken: true,
  createdAt: true,
  updatedAt: true,
});

export const selectHrmsUserSchema = createSelectSchema(hrmsUsersTable).omit({
  passwordHash: true,
  inviteToken: true,
});

export type InsertHrmsUser = z.infer<typeof insertHrmsUserSchema>;
export type HrmsUser = typeof hrmsUsersTable.$inferSelect;
