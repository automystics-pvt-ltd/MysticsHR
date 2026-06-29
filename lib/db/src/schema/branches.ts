import { pgTable, serial, text, boolean, integer, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants";

export const branchesTable = pgTable("branches", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenantsTable.id),
  name: text("name").notNull(),
  code: text("code").notNull(),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  country: text("country").default("India"),
  phone: text("phone"),
  email: text("email"),
  isHeadquarters: boolean("is_headquarters").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("branches_tenant_code_idx").on(table.tenantId, table.code),
]);

export const insertBranchSchema = createInsertSchema(branchesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const selectBranchSchema = createSelectSchema(branchesTable);

export type InsertBranch = z.infer<typeof insertBranchSchema>;
export type Branch = typeof branchesTable.$inferSelect;
