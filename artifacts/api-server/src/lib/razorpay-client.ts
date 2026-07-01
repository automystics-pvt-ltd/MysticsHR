import crypto from "node:crypto";
import { logger } from "./logger";

const ENV_KEY_ID = process.env["RAZORPAY_KEY_ID"];
const ENV_KEY_SECRET = process.env["RAZORPAY_KEY_SECRET"];
const ENV_WEBHOOK_SECRET = process.env["RAZORPAY_WEBHOOK_SECRET"];

export interface RazorpayConfig {
  keyId: string;
  keySecret: string;
  webhookSecret?: string;
}

function resolveConfig(override?: RazorpayConfig | null): RazorpayConfig | null {
  if (override?.keyId && override?.keySecret) return override;
  if (ENV_KEY_ID && ENV_KEY_SECRET) {
    return { keyId: ENV_KEY_ID, keySecret: ENV_KEY_SECRET, webhookSecret: ENV_WEBHOOK_SECRET };
  }
  return null;
}

export function isRazorpayConfigured(config?: RazorpayConfig | null): boolean {
  return resolveConfig(config) !== null;
}

export function getRazorpayKeyId(config?: RazorpayConfig | null): string {
  return resolveConfig(config)?.keyId ?? "";
}

interface RazorpayOrderOptions {
  amount: number;
  currency?: string;
  receipt?: string;
  notes?: Record<string, string>;
}

interface RazorpayOrder {
  id: string;
  entity: string;
  amount: number;
  currency: string;
  status: string;
  receipt: string;
  notes: Record<string, string>;
}

interface RazorpayCustomer {
  id: string;
  name: string;
  email: string;
  contact?: string;
}

async function razorpayRequest<T>(
  method: string,
  path: string,
  config: RazorpayConfig,
  body?: unknown,
): Promise<T> {
  const auth = Buffer.from(`${config.keyId}:${config.keySecret}`).toString("base64");
  const url = `https://api.razorpay.com/v1${path}`;

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    logger.error({ path, status: res.status, err }, "Razorpay API error");
    throw new Error((err as { error?: { description?: string } })?.error?.description ?? `Razorpay error ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export async function createRazorpayOrder(opts: RazorpayOrderOptions, configOverride?: RazorpayConfig | null): Promise<RazorpayOrder> {
  const config = resolveConfig(configOverride);
  if (!config) throw new Error("Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.");
  return razorpayRequest<RazorpayOrder>("POST", "/orders", config, {
    amount: opts.amount,
    currency: opts.currency ?? "INR",
    receipt: opts.receipt ?? `inv_${Date.now()}`,
    notes: opts.notes ?? {},
  });
}

export async function createRazorpayCustomer(name: string, email: string, contact?: string, configOverride?: RazorpayConfig | null): Promise<RazorpayCustomer> {
  const config = resolveConfig(configOverride);
  if (!config) throw new Error("Razorpay is not configured.");
  return razorpayRequest<RazorpayCustomer>("POST", "/customers", config, { name, email, contact });
}

export async function fetchRazorpayPayment(paymentId: string, configOverride?: RazorpayConfig | null): Promise<{ id: string; order_id: string; amount: number; status: string; method: string }> {
  const config = resolveConfig(configOverride);
  if (!config) throw new Error("Razorpay is not configured.");
  return razorpayRequest("GET", `/payments/${paymentId}`, config);
}

export function verifyRazorpaySignature(orderId: string, paymentId: string, signature: string, configOverride?: RazorpayConfig | null): boolean {
  const config = resolveConfig(configOverride);
  if (!config) return false;
  const body = `${orderId}|${paymentId}`;
  const expected = crypto.createHmac("sha256", config.keySecret).update(body).digest("hex");
  return expected === signature;
}

export function verifyRazorpayWebhookSignature(rawBody: Buffer, signature: string, webhookSecretOverride?: string): boolean {
  const secret = webhookSecretOverride || ENV_WEBHOOK_SECRET;
  if (!secret) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  return expected === signature;
}
