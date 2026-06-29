import crypto from "node:crypto";
import { logger } from "./logger";

const KEY_ID = process.env["RAZORPAY_KEY_ID"];
const KEY_SECRET = process.env["RAZORPAY_KEY_SECRET"];

export function isRazorpayConfigured(): boolean {
  return Boolean(KEY_ID && KEY_SECRET);
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
  body?: unknown,
): Promise<T> {
  if (!KEY_ID || !KEY_SECRET) {
    throw new Error("Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.");
  }

  const auth = Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString("base64");
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

export async function createRazorpayOrder(opts: RazorpayOrderOptions): Promise<RazorpayOrder> {
  return razorpayRequest<RazorpayOrder>("POST", "/orders", {
    amount: opts.amount,
    currency: opts.currency ?? "INR",
    receipt: opts.receipt ?? `inv_${Date.now()}`,
    notes: opts.notes ?? {},
  });
}

export async function createRazorpayCustomer(name: string, email: string, contact?: string): Promise<RazorpayCustomer> {
  return razorpayRequest<RazorpayCustomer>("POST", "/customers", { name, email, contact });
}

export async function fetchRazorpayPayment(paymentId: string): Promise<{ id: string; order_id: string; amount: number; status: string; method: string }> {
  return razorpayRequest("GET", `/payments/${paymentId}`);
}

export function verifyRazorpaySignature(orderId: string, paymentId: string, signature: string): boolean {
  if (!KEY_SECRET) return false;
  const body = `${orderId}|${paymentId}`;
  const expected = crypto.createHmac("sha256", KEY_SECRET).update(body).digest("hex");
  return expected === signature;
}

export function verifyRazorpayWebhookSignature(rawBody: Buffer, signature: string): boolean {
  const secret = process.env["RAZORPAY_WEBHOOK_SECRET"];
  if (!secret) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  return expected === signature;
}

export function getRazorpayKeyId(): string {
  return KEY_ID ?? "";
}
