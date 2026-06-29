import { Router } from "express";
import { eq, and, desc, sql } from "drizzle-orm";
import { db } from "../lib/db";
import {
  tenantInvoicesTable,
  paymentTransactionsTable,
  subscriptionHistoryTable,
  tenantsTable,
  subscriptionPlansTable,
} from "@workspace/db/schema";
import { requireHrmsUser, requireRole } from "../lib/auth";
import {
  isRazorpayConfigured,
  createRazorpayOrder,
  verifyRazorpaySignature,
  getRazorpayKeyId,
} from "../lib/razorpay-client";
import { isStripeConfigured } from "../lib/stripe-client";
import { logger } from "../lib/logger";
import PDFDocument from "pdfkit";

const router = Router();

const GST_RATE = 0.18;

function generateInvoiceNumber(tenantId: number): string {
  const now = new Date();
  const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `INV-${yyyymm}-${tenantId}-${rand}`;
}

function planAmountCents(plan: { priceMonthly: number; priceYearly: number }, cycle: string): number {
  return cycle === "yearly" ? plan.priceYearly * 100 : plan.priceMonthly * 100;
}

async function getOrCreateTenantWithPlan(tenantId: number) {
  const [tenant] = await db
    .select()
    .from(tenantsTable)
    .where(eq(tenantsTable.id, tenantId))
    .limit(1);
  if (!tenant) throw new Error("Tenant not found");

  let plan = null;
  if (tenant.planId) {
    const [p] = await db
      .select()
      .from(subscriptionPlansTable)
      .where(eq(subscriptionPlansTable.id, tenant.planId))
      .limit(1);
    plan = p ?? null;
  }
  return { tenant, plan };
}

function subscriptionStatus(tenant: typeof tenantsTable.$inferSelect): string {
  const now = new Date();
  if (tenant.status === "suspended") return "suspended";
  if (tenant.cancelAtPeriodEnd) return "cancelling";
  if (tenant.trialEndsAt && tenant.trialEndsAt > now) return "trial";
  if (tenant.subscriptionEndsAt && tenant.subscriptionEndsAt < now) {
    const grace = new Date(tenant.subscriptionEndsAt);
    grace.setDate(grace.getDate() + (tenant.gracePeriodDays ?? 7));
    return grace > now ? "grace_period" : "expired";
  }
  if (tenant.subscriptionEndsAt && tenant.subscriptionEndsAt > now) return "active";
  if (tenant.planId) return "active";
  return "inactive";
}

router.get("/billing/plans", requireHrmsUser, async (_req, res) => {
  try {
    const plans = await db
      .select()
      .from(subscriptionPlansTable)
      .where(eq(subscriptionPlansTable.isActive, true))
      .orderBy(subscriptionPlansTable.priceMonthly);
    res.json(plans);
  } catch (err) {
    logger.error({ err }, "billing.plans error");
    res.status(500).json({ error: "Failed to load plans" });
  }
});

router.get("/billing/subscription", requireHrmsUser, async (req, res) => {
  try {
    const tenantId = req.hrmsUser!.tenantId;
    const { tenant, plan } = await getOrCreateTenantWithPlan(tenantId);

    const [invoiceCounts] = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(tenantInvoicesTable)
      .where(eq(tenantInvoicesTable.tenantId, tenantId));

    const recentInvoices = await db
      .select()
      .from(tenantInvoicesTable)
      .where(eq(tenantInvoicesTable.tenantId, tenantId))
      .orderBy(desc(tenantInvoicesTable.createdAt))
      .limit(3);

    res.json({
      tenant: {
        id: tenant.id,
        name: tenant.name,
        status: tenant.status,
        billingCycle: tenant.billingCycle,
        subscriptionStartsAt: tenant.subscriptionStartsAt,
        subscriptionEndsAt: tenant.subscriptionEndsAt,
        trialEndsAt: tenant.trialEndsAt,
        cancelAtPeriodEnd: tenant.cancelAtPeriodEnd,
        gstNumber: tenant.gstNumber,
        billingAddress: tenant.billingAddress,
        razorpayCustomerId: tenant.razorpayCustomerId,
        stripeCustomerId: tenant.stripeCustomerId,
      },
      plan,
      subscriptionStatus: subscriptionStatus(tenant),
      totalInvoices: invoiceCounts?.count ?? 0,
      recentInvoices,
      gatewayConfig: {
        razorpay: isRazorpayConfigured() ? { keyId: getRazorpayKeyId() } : null,
        stripe: isStripeConfigured() ? {} : null,
      },
    });
  } catch (err) {
    logger.error({ err }, "billing.subscription error");
    res.status(500).json({ error: "Failed to load subscription" });
  }
});

router.post("/billing/razorpay/create-order", requireHrmsUser, async (req, res) => {
  try {
    if (!isRazorpayConfigured()) {
      return res.status(503).json({ error: "Razorpay payment gateway is not configured." });
    }

    const tenantId = req.hrmsUser!.tenantId;
    const { planId, billingCycle = "monthly" } = req.body as { planId: number; billingCycle?: string };

    const [plan] = await db
      .select()
      .from(subscriptionPlansTable)
      .where(and(eq(subscriptionPlansTable.id, planId), eq(subscriptionPlansTable.isActive, true)))
      .limit(1);

    if (!plan) return res.status(404).json({ error: "Plan not found" });
    if (plan.type === "trial" || plan.type === "custom") {
      return res.status(400).json({ error: "This plan cannot be purchased directly." });
    }

    const [tenant] = await db.select().from(tenantsTable).where(eq(tenantsTable.id, tenantId)).limit(1);
    if (!tenant) return res.status(404).json({ error: "Tenant not found" });

    const baseAmountCents = planAmountCents(plan, billingCycle);
    const taxCents = Math.round(baseAmountCents * GST_RATE);
    const totalCents = baseAmountCents + taxCents;

    const now = new Date();
    const periodStart = new Date(now);
    const periodEnd = billingCycle === "yearly"
      ? new Date(now.getFullYear() + 1, now.getMonth(), now.getDate())
      : new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());

    const invoiceNumber = generateInvoiceNumber(tenantId);
    const [invoice] = await db
      .insert(tenantInvoicesTable)
      .values({
        tenantId,
        planId,
        invoiceNumber,
        billingCycle,
        amountCents: baseAmountCents,
        taxAmountCents: taxCents,
        gstNumber: tenant.gstNumber ?? undefined,
        currency: "INR",
        billingPeriodStart: periodStart.toISOString().split("T")[0],
        billingPeriodEnd: periodEnd.toISOString().split("T")[0],
        dueDate: now.toISOString().split("T")[0],
        status: "pending",
        gateway: "razorpay",
        description: `${plan.name} plan – ${billingCycle === "yearly" ? "Annual" : "Monthly"} subscription`,
      })
      .returning();

    const order = await createRazorpayOrder({
      amount: totalCents,
      currency: "INR",
      receipt: invoice!.invoiceNumber,
      notes: {
        tenantId: String(tenantId),
        planId: String(planId),
        invoiceId: String(invoice!.id),
        billingCycle,
      },
    });

    await db
      .update(tenantInvoicesTable)
      .set({ gatewayOrderId: order.id, updatedAt: new Date() })
      .where(eq(tenantInvoicesTable.id, invoice!.id));

    await db.insert(paymentTransactionsTable).values({
      tenantId,
      invoiceId: invoice!.id,
      gateway: "razorpay",
      gatewayOrderId: order.id,
      amountCents: totalCents,
      currency: "INR",
      status: "created",
    });

    res.json({
      orderId: order.id,
      invoiceId: invoice!.id,
      invoiceNumber: invoice!.invoiceNumber,
      amountCents: totalCents,
      baseAmountCents,
      taxCents,
      currency: "INR",
      keyId: getRazorpayKeyId(),
      prefill: {
        name: tenant.name,
        email: tenant.contactEmail ?? "",
      },
    });
  } catch (err) {
    logger.error({ err }, "billing.razorpay.create-order error");
    res.status(500).json({ error: "Failed to create payment order" });
  }
});

router.post("/billing/razorpay/verify-payment", requireHrmsUser, async (req, res) => {
  try {
    if (!isRazorpayConfigured()) {
      return res.status(503).json({ error: "Razorpay not configured" });
    }

    const tenantId = req.hrmsUser!.tenantId;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, invoiceId, planId, billingCycle = "monthly" } = req.body as {
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
      invoiceId: number;
      planId: number;
      billingCycle?: string;
    };

    const valid = verifyRazorpaySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
    if (!valid) {
      return res.status(400).json({ error: "Payment signature verification failed. Do not retry." });
    }

    const [invoice] = await db
      .select()
      .from(tenantInvoicesTable)
      .where(and(eq(tenantInvoicesTable.id, invoiceId), eq(tenantInvoicesTable.tenantId, tenantId)))
      .limit(1);

    if (!invoice) return res.status(404).json({ error: "Invoice not found" });

    const now = new Date();
    const [plan] = await db.select().from(subscriptionPlansTable).where(eq(subscriptionPlansTable.id, planId)).limit(1);

    const periodEnd = billingCycle === "yearly"
      ? new Date(now.getFullYear() + 1, now.getMonth(), now.getDate())
      : new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());

    await db
      .update(tenantInvoicesTable)
      .set({
        status: "paid",
        paidAt: now,
        paymentMethod: "razorpay",
        paymentReference: razorpay_payment_id,
        gatewayPaymentId: razorpay_payment_id,
        updatedAt: now,
      })
      .where(eq(tenantInvoicesTable.id, invoiceId));

    await db
      .update(paymentTransactionsTable)
      .set({
        gatewayPaymentId: razorpay_payment_id,
        gatewaySignature: razorpay_signature,
        status: "captured",
        method: "card",
        updatedAt: now,
      })
      .where(eq(paymentTransactionsTable.gatewayOrderId, razorpay_order_id));

    const [tenant] = await db.select().from(tenantsTable).where(eq(tenantsTable.id, tenantId)).limit(1);
    const oldPlanId = tenant?.planId ?? null;

    await db
      .update(tenantsTable)
      .set({
        planId,
        billingCycle,
        isActive: true,
        status: "active",
        subscriptionStartsAt: now,
        subscriptionEndsAt: periodEnd,
        cancelAtPeriodEnd: false,
        updatedAt: now,
      })
      .where(eq(tenantsTable.id, tenantId));

    await db.insert(subscriptionHistoryTable).values({
      tenantId,
      fromPlanId: oldPlanId,
      toPlanId: planId,
      changeType: oldPlanId && oldPlanId !== planId ? (plan && plan.priceMonthly > 0 ? "upgrade" : "downgrade") : "new_subscription",
      billingCycle,
      amountCents: invoice.amountCents,
      currency: "INR",
      effectiveAt: now,
      notes: `Payment verified via Razorpay. Order: ${razorpay_order_id}`,
      createdBy: req.hrmsUser!.id,
    });

    res.json({ ok: true, invoiceNumber: invoice.invoiceNumber, plan: plan?.name });
  } catch (err) {
    logger.error({ err }, "billing.razorpay.verify-payment error");
    res.status(500).json({ error: "Failed to verify payment" });
  }
});

router.post("/billing/stripe/create-checkout", requireHrmsUser, async (req, res) => {
  try {
    if (!isStripeConfigured()) {
      return res.status(503).json({ error: "Stripe payment gateway is not configured." });
    }
    const { createStripeCustomer, createStripeCheckoutSession } = await import("../lib/stripe-client");

    const tenantId = req.hrmsUser!.tenantId;
    const { planId, billingCycle = "monthly", priceId, returnUrl } = req.body as {
      planId: number;
      billingCycle?: string;
      priceId: string;
      returnUrl: string;
    };

    if (!priceId) return res.status(400).json({ error: "Stripe price ID is required" });

    const [tenant] = await db.select().from(tenantsTable).where(eq(tenantsTable.id, tenantId)).limit(1);
    if (!tenant) return res.status(404).json({ error: "Tenant not found" });

    let customerId = tenant.stripeCustomerId;
    if (!customerId) {
      const customer = await createStripeCustomer(tenant.name, tenant.contactEmail ?? "", tenantId);
      customerId = customer.id;
      await db.update(tenantsTable).set({ stripeCustomerId: customerId, updatedAt: new Date() }).where(eq(tenantsTable.id, tenantId));
    }

    const session = await createStripeCheckoutSession({
      customerId,
      priceId,
      successUrl: `${returnUrl}?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${returnUrl}?payment=cancelled`,
      tenantId,
    });

    res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    logger.error({ err }, "billing.stripe.create-checkout error");
    res.status(500).json({ error: "Failed to create Stripe checkout session" });
  }
});

router.post("/billing/stripe/portal", requireHrmsUser, async (req, res) => {
  try {
    if (!isStripeConfigured()) {
      return res.status(503).json({ error: "Stripe not configured" });
    }
    const { createStripeBillingPortalSession } = await import("../lib/stripe-client");

    const tenantId = req.hrmsUser!.tenantId;
    const { returnUrl } = req.body as { returnUrl: string };

    const [tenant] = await db.select().from(tenantsTable).where(eq(tenantsTable.id, tenantId)).limit(1);
    if (!tenant?.stripeCustomerId) {
      return res.status(400).json({ error: "No Stripe customer found for this account" });
    }

    const session = await createStripeBillingPortalSession(tenant.stripeCustomerId, returnUrl);
    res.json({ url: session.url });
  } catch (err) {
    logger.error({ err }, "billing.stripe.portal error");
    res.status(500).json({ error: "Failed to create billing portal session" });
  }
});

router.get("/billing/invoices", requireHrmsUser, async (req, res) => {
  try {
    const tenantId = req.hrmsUser!.tenantId;
    const page = Number(req.query["page"] ?? 1);
    const limit = Math.min(Number(req.query["limit"] ?? 20), 100);
    const offset = (page - 1) * limit;

    const [invoices, [countRow]] = await Promise.all([
      db
        .select({
          invoice: tenantInvoicesTable,
          planName: subscriptionPlansTable.name,
        })
        .from(tenantInvoicesTable)
        .leftJoin(subscriptionPlansTable, eq(tenantInvoicesTable.planId, subscriptionPlansTable.id))
        .where(eq(tenantInvoicesTable.tenantId, tenantId))
        .orderBy(desc(tenantInvoicesTable.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`cast(count(*) as int)` })
        .from(tenantInvoicesTable)
        .where(eq(tenantInvoicesTable.tenantId, tenantId)),
    ]);

    res.json({
      data: invoices.map(r => ({ ...r.invoice, planName: r.planName })),
      total: countRow?.count ?? 0,
      page,
      limit,
    });
  } catch (err) {
    logger.error({ err }, "billing.invoices error");
    res.status(500).json({ error: "Failed to load invoices" });
  }
});

router.get("/billing/invoices/:id", requireHrmsUser, async (req, res) => {
  try {
    const tenantId = req.hrmsUser!.tenantId;
    const id = Number(req.params["id"]);

    const [row] = await db
      .select({
        invoice: tenantInvoicesTable,
        plan: subscriptionPlansTable,
        tenant: tenantsTable,
      })
      .from(tenantInvoicesTable)
      .leftJoin(subscriptionPlansTable, eq(tenantInvoicesTable.planId, subscriptionPlansTable.id))
      .leftJoin(tenantsTable, eq(tenantInvoicesTable.tenantId, tenantsTable.id))
      .where(and(eq(tenantInvoicesTable.id, id), eq(tenantInvoicesTable.tenantId, tenantId)))
      .limit(1);

    if (!row) return res.status(404).json({ error: "Invoice not found" });

    const txns = await db
      .select()
      .from(paymentTransactionsTable)
      .where(eq(paymentTransactionsTable.invoiceId, id))
      .orderBy(desc(paymentTransactionsTable.createdAt));

    res.json({ ...row.invoice, plan: row.plan, tenant: row.tenant, transactions: txns });
  } catch (err) {
    logger.error({ err }, "billing.invoice-detail error");
    res.status(500).json({ error: "Failed to load invoice" });
  }
});

router.get("/billing/invoices/:id/pdf", requireHrmsUser, async (req, res) => {
  try {
    const tenantId = req.hrmsUser!.tenantId;
    const id = Number(req.params["id"]);

    const [row] = await db
      .select({
        invoice: tenantInvoicesTable,
        plan: subscriptionPlansTable,
        tenant: tenantsTable,
      })
      .from(tenantInvoicesTable)
      .leftJoin(subscriptionPlansTable, eq(tenantInvoicesTable.planId, subscriptionPlansTable.id))
      .leftJoin(tenantsTable, eq(tenantInvoicesTable.tenantId, tenantsTable.id))
      .where(and(eq(tenantInvoicesTable.id, id), eq(tenantInvoicesTable.tenantId, tenantId)))
      .limit(1);

    if (!row) return res.status(404).json({ error: "Invoice not found" });

    const { invoice, plan, tenant } = row;
    const doc = new PDFDocument({ size: "A4", margin: 50 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="Invoice-${invoice.invoiceNumber}.pdf"`);
    doc.pipe(res);

    const primary = "#1a1a2e";
    const accent = "#4f46e5";
    const muted = "#6b7280";

    doc.rect(0, 0, 595, 120).fill(primary);
    doc.fillColor("white").fontSize(22).font("Helvetica-Bold").text("MysticsHR", 50, 35);
    doc.fontSize(10).font("Helvetica").fillColor("#a5b4fc")
      .text("Human Resource Management System", 50, 60)
      .text("support@mysticshr.com  |  www.mysticshr.com", 50, 75);

    doc.fillColor(accent).fontSize(18).font("Helvetica-Bold")
      .text("TAX INVOICE", 400, 35, { align: "right" });
    doc.fillColor("white").fontSize(10).font("Helvetica")
      .text(`No: ${invoice.invoiceNumber}`, 400, 60, { align: "right" })
      .text(`Date: ${new Date(invoice.issuedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`, 400, 75, { align: "right" });

    doc.fillColor(primary).fontSize(11).font("Helvetica-Bold").text("Bill To:", 50, 140);
    doc.fillColor("#374151").fontSize(10).font("Helvetica")
      .text(tenant?.name ?? "N/A", 50, 158)
      .text(tenant?.contactEmail ?? "", 50, 173);
    if (tenant?.gstNumber) doc.text(`GSTIN: ${tenant.gstNumber}`, 50, 188);

    doc.fillColor(primary).fontSize(11).font("Helvetica-Bold").text("Service Details:", 300, 140);
    const billAddr = tenant?.billingAddress as Record<string, string> | null;
    doc.fillColor("#374151").fontSize(10).font("Helvetica")
      .text(billAddr?.line1 ?? "", 300, 158)
      .text([billAddr?.city, billAddr?.state, billAddr?.pincode].filter(Boolean).join(", "), 300, 173)
      .text(billAddr?.country ?? "India", 300, 188);

    const tableTop = 230;
    doc.rect(50, tableTop, 495, 28).fill(primary);
    doc.fillColor("white").fontSize(9).font("Helvetica-Bold")
      .text("Description", 60, tableTop + 9)
      .text("Period", 250, tableTop + 9)
      .text("Amount (₹)", 450, tableTop + 9, { align: "right", width: 85 });

    const baseRupees = (invoice.amountCents / 100).toFixed(2);
    const taxRupees = (invoice.taxAmountCents / 100).toFixed(2);
    const discountRupees = invoice.discountCents > 0 ? (invoice.discountCents / 100).toFixed(2) : null;
    const totalRupees = ((invoice.amountCents + invoice.taxAmountCents - invoice.discountCents) / 100).toFixed(2);

    const rowY = tableTop + 38;
    doc.rect(50, rowY - 8, 495, 24).fill("#f9fafb");
    doc.fillColor("#374151").fontSize(9).font("Helvetica")
      .text(invoice.description ?? `${plan?.name ?? "Subscription"} – ${invoice.billingCycle === "yearly" ? "Annual" : "Monthly"}`, 60, rowY)
      .text(invoice.billingPeriodStart && invoice.billingPeriodEnd
        ? `${invoice.billingPeriodStart} to ${invoice.billingPeriodEnd}`
        : "", 250, rowY)
      .text(`₹${baseRupees}`, 450, rowY, { align: "right", width: 85 });

    const summaryX = 350;
    let summaryY = rowY + 40;

    const drawSummaryRow = (label: string, value: string, bold = false) => {
      doc.fillColor(bold ? primary : muted).fontSize(9).font(bold ? "Helvetica-Bold" : "Helvetica")
        .text(label, summaryX, summaryY)
        .text(value, 450, summaryY, { align: "right", width: 85 });
      summaryY += 18;
    };

    drawSummaryRow("Subtotal", `₹${baseRupees}`);
    if (discountRupees) drawSummaryRow("Discount", `-₹${discountRupees}`);
    drawSummaryRow("GST @ 18%", `₹${taxRupees}`);
    doc.moveTo(summaryX, summaryY - 2).lineTo(540, summaryY - 2).stroke(accent);
    drawSummaryRow("Total", `₹${totalRupees}`, true);

    summaryY += 10;
    const statusColor = invoice.status === "paid" ? "#059669" : invoice.status === "pending" ? "#d97706" : "#dc2626";
    doc.fillColor(statusColor).fontSize(10).font("Helvetica-Bold")
      .text(`Status: ${invoice.status.toUpperCase()}`, summaryX, summaryY);
    if (invoice.paidAt) {
      doc.fillColor(muted).fontSize(9).font("Helvetica")
        .text(`Paid on ${new Date(invoice.paidAt).toLocaleDateString("en-IN")}`, summaryX, summaryY + 15);
    }

    const footerY = 720;
    doc.moveTo(50, footerY).lineTo(545, footerY).stroke("#e5e7eb");
    doc.fillColor(muted).fontSize(8).font("Helvetica")
      .text("This is a computer-generated invoice and does not require a signature.", 50, footerY + 10, { align: "center", width: 495 })
      .text("MysticsHR  |  GSTIN: 29AABCM1234F1ZL  |  SAC Code: 998314", 50, footerY + 22, { align: "center", width: 495 });

    if (invoice.paymentReference) {
      doc.fillColor(muted).fontSize(8)
        .text(`Payment Reference: ${invoice.paymentReference}`, 50, footerY + 34, { align: "center", width: 495 });
    }

    doc.end();
  } catch (err) {
    logger.error({ err }, "billing.invoice-pdf error");
    res.status(500).json({ error: "Failed to generate PDF" });
  }
});

router.post("/billing/cancel", requireHrmsUser, requireRole("customer_admin"), async (req, res) => {
  try {
    const tenantId = req.hrmsUser!.tenantId;
    const [tenant] = await db.select().from(tenantsTable).where(eq(tenantsTable.id, tenantId)).limit(1);
    if (!tenant) return res.status(404).json({ error: "Tenant not found" });

    if (tenant.stripeSubscriptionId && isStripeConfigured()) {
      const { cancelStripeSubscription } = await import("../lib/stripe-client");
      await cancelStripeSubscription(tenant.stripeSubscriptionId);
    }

    await db.update(tenantsTable)
      .set({ cancelAtPeriodEnd: true, updatedAt: new Date() })
      .where(eq(tenantsTable.id, tenantId));

    await db.insert(subscriptionHistoryTable).values({
      tenantId,
      fromPlanId: tenant.planId,
      toPlanId: tenant.planId,
      changeType: "cancellation_scheduled",
      billingCycle: tenant.billingCycle,
      amountCents: 0,
      currency: "INR",
      notes: `Cancellation scheduled. Effective: ${tenant.subscriptionEndsAt?.toISOString().split("T")[0] ?? "period end"}`,
      createdBy: req.hrmsUser!.id,
    });

    res.json({ ok: true, message: "Subscription will be cancelled at the end of the current billing period." });
  } catch (err) {
    logger.error({ err }, "billing.cancel error");
    res.status(500).json({ error: "Failed to cancel subscription" });
  }
});

router.post("/billing/resume", requireHrmsUser, requireRole("customer_admin"), async (req, res) => {
  try {
    const tenantId = req.hrmsUser!.tenantId;
    const [tenant] = await db.select().from(tenantsTable).where(eq(tenantsTable.id, tenantId)).limit(1);
    if (!tenant) return res.status(404).json({ error: "Tenant not found" });

    if (tenant.stripeSubscriptionId && isStripeConfigured()) {
      const { resumeStripeSubscription } = await import("../lib/stripe-client");
      await resumeStripeSubscription(tenant.stripeSubscriptionId);
    }

    await db.update(tenantsTable)
      .set({ cancelAtPeriodEnd: false, updatedAt: new Date() })
      .where(eq(tenantsTable.id, tenantId));

    await db.insert(subscriptionHistoryTable).values({
      tenantId,
      fromPlanId: tenant.planId,
      toPlanId: tenant.planId,
      changeType: "cancellation_reversed",
      billingCycle: tenant.billingCycle,
      amountCents: 0,
      currency: "INR",
      notes: "Cancellation reversed — subscription will continue.",
      createdBy: req.hrmsUser!.id,
    });

    res.json({ ok: true, message: "Your subscription has been resumed." });
  } catch (err) {
    logger.error({ err }, "billing.resume error");
    res.status(500).json({ error: "Failed to resume subscription" });
  }
});

router.post("/billing/update-gst", requireHrmsUser, requireRole("customer_admin"), async (req, res) => {
  try {
    const tenantId = req.hrmsUser!.tenantId;
    const { gstNumber, billingAddress } = req.body as { gstNumber?: string; billingAddress?: Record<string, string> };
    await db.update(tenantsTable)
      .set({ gstNumber: gstNumber ?? undefined, billingAddress: billingAddress ?? undefined, updatedAt: new Date() })
      .where(eq(tenantsTable.id, tenantId));
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "billing.update-gst error");
    res.status(500).json({ error: "Failed to update billing details" });
  }
});

router.get("/billing/history", requireHrmsUser, requireRole("customer_admin"), async (req, res) => {
  try {
    const tenantId = req.hrmsUser!.tenantId;
    const history = await db
      .select()
      .from(subscriptionHistoryTable)
      .where(eq(subscriptionHistoryTable.tenantId, tenantId))
      .orderBy(desc(subscriptionHistoryTable.createdAt))
      .limit(50);
    res.json(history);
  } catch (err) {
    logger.error({ err }, "billing.history error");
    res.status(500).json({ error: "Failed to load history" });
  }
});

export default router;
