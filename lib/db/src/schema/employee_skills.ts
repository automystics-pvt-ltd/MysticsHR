import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { employeesTable } from "./employees";
import { tenantsTable } from "./tenants";

export const employeeSkillsTable = pgTable("employee_skills", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenantsTable.id),
  employeeId: integer("employee_id").notNull().references(() => employeesTable.id),
  name: text("name").notNull(),
  proficiency: text("proficiency"),
  yearsOfExperience: integer("years_of_experience"),
  lastUsedYear: integer("last_used_year"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type EmployeeSkill = typeof employeeSkillsTable.$inferSelect;
