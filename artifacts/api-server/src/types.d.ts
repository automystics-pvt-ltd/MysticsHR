import "express";
import type { InferSelectModel } from "drizzle-orm";
import type { hrmsUsersTable, apiKeysTable, platformAdminsTable } from "@workspace/db/schema";

declare global {
  namespace Express {
    interface Request {
      hrmsUser?: InferSelectModel<typeof hrmsUsersTable>;
      tenantId?: number;
      platformAdmin?: InferSelectModel<typeof platformAdminsTable>;
      apiKey?: InferSelectModel<typeof apiKeysTable>;
    }
  }
}
