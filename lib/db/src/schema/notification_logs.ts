import { pgTable, serial, integer, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { tenantsTable } from "./tenants";

export const notificationLogsTable = pgTable("notification_logs", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenantsTable.id),
  channel: text("channel").notNull(),
  eventType: text("event_type").notNull(),
  module: text("module").notNull(),
  recipientEmail: text("recipient_email"),
  recipientPhone: text("recipient_phone"),
  recipientName: text("recipient_name"),
  subject: text("subject"),
  body: text("body"),
  status: text("status").notNull().default("sent"),
  errorMessage: text("error_message"),
  entityType: text("entity_type"),
  entityId: integer("entity_id"),
  metadata: jsonb("metadata"),
  sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
});

export type NotificationLog = typeof notificationLogsTable.$inferSelect;
export type NewNotificationLog = typeof notificationLogsTable.$inferInsert;
