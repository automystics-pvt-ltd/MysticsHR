import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.set("trust proxy", 1);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false,
  }),
);

app.use(compression() as express.RequestHandler);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

const allowedOrigin = process.env.ALLOWED_ORIGIN;
app.use(
  cors({
    credentials: true,
    origin: allowedOrigin
      ? allowedOrigin.split(",").map((o) => o.trim())
      : true,
  }),
);

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === "/api/health",
  message: { error: "Too many requests, please try again later." },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many authentication attempts, please try again later." },
});

app.use(cookieParser());

// ── Webhook raw-body routes BEFORE express.json() ──────────────────────────
// Razorpay webhook — needs raw body for HMAC signature verification
app.post("/api/webhooks/razorpay", express.raw({ type: "application/json" }), async (req, res) => {
  try {
    const { verifyRazorpayWebhookSignature } = await import("./lib/razorpay-client");
    const sig = req.headers["x-razorpay-signature"] as string;
    const raw = req.body as Buffer;
    if (!verifyRazorpayWebhookSignature(raw, sig)) {
      return void res.status(400).json({ error: "Invalid webhook signature" });
    }
    const event = JSON.parse(raw.toString()) as { event: string; payload?: { payment?: { entity?: { order_id?: string; id?: string; status?: string } } } };
    logger.info({ event: event.event }, "Razorpay webhook received");
    // Payment capture is handled via verify-payment endpoint (client-side confirmation).
    // Webhook is a secondary safeguard for async captures.
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "Razorpay webhook error");
    res.status(500).json({ error: "Webhook processing failed" });
  }
});

// Stripe webhook — needs raw body for signature verification
app.post("/api/webhooks/stripe", express.raw({ type: "application/json" }), async (req, res) => {
  try {
    const { constructStripeWebhookEvent } = await import("./lib/stripe-client");
    const sig = req.headers["stripe-signature"] as string;
    const event = constructStripeWebhookEvent(req.body as Buffer, sig);
    logger.info({ type: event.type }, "Stripe webhook received");
    // Handle key events
    if (event.type === "customer.subscription.deleted") {
      logger.info({ subscriptionId: (event.data.object as { id: string }).id }, "Stripe subscription deleted");
    }
    if (event.type === "invoice.payment_succeeded") {
      logger.info({ invoiceId: (event.data.object as { id: string }).id }, "Stripe invoice paid");
    }
    res.json({ received: true });
  } catch (err) {
    logger.error({ err }, "Stripe webhook error");
    res.status(400).json({ error: "Webhook error" });
  }
});
// ───────────────────────────────────────────────────────────────────────────

app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

app.use("/api/auth/login", authLimiter);
app.use("/api/auth/signup", authLimiter);
app.use("/api", apiLimiter);
app.use("/api", router);

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err }, "Unhandled error");
  res.status(500).json({ error: "Internal server error" });
});

export default app;
