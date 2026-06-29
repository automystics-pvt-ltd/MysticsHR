import { pgTable, serial, text, boolean, timestamp, integer } from "drizzle-orm/pg-core";
import { tenantsTable } from "./tenants";

export const notificationTemplatesTable = pgTable("notification_templates", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenantsTable.id),
  eventType: text("event_type").notNull(),
  channel: text("channel").notNull().default("email"),
  emailSubject: text("email_subject"),
  emailBody: text("email_body"),
  whatsappTemplate: text("whatsapp_template"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type NotificationTemplate = typeof notificationTemplatesTable.$inferSelect;
export type NewNotificationTemplate = typeof notificationTemplatesTable.$inferInsert;
