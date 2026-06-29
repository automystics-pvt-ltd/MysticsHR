import { pgTable, serial, text, jsonb, timestamp, integer } from "drizzle-orm/pg-core";
import { tenantsTable } from "./tenants";

export const systemSettingsTable = pgTable("system_settings", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenantsTable.id),
  category: text("category").notNull(),
  key: text("key").notNull(),
  value: jsonb("value"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type SystemSetting = typeof systemSettingsTable.$inferSelect;
export type NewSystemSetting = typeof systemSettingsTable.$inferInsert;
