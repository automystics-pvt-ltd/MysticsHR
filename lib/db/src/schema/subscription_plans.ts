import { pgTable, serial, text, integer, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";

export const subscriptionPlansTable = pgTable("subscription_plans", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull().default("starter"),
  priceMonthly: integer("price_monthly").notNull().default(0),
  priceYearly: integer("price_yearly").notNull().default(0),
  maxUsers: integer("max_users").notNull().default(10),
  maxEmployees: integer("max_employees").notNull().default(50),
  maxBranches: integer("max_branches").notNull().default(1),
  maxApiCalls: integer("max_api_calls").notNull().default(10000),
  enabledModules: jsonb("enabled_modules").notNull().default([]),
  enabledFeatures: jsonb("enabled_features").notNull().default([]),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type SubscriptionPlan = typeof subscriptionPlansTable.$inferSelect;
export type InsertSubscriptionPlan = typeof subscriptionPlansTable.$inferInsert;
