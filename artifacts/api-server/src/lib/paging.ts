import type { Request } from "express";

export function paging(req: Request) {
  const limit = Math.min(Math.max(parseInt((req.query.limit as string) ?? "100", 10) || 100, 1), 500);
  const offset = Math.max(parseInt((req.query.offset as string) ?? "0", 10) || 0, 0);
  return { limit, offset };
}
