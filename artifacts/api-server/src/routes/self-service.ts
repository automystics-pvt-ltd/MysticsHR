import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { TOTP } from "otplib";
import QRCode from "qrcode";
import { db } from "../lib/db";
import {
  hrmsUsersTable,
  tenantsTable,
  subscriptionPlansTable,
  tenantRegistrationsTable,
  passwordResetTokensTable,
} from "@workspace/db/schema";
import { and, eq } from "drizzle-orm";
import { signToken, signMfaToken as _signMfaToken, verifyMfaToken, setAuthCookie, requireHrmsUser } from "../lib/auth";
import { logAudit } from "../lib/audit";
import nodemailer from "nodemailer";
import { systemSettingsTable } from "@workspace/db/schema";
import { provisionDefaultLeaveTypes } from "./leave";

const router = Router();

const OTP_EXPIRY_MINUTES = 15;
const MAX_OTP_ATTEMPTS = 5;

function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

function validatePasswordStrength(password: string): string | null {
  if (password.length < 8) return "Password must be at least 8 characters";
  if (!/[A-Z]/.test(password)) return "Password must contain at least one uppercase letter";
  if (!/[a-z]/.test(password)) return "Password must contain at least one lowercase letter";
  if (!/\d/.test(password)) return "Password must contain at least one number";
  if (!/[@$!%*?&_#^()\-+=[\]{}|;:,.<>]/.test(password)) return "Password must contain at least one special character";
  return null;
}

async function getMailTransport() {
  try {
    const [smtpHost] = await db
      .select()
      .from(systemSettingsTable)
      .where(and(eq(systemSettingsTable.category, "email"), eq(systemSettingsTable.key, "smtp_host")))
      .limit(1);
    const host = (smtpHost?.value as string | null) ?? process.env.SMTP_HOST;
    if (!host) return null;

    const [smtpPort] = await db.select().from(systemSettingsTable).where(and(eq(systemSettingsTable.category, "email"), eq(systemSettingsTable.key, "smtp_port"))).limit(1);
    const [smtpUser] = await db.select().from(systemSettingsTable).where(and(eq(systemSettingsTable.category, "email"), eq(systemSettingsTable.key, "smtp_user"))).limit(1);
    const [smtpPass] = await db.select().from(systemSettingsTable).where(and(eq(systemSettingsTable.category, "email"), eq(systemSettingsTable.key, "smtp_pass"))).limit(1);
    const [smtpFrom] = await db.select().from(systemSettingsTable).where(and(eq(systemSettingsTable.category, "email"), eq(systemSettingsTable.key, "smtp_from"))).limit(1);

    return nodemailer.createTransport({
      host,
      port: Number((smtpPort?.value as string | null) ?? process.env.SMTP_PORT ?? 587),
      secure: false,
      auth: {
        user: (smtpUser?.value as string | null) ?? process.env.SMTP_USER,
        pass: (smtpPass?.value as string | null) ?? process.env.SMTP_PASS,
      },
      from: (smtpFrom?.value as string | null) ?? process.env.SMTP_FROM ?? "noreply@mysticshr.com",
    });
  } catch {
    return null;
  }
}

function buildOtpHtml(name: string, otp: string, purpose: string): string {
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px 24px">
      <div style="margin-bottom:24px">
        <span style="font-size:20px;font-weight:700;color:#1e293b">MysticsHR</span>
      </div>
      <p style="color:#334155;font-size:15px;margin:0 0 8px">Hi ${name},</p>
      <p style="color:#334155;font-size:15px;margin:0 0 24px">${purpose}</p>
      <div style="background:#f1f5f9;border-radius:10px;padding:28px;text-align:center;margin:0 0 24px">
        <span style="font-size:40px;font-weight:800;letter-spacing:14px;color:#1e293b;font-variant-numeric:tabular-nums">${otp}</span>
      </div>
      <p style="color:#64748b;font-size:13px;margin:0">
        This code expires in <strong>${OTP_EXPIRY_MINUTES} minutes</strong>. Do not share it with anyone.
      </p>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0" />
      <p style="color:#94a3b8;font-size:12px;margin:0">
        If you didn't request this code, you can safely ignore this email.
      </p>
    </div>
  `;
}

async function sendViaResend(to: string, subject: string, html: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;
  try {
    const from = process.env.RESEND_FROM ?? "MysticsHR <onboarding@resend.dev>";
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], subject, html }),
    });
    if (!resp.ok) {
      const body = await resp.text().catch(() => "");
      console.error("[OTP] Resend error:", resp.status, body);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[OTP] Resend fetch failed:", e);
    return false;
  }
}

async function sendOtpEmail(to: string, name: string, otp: string, subject: string, purpose: string) {
  console.log(`[OTP] ${purpose} OTP for ${to}: ${otp}`);
  const html = buildOtpHtml(name, otp, purpose);

  // 1. Try Resend (zero-config beyond API key)
  if (await sendViaResend(to, subject, html)) return;

  // 2. Fall back to SMTP (configured via system settings or env vars)
  try {
    const transport = await getMailTransport();
    if (!transport) {
      console.warn("[OTP] No email transport configured — OTP logged above for development use.");
      return;
    }
    await transport.sendMail({ to, subject, html });
  } catch (e) {
    console.error("[OTP] SMTP send failed:", e);
  }
}

function safeUser(user: typeof hrmsUsersTable.$inferSelect) {
  const { passwordHash: _, inviteToken: __, mfaSecret: ___, ...rest } = user as typeof hrmsUsersTable.$inferSelect & { mfaSecret?: string };
  return { ...rest, hasPassword: !!user.passwordHash };
}

// ─── Public: list subscription plans ─────────────────────────────────────────

router.get("/auth/plans", async (_req, res) => {
  try {
    const plans = await db
      .select({
        id: subscriptionPlansTable.id,
        name: subscriptionPlansTable.name,
        type: subscriptionPlansTable.type,
        description: subscriptionPlansTable.description,
        priceMonthly: subscriptionPlansTable.priceMonthly,
        priceYearly: subscriptionPlansTable.priceYearly,
        maxUsers: subscriptionPlansTable.maxUsers,
        maxEmployees: subscriptionPlansTable.maxEmployees,
        maxBranches: subscriptionPlansTable.maxBranches,
        enabledModules: subscriptionPlansTable.enabledModules,
        enabledFeatures: subscriptionPlansTable.enabledFeatures,
        offerText: subscriptionPlansTable.offerText,
        badgeText: subscriptionPlansTable.badgeText,
        isFeatured: subscriptionPlansTable.isFeatured,
        sortOrder: subscriptionPlansTable.sortOrder,
      })
      .from(subscriptionPlansTable)
      .where(eq(subscriptionPlansTable.isActive, true))
      .orderBy(subscriptionPlansTable.sortOrder, subscriptionPlansTable.priceMonthly);
    res.json(plans);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Self-service signup ──────────────────────────────────────────────────────

router.post("/auth/signup", async (req, res) => {
  try {
    const { email, password, name, companyName, industry, country, planId } = req.body as {
      email?: string; password?: string; name?: string; companyName?: string;
      industry?: string; country?: string; planId?: number;
    };

    if (!email || !password || !name || !companyName) {
      res.status(400).json({ error: "email, password, name and companyName are required" });
      return;
    }

    const pwdError = validatePasswordStrength(password);
    if (pwdError) { res.status(400).json({ error: pwdError }); return; }

    const normalizedEmail = email.toLowerCase().trim();

    // Check email not already used across any tenant
    const existing = await db
      .select({ id: hrmsUsersTable.id })
      .from(hrmsUsersTable)
      .where(eq(hrmsUsersTable.email, normalizedEmail))
      .limit(1);
    if (existing.length > 0) {
      res.status(409).json({ error: "An account with this email already exists. Please sign in instead." });
      return;
    }

    // Derive unique slug
    let baseSlug = slugify(companyName);
    if (!baseSlug) baseSlug = "company";
    let slug = baseSlug;
    let attempt = 0;
    while (true) {
      const [tenantExists] = await db
        .select({ id: tenantsTable.id })
        .from(tenantsTable)
        .where(eq(tenantsTable.slug, slug))
        .limit(1);
      const [regExists] = await db
        .select({ id: tenantRegistrationsTable.id })
        .from(tenantRegistrationsTable)
        .where(and(eq(tenantRegistrationsTable.slug, slug), eq(tenantRegistrationsTable.isVerified, false)))
        .limit(1);
      if (!tenantExists && !regExists) break;
      attempt++;
      slug = `${baseSlug}-${attempt}`;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const otp = generateOtp();
    const otpExpiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    // Invalidate any existing pending registration for this email
    await db
      .delete(tenantRegistrationsTable)
      .where(and(eq(tenantRegistrationsTable.email, normalizedEmail), eq(tenantRegistrationsTable.isVerified, false)));

    const [reg] = await db
      .insert(tenantRegistrationsTable)
      .values({
        email: normalizedEmail,
        name: name.trim(),
        companyName: companyName.trim(),
        slug,
        industry: industry ?? null,
        country: country ?? null,
        planId: planId ?? null,
        passwordHash,
        otp,
        otpExpiry,
      })
      .returning({ id: tenantRegistrationsTable.id, slug: tenantRegistrationsTable.slug });

    await sendOtpEmail(
      normalizedEmail,
      name.trim(),
      otp,
      "Verify your MysticsHR account",
      "Here is your verification code to activate your MysticsHR account:"
    );

    res.json({ ok: true, registrationId: reg.id, slug: reg.slug });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/auth/signup/resend", async (req, res) => {
  try {
    const { registrationId } = req.body as { registrationId?: number };
    if (!registrationId) { res.status(400).json({ error: "registrationId is required" }); return; }

    const [reg] = await db
      .select()
      .from(tenantRegistrationsTable)
      .where(and(eq(tenantRegistrationsTable.id, registrationId), eq(tenantRegistrationsTable.isVerified, false)))
      .limit(1);

    if (!reg) { res.status(404).json({ error: "Registration not found or already verified" }); return; }
    if (reg.otpAttempts >= MAX_OTP_ATTEMPTS) {
      res.status(429).json({ error: "Too many OTP requests. Please start over." });
      return;
    }

    const otp = generateOtp();
    const otpExpiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
    await db
      .update(tenantRegistrationsTable)
      .set({ otp, otpExpiry, otpAttempts: reg.otpAttempts + 1, updatedAt: new Date() })
      .where(eq(tenantRegistrationsTable.id, registrationId));

    await sendOtpEmail(reg.email, reg.name, otp, "Your new MysticsHR verification code", "Here is your new verification code:");

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/auth/signup/verify", async (req, res) => {
  try {
    const { registrationId, otp } = req.body as { registrationId?: number; otp?: string };
    if (!registrationId || !otp) {
      res.status(400).json({ error: "registrationId and otp are required" });
      return;
    }

    const [reg] = await db
      .select()
      .from(tenantRegistrationsTable)
      .where(and(eq(tenantRegistrationsTable.id, registrationId), eq(tenantRegistrationsTable.isVerified, false)))
      .limit(1);

    if (!reg) { res.status(404).json({ error: "Registration not found or already verified" }); return; }
    if (reg.otpExpiry < new Date()) { res.status(410).json({ error: "OTP has expired. Please request a new one." }); return; }
    if (reg.otp !== otp.trim()) {
      res.status(400).json({ error: "Invalid verification code. Please check and try again." });
      return;
    }

    // Create the tenant
    const [tenant] = await db
      .insert(tenantsTable)
      .values({
        name: reg.companyName,
        slug: reg.slug,
        isActive: true,
        status: "trial",
        contactEmail: reg.email,
        industry: reg.industry ?? null,
        country: reg.country ?? null,
        planId: reg.planId ?? null,
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14-day trial
      })
      .returning();

    // Create the customer_admin user
    const [user] = await db
      .insert(hrmsUsersTable)
      .values({
        tenantId: tenant.id,
        email: reg.email,
        name: reg.name,
        role: "customer_admin",
        passwordHash: reg.passwordHash,
        isActive: true,
        isLocked: false,
        failedLoginAttempts: 0,
        lastLoginAt: new Date(),
      })
      .returning();

    // Mark registration as verified
    await db
      .update(tenantRegistrationsTable)
      .set({ isVerified: true, verifiedAt: new Date(), updatedAt: new Date() })
      .where(eq(tenantRegistrationsTable.id, registrationId));

    // Provision default leave types/policies so Leave module is usable immediately
    await provisionDefaultLeaveTypes(tenant.id);

    const authToken = signToken({ userId: user.id, email: user.email, role: user.role, tenantId: user.tenantId });
    setAuthCookie(res, authToken);

    void logAudit({
      tenantId: tenant.id,
      action: "TENANT_SELF_SERVICE_SIGNUP",
      module: "Auth",
      recordId: user.id,
      newValue: `${user.email} created tenant ${tenant.slug}`,
    });

    res.json({ ok: true, user: safeUser(user), tenant: { id: tenant.id, slug: tenant.slug, name: tenant.name } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Forgot / Reset password ──────────────────────────────────────────────────

router.post("/auth/forgot-password", async (req, res) => {
  try {
    const { email } = req.body as { email?: string };
    if (!email) { res.status(400).json({ error: "email is required" }); return; }

    const normalizedEmail = email.toLowerCase().trim();
    const users = await db
      .select()
      .from(hrmsUsersTable)
      .where(and(eq(hrmsUsersTable.email, normalizedEmail), eq(hrmsUsersTable.isActive, true)))
      .limit(5);

    // Always respond 200 to prevent email enumeration
    if (users.length === 0) {
      res.json({ ok: true });
      return;
    }

    // Use the first matched user (most recently created)
    const user = users[0];
    const otp = generateOtp();
    const token = crypto.randomUUID();
    const expiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    // Invalidate old tokens for this user
    await db
      .update(passwordResetTokensTable)
      .set({ isUsed: true, usedAt: new Date() })
      .where(and(eq(passwordResetTokensTable.userId, user.id), eq(passwordResetTokensTable.isUsed, false)));

    await db
      .insert(passwordResetTokensTable)
      .values({ userId: user.id, token, otp, expiry });

    await sendOtpEmail(
      normalizedEmail,
      user.name,
      otp,
      "Reset your MysticsHR password",
      "Here is your password reset code:"
    );

    res.json({ ok: true, resetToken: token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/auth/reset-password", async (req, res) => {
  try {
    const { resetToken, otp, newPassword } = req.body as {
      resetToken?: string; otp?: string; newPassword?: string;
    };
    if (!resetToken || !otp || !newPassword) {
      res.status(400).json({ error: "resetToken, otp and newPassword are required" });
      return;
    }

    const pwdError = validatePasswordStrength(newPassword);
    if (pwdError) { res.status(400).json({ error: pwdError }); return; }

    const [tokenRow] = await db
      .select()
      .from(passwordResetTokensTable)
      .where(and(eq(passwordResetTokensTable.token, resetToken), eq(passwordResetTokensTable.isUsed, false)))
      .limit(1);

    if (!tokenRow) { res.status(400).json({ error: "Invalid or expired reset link. Please request a new one." }); return; }
    if (tokenRow.expiry < new Date()) { res.status(410).json({ error: "This reset code has expired. Please request a new one." }); return; }
    if (tokenRow.otp !== otp.trim()) { res.status(400).json({ error: "Invalid code. Please check and try again." }); return; }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await db
      .update(hrmsUsersTable)
      .set({ passwordHash, failedLoginAttempts: 0, isLocked: false, updatedAt: new Date() })
      .where(eq(hrmsUsersTable.id, tokenRow.userId));

    await db
      .update(passwordResetTokensTable)
      .set({ isUsed: true, usedAt: new Date() })
      .where(eq(passwordResetTokensTable.id, tokenRow.id));

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── MFA (TOTP) ───────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const totpInstance = new TOTP({ digits: 6, step: 30, window: 1 } as any);

function totpGenerateSecret(): string {
  const bytes = crypto.randomBytes(20);
  return bytes.toString("base64").replace(/[^A-Z2-7]/gi, "A").toUpperCase().slice(0, 32);
}

function totpVerify(token: string, secret: string): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (totpInstance.verify({ token, secret } as any)) as unknown as boolean;
  } catch {
    return false;
  }
}

function totpKeyUri(accountName: string, issuer: string, secret: string): string {
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(accountName)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}

router.post("/auth/mfa/setup", requireHrmsUser, async (req, res) => {
  try {
    const user = req.hrmsUser!;
    const secret = totpGenerateSecret();
    const otpauthUrl = totpKeyUri(user.email, "MysticsHR", secret);
    const qrDataUrl = await QRCode.toDataURL(otpauthUrl);

    // Store secret temporarily (not enabled until verified)
    await db
      .update(hrmsUsersTable)
      .set({ mfaSecret: secret, updatedAt: new Date() } as Partial<typeof hrmsUsersTable.$inferInsert>)
      .where(eq(hrmsUsersTable.id, user.id));

    res.json({ secret, qrDataUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/auth/mfa/enable", requireHrmsUser, async (req, res) => {
  try {
    const { code } = req.body as { code?: string };
    if (!code) { res.status(400).json({ error: "code is required" }); return; }

    const [user] = await db
      .select()
      .from(hrmsUsersTable)
      .where(eq(hrmsUsersTable.id, req.hrmsUser!.id))
      .limit(1);

    const secret = (user as typeof hrmsUsersTable.$inferSelect & { mfaSecret?: string }).mfaSecret;
    if (!secret) { res.status(400).json({ error: "Run MFA setup first" }); return; }

    const isValid = totpVerify(code.replace(/\s/g, ""), secret);
    if (!isValid) { res.status(400).json({ error: "Invalid code. Please check your authenticator app." }); return; }

    // Generate backup codes
    const backupCodes = Array.from({ length: 8 }, () =>
      crypto.randomBytes(4).toString("hex")
    );
    const backupHashes = await Promise.all(backupCodes.map((c) => bcrypt.hash(c, 8)));

    await db
      .update(hrmsUsersTable)
      .set({ mfaEnabled: true, mfaBackupCodes: backupHashes, updatedAt: new Date() } as Partial<typeof hrmsUsersTable.$inferInsert>)
      .where(eq(hrmsUsersTable.id, user.id));

    void logAudit({ tenantId: user.tenantId, user: req.hrmsUser, action: "MFA_ENABLED", module: "Auth", recordId: user.id, newValue: user.email });
    res.json({ ok: true, backupCodes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/auth/mfa/verify", async (req, res) => {
  try {
    const { mfaToken, code } = req.body as { mfaToken?: string; code?: string };
    if (!mfaToken || !code) { res.status(400).json({ error: "mfaToken and code are required" }); return; }

    const payload = verifyMfaToken(mfaToken);
    if (!payload) { res.status(401).json({ error: "Invalid or expired session. Please sign in again." }); return; }

    const [user] = await db
      .select()
      .from(hrmsUsersTable)
      .where(eq(hrmsUsersTable.id, payload.userId))
      .limit(1);

    if (!user) { res.status(401).json({ error: "User not found" }); return; }

    const userWithMfa = user as typeof hrmsUsersTable.$inferSelect & { mfaSecret?: string; mfaEnabled?: boolean; mfaBackupCodes?: string[] };
    const normalizedCode = code.replace(/\s/g, "");

    // Try TOTP first
    let isValid = userWithMfa.mfaSecret ? totpVerify(normalizedCode, userWithMfa.mfaSecret) : false;

    // Try backup codes
    if (!isValid && userWithMfa.mfaBackupCodes && userWithMfa.mfaBackupCodes.length > 0) {
      for (let i = 0; i < userWithMfa.mfaBackupCodes.length; i++) {
        const match = await bcrypt.compare(normalizedCode, userWithMfa.mfaBackupCodes[i]);
        if (match) {
          const remaining = userWithMfa.mfaBackupCodes.filter((_: string, idx: number) => idx !== i);
          await db
            .update(hrmsUsersTable)
            .set({ mfaBackupCodes: remaining, updatedAt: new Date() } as Partial<typeof hrmsUsersTable.$inferInsert>)
            .where(eq(hrmsUsersTable.id, user.id));
          isValid = true;
          break;
        }
      }
    }

    if (!isValid) { res.status(400).json({ error: "Invalid code. Please try again." }); return; }

    await db
      .update(hrmsUsersTable)
      .set({ failedLoginAttempts: 0, lastLoginAt: new Date(), updatedAt: new Date() })
      .where(eq(hrmsUsersTable.id, user.id));

    const authToken = signToken({ userId: user.id, email: user.email, role: user.role, tenantId: user.tenantId });
    setAuthCookie(res, authToken);

    res.json({ ok: true, user: safeUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/auth/mfa", requireHrmsUser, async (req, res) => {
  try {
    const { password } = req.body as { password?: string };
    if (!password) { res.status(400).json({ error: "password is required to disable MFA" }); return; }

    const [user] = await db.select().from(hrmsUsersTable).where(eq(hrmsUsersTable.id, req.hrmsUser!.id)).limit(1);
    if (!user?.passwordHash) { res.status(400).json({ error: "No password set" }); return; }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) { res.status(401).json({ error: "Incorrect password" }); return; }

    await db
      .update(hrmsUsersTable)
      .set({ mfaEnabled: false, mfaSecret: null, mfaBackupCodes: null, updatedAt: new Date() } as Partial<typeof hrmsUsersTable.$inferInsert>)
      .where(eq(hrmsUsersTable.id, user.id));

    void logAudit({ tenantId: user.tenantId, user: req.hrmsUser, action: "MFA_DISABLED", module: "Auth", recordId: user.id, newValue: user.email });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── MFA status (authenticated) ──────────────────────────────────────────────

router.get("/auth/mfa/status", requireHrmsUser, async (req, res) => {
  try {
    const [user] = await db.select().from(hrmsUsersTable).where(eq(hrmsUsersTable.id, req.hrmsUser!.id)).limit(1);
    const u = user as typeof hrmsUsersTable.$inferSelect & { mfaEnabled?: boolean; mfaBackupCodes?: string[] };
    res.json({ mfaEnabled: !!u?.mfaEnabled, backupCodesRemaining: u?.mfaBackupCodes?.length ?? 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
