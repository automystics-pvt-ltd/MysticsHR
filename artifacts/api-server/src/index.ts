import path from "node:path";
import { existsSync } from "node:fs";
import express from "express";
import app from "./app";
import { logger } from "./lib/logger";
import { startScheduler } from "./lib/scheduler";
import { backfillEmployeeTimezones } from "./lib/timezone-backfill";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// SPA serving is only used when the API server is the sole process (e.g.
// self-hosted VPS with PM2). On Replit, each artifact runs independently
// and the routing layer handles path dispatch — so SPA files are not
// co-located here. Set SERVE_SPA=true in the VPS environment to enable.
const serveSpa = process.env.SERVE_SPA === "true";

if (process.env.NODE_ENV === "production" && serveSpa) {
  // ── Platform Admin (/platform_admin) ────────────────────────────────────
  const adminCandidates = [
    path.resolve(process.cwd(), "artifacts/platform-admin/dist/public"),
    path.resolve(process.cwd(), "../platform-admin/dist/public"),
    path.resolve(process.cwd(), "../../platform-admin/dist/public"),
  ];
  const adminDir = adminCandidates.find((p) => existsSync(path.join(p, "index.html")));

  if (adminDir) {
    logger.info({ adminDir }, "Serving Platform Admin SPA at /platform_admin");
    app.use("/platform_admin", express.static(adminDir, { maxAge: "1h", index: false }));
    app.get(/^\/platform_admin(\/.*)?$/, (_req, res) => {
      res.sendFile(path.join(adminDir, "index.html"));
    });
  } else {
    logger.warn({ tried: adminCandidates }, "Platform Admin dist not found; /platform_admin will return 404");
  }

  // ── MysticsHR SPA (everything else) ─────────────────────────────────────
  const candidates = [
    path.resolve(process.cwd(), "artifacts/mysticshr/dist/public"),
    path.resolve(process.cwd(), "../mysticshr/dist/public"),
    path.resolve(process.cwd(), "../../mysticshr/dist/public"),
  ];
  const spaDir = candidates.find((p) => existsSync(path.join(p, "index.html")));

  if (spaDir) {
    logger.info({ spaDir }, "Serving MysticsHR SPA in production");
    app.use(express.static(spaDir, { maxAge: "1h", index: false }));
    app.get(/^\/(?!api\/).*/, (_req, res) => {
      res.sendFile(path.join(spaDir, "index.html"));
    });
  } else {
    logger.warn(
      { tried: candidates },
      "NODE_ENV=production but built SPA not found; only /api will be served",
    );
  }
}

const server = app.listen(port, "0.0.0.0", () => {
  logger.info({ port }, "Server listening");
  startScheduler(port);
  void backfillEmployeeTimezones();
});

server.on("error", (err) => {
  logger.error({ err }, "Error listening on port");
  process.exit(1);
});
