import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { db } from "./db";
import { hrmsUsersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import type { InferSelectModel } from "drizzle-orm";

type HrmsUser = InferSelectModel<typeof hrmsUsersTable>;
type HrmsRole = HrmsUser["role"];

const COOKIE_NAME = "mysticshr_session";

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is required");
  }
  return secret;
}

export function signToken(payload: { userId: number; email: string; role: string }): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: "7d" });
}

export function verifyToken(token: string): { userId: number; email: string; role: string } | null {
  try {
    return jwt.verify(token, getJwtSecret()) as { userId: number; email: string; role: string };
  } catch {
    return null;
  }
}

export function setAuthCookie(res: Response, token: string): void {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  });
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(COOKIE_NAME, { path: "/" });
}

function getTokenFromRequest(req: Request): string | null {
  const cookieToken = req.cookies?.[COOKIE_NAME];
  if (cookieToken) return String(cookieToken);
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) return authHeader.slice(7);
  return null;
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = getTokenFromRequest(req);
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

export async function getCurrentHrmsUser(req: Request): Promise<HrmsUser | null> {
  const token = getTokenFromRequest(req);
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload) return null;
  const [user] = await db
    .select()
    .from(hrmsUsersTable)
    .where(eq(hrmsUsersTable.id, payload.userId))
    .limit(1);
  return user ?? null;
}

export async function requireHrmsUser(req: Request, res: Response, next: NextFunction) {
  const token = getTokenFromRequest(req);
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const [user] = await db
    .select()
    .from(hrmsUsersTable)
    .where(eq(hrmsUsersTable.id, payload.userId))
    .limit(1);
  if (!user) {
    res.status(403).json({ error: "HRMS account not found. Contact your HR administrator." });
    return;
  }
  if (!user.isActive) {
    res.status(403).json({ error: "HRMS account is deactivated. Contact your HR administrator." });
    return;
  }
  req.hrmsUser = user;
  next();
}

export function requireRole(...allowedRoles: HrmsRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const role = req.hrmsUser?.role;
    if (!role || !allowedRoles.includes(role)) {
      res.status(403).json({ error: "Forbidden: insufficient permissions" });
      return;
    }
    next();
  };
}
