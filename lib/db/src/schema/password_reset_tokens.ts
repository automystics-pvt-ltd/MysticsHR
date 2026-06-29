import { pgTable, serial, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { hrmsUsersTable } from "./hrms_users";

export const passwordResetTokensTable = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => hrmsUsersTable.id),
  token: text("token").notNull().unique(),
  otp: text("otp").notNull(),
  expiry: timestamp("expiry").notNull(),
  usedAt: timestamp("used_at"),
  isUsed: boolean("is_used").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type PasswordResetToken = typeof passwordResetTokensTable.$inferSelect;
