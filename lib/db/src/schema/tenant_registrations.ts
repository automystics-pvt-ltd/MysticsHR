import { pgTable, serial, text, boolean, timestamp, integer } from "drizzle-orm/pg-core";
import { subscriptionPlansTable } from "./subscription_plans";

export const tenantRegistrationsTable = pgTable("tenant_registrations", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  name: text("name").notNull(),
  companyName: text("company_name").notNull(),
  slug: text("slug").notNull(),
  industry: text("industry"),
  country: text("country"),
  planId: integer("plan_id").references(() => subscriptionPlansTable.id),
  passwordHash: text("password_hash").notNull(),
  otp: text("otp").notNull(),
  otpExpiry: timestamp("otp_expiry").notNull(),
  otpAttempts: integer("otp_attempts").notNull().default(0),
  isVerified: boolean("is_verified").notNull().default(false),
  verifiedAt: timestamp("verified_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type TenantRegistration = typeof tenantRegistrationsTable.$inferSelect;
