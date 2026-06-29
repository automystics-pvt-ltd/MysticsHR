import { pgTable, serial, integer, text, boolean, timestamp, unique } from "drizzle-orm/pg-core";
import { employeesTable } from "./employees";
import { tenantsTable } from "./tenants";

export const notificationPreferencesTable = pgTable("notification_preferences", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenantsTable.id),
  employeeId: integer("employee_id").notNull().references(() => employeesTable.id, { onDelete: "cascade" }),
  eventType: text("event_type").notNull(),
  emailEnabled: boolean("email_enabled").notNull().default(true),
  whatsappEnabled: boolean("whatsapp_enabled").notNull().default(true),
  silencedAt: timestamp("silenced_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniqEmpEvent: unique("notification_prefs_emp_event_unique").on(t.employeeId, t.eventType),
}));

export type NotificationPreference = typeof notificationPreferencesTable.$inferSelect;
export type NewNotificationPreference = typeof notificationPreferencesTable.$inferInsert;
