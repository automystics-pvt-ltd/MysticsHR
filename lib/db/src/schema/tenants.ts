import { pgTable, serial, text, boolean, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const tenantsTable = pgTable("tenants", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  status: text("status").notNull().default("active"),
  planId: integer("plan_id"),
  contactEmail: text("contact_email"),
  industry: text("industry"),
  website: text("website"),
  country: text("country"),
  notes: text("notes"),
  billingCycle: text("billing_cycle").notNull().default("monthly"),
  gracePeriodDays: integer("grace_period_days").notNull().default(7),
  trialEndsAt: timestamp("trial_ends_at"),
  subscriptionStartsAt: timestamp("subscription_starts_at"),
  subscriptionEndsAt: timestamp("subscription_ends_at"),
  customMaxUsers: integer("custom_max_users"),
  customMaxEmployees: integer("custom_max_employees"),
  customMaxBranches: integer("custom_max_branches"),
  customMaxApiCalls: integer("custom_max_api_calls"),
  customPriceMonthly: integer("custom_price_monthly"),
  customPriceYearly: integer("custom_price_yearly"),
  enabledModules: jsonb("enabled_modules"),
  enabledFeatures: jsonb("enabled_features"),
  themeConfig: jsonb("theme_config"),
  razorpayCustomerId: text("razorpay_customer_id"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  gstNumber: text("gst_number"),
  billingAddress: jsonb("billing_address"),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertTenantSchema = createInsertSchema(tenantsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const selectTenantSchema = createSelectSchema(tenantsTable);

export type InsertTenant = z.infer<typeof insertTenantSchema>;
export type Tenant = typeof tenantsTable.$inferSelect;
