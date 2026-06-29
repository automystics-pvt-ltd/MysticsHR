import { logger } from "./logger";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _stripe: any = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getStripe(): any {
  if (_stripe) return _stripe;
  const key = process.env["STRIPE_SECRET_KEY"];
  if (!key) throw new Error("Stripe is not configured. Set STRIPE_SECRET_KEY.");
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
  const Stripe = require("stripe") as any;
  _stripe = new Stripe(key, { apiVersion: "2026-06-24.dahlia" });
  return _stripe;
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env["STRIPE_SECRET_KEY"]);
}

export async function createStripeCustomer(name: string, email: string, tenantId: number) {
  const stripe = getStripe();
  return stripe.customers.create({ name, email, metadata: { tenantId: String(tenantId) } });
}

export async function createStripeCheckoutSession(opts: {
  customerId: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  tenantId: number;
  invoiceId?: number;
}) {
  const stripe = getStripe();
  return stripe.checkout.sessions.create({
    customer: opts.customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: opts.priceId, quantity: 1 }],
    success_url: opts.successUrl,
    cancel_url: opts.cancelUrl,
    metadata: { tenantId: String(opts.tenantId), invoiceId: String(opts.invoiceId ?? "") },
  });
}

export async function createStripeBillingPortalSession(customerId: string, returnUrl: string) {
  const stripe = getStripe();
  return stripe.billingPortal.sessions.create({ customer: customerId, return_url: returnUrl });
}

export async function cancelStripeSubscription(subscriptionId: string) {
  const stripe = getStripe();
  return stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: true });
}

export async function resumeStripeSubscription(subscriptionId: string) {
  const stripe = getStripe();
  return stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: false });
}

export function constructStripeWebhookEvent(payload: Buffer, signature: string) {
  const stripe = getStripe();
  const secret = process.env["STRIPE_WEBHOOK_SECRET"];
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET not set");
  return stripe.webhooks.constructEvent(payload, signature, secret);
}

export { logger };
