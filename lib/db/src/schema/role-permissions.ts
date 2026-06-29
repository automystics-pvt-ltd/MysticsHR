import { pgTable, serial, integer, varchar, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { tenantsTable } from "./tenants";

export const rolePermissionsTable = pgTable("role_permissions", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenantsTable.id, { onDelete: "cascade" }),
  roleSlug: varchar("role_slug", { length: 50 }).notNull(),
  moduleKey: varchar("module_key", { length: 100 }).notNull(),
  actions: text("actions").array().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("role_permissions_unique_idx").on(table.tenantId, table.roleSlug, table.moduleKey),
]);

export type RolePermission = typeof rolePermissionsTable.$inferSelect;
