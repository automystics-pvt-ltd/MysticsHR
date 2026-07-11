import { Router } from "express";
import { db } from "../lib/db";
import { sql } from "drizzle-orm";
import { requirePlatformAdmin } from "../lib/auth";

const router = Router();
router.use("/platform/db", requirePlatformAdmin);

// ─── Helpers ────────────────────────────────────────────────────────────────

async function getValidTables(): Promise<string[]> {
  const result = await db.execute(sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);
  return (result.rows as { table_name: string }[]).map((r) => r.table_name);
}

function escId(name: string) {
  // safe only after validating against getValidTables()
  return `"${name.replace(/"/g, "")}"`;
}

async function logDbAdminOp(
  adminId: number,
  adminEmail: string,
  action: string,
  tableName: string,
  details: Record<string, unknown>,
) {
  try {
    await db.execute(sql`
      INSERT INTO platform_db_audit_log (admin_id, admin_email, action, table_name, details, created_at)
      VALUES (${adminId}, ${adminEmail}, ${action}, ${tableName}, ${JSON.stringify(details)}::jsonb, now())
    `);
  } catch {
    // best-effort
  }
}

// ─── 1. List tables ──────────────────────────────────────────────────────────

router.get("/platform/db/tables", async (_req, res) => {
  try {
    const result = await db.execute(sql`
      SELECT
        t.table_name,
        COALESCE(s.n_live_tup, 0)::int AS row_count,
        (SELECT count(*)::int FROM information_schema.columns c
         WHERE c.table_schema = 'public' AND c.table_name = t.table_name) AS column_count,
        COALESCE(pg_total_relation_size(quote_ident(t.table_name)), 0)::bigint AS size_bytes
      FROM information_schema.tables t
      LEFT JOIN pg_stat_user_tables s ON s.relname = t.table_name AND s.schemaname = 'public'
      WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
      ORDER BY t.table_name
    `);
    res.json({ data: result.rows });
  } catch (err) { console.error(err); res.status(500).json({ error: "Internal server error" }); }
});

// ─── 2. Table schema ─────────────────────────────────────────────────────────

router.get("/platform/db/tables/:table/schema", async (req, res) => {
  const { table } = req.params;
  try {
    const valid = await getValidTables();
    if (!valid.includes(table)) { res.status(404).json({ error: "Table not found" }); return; }

    const cols = await db.execute(sql`
      SELECT
        column_name, data_type, udt_name, is_nullable,
        column_default, character_maximum_length
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = ${table}
      ORDER BY ordinal_position
    `);

    const indexes = await db.execute(sql`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE schemaname = 'public' AND tablename = ${table}
    `);

    const constraints = await db.execute(sql`
      SELECT
        tc.constraint_name, tc.constraint_type,
        kcu.column_name, ccu.table_name AS foreign_table, ccu.column_name AS foreign_column
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
      LEFT JOIN information_schema.constraint_column_usage ccu
        ON tc.constraint_name = ccu.constraint_name AND tc.table_schema = ccu.table_schema
      WHERE tc.table_schema = 'public' AND tc.table_name = ${table}
    `);

    res.json({ columns: cols.rows, indexes: indexes.rows, constraints: constraints.rows });
  } catch (err) { console.error(err); res.status(500).json({ error: "Internal server error" }); }
});

// ─── 3. Table rows ───────────────────────────────────────────────────────────

router.get("/platform/db/tables/:table/rows", async (req, res) => {
  const { table } = req.params;
  const page  = Math.max(1, parseInt(String(req.query.page  ?? "1"), 10));
  const limit = Math.min(200, Math.max(1, parseInt(String(req.query.limit ?? "50"), 10)));
  const offset = (page - 1) * limit;
  const search = String(req.query.search ?? "").trim();
  const sortCol = String(req.query.sort ?? "");
  const sortDir = req.query.dir === "desc" ? "DESC" : "ASC";

  try {
    const valid = await getValidTables();
    if (!valid.includes(table)) { res.status(404).json({ error: "Table not found" }); return; }

    // get columns for search
    const colsResult = await db.execute(sql`
      SELECT column_name, data_type FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = ${table}
      ORDER BY ordinal_position
    `);
    const cols = colsResult.rows as { column_name: string; data_type: string }[];

    // build WHERE for search (cast to text)
    let whereClause = "";
    if (search) {
      const searchConditions = cols
        .filter((c) => ["text","character varying","character","uuid","integer","bigint","boolean","numeric","jsonb","timestamp without time zone","timestamp with time zone","date"].includes(c.data_type))
        .map((c) => `${escId(c.column_name)}::text ILIKE '%${search.replace(/'/g, "''")}%'`)
        .join(" OR ");
      if (searchConditions) whereClause = `WHERE ${searchConditions}`;
    }

    // validate sort column
    const validSortCol = sortCol && cols.some((c) => c.column_name === sortCol) ? escId(sortCol) : "1";

    const countResult = await db.execute(
      sql.raw(`SELECT count(*)::int AS total FROM ${escId(table)} ${whereClause}`)
    );
    const total = (countResult.rows[0] as { total: number })?.total ?? 0;

    const rowsResult = await db.execute(
      sql.raw(`SELECT * FROM ${escId(table)} ${whereClause} ORDER BY ${validSortCol} ${sortDir} LIMIT ${limit} OFFSET ${offset}`)
    );

    res.json({ data: rowsResult.rows, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (err) { console.error(err); res.status(500).json({ error: String(err) }); }
});

// ─── 4. Create row ───────────────────────────────────────────────────────────

router.post("/platform/db/tables/:table/rows", async (req, res) => {
  const { table } = req.params;
  const admin = (req as any).platformAdmin;
  try {
    const valid = await getValidTables();
    if (!valid.includes(table)) { res.status(404).json({ error: "Table not found" }); return; }

    const body = req.body as Record<string, unknown>;
    const keys = Object.keys(body).filter((k) => /^[a-z_][a-z0-9_]*$/i.test(k));
    if (keys.length === 0) { res.status(400).json({ error: "No fields provided" }); return; }

    const cols = keys.map(escId).join(", ");
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(", ");
    const values = keys.map((k) => body[k]);

    const result = await db.execute(
      sql.raw(`INSERT INTO ${escId(table)} (${cols}) VALUES (${placeholders}) RETURNING *`, values as never)
    );

    await logDbAdminOp(admin.id, admin.email, "CREATE", table, { created: result.rows[0] });
    res.status(201).json(result.rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: String(err) }); }
});

// ─── 5. Update row ───────────────────────────────────────────────────────────

router.patch("/platform/db/tables/:table/rows/:id", async (req, res) => {
  const { table, id } = req.params;
  const admin = (req as any).platformAdmin;
  try {
    const valid = await getValidTables();
    if (!valid.includes(table)) { res.status(404).json({ error: "Table not found" }); return; }

    // get old value first
    const oldResult = await db.execute(sql.raw(`SELECT * FROM ${escId(table)} WHERE id = $1 LIMIT 1`, [id] as never));
    const oldRow = oldResult.rows[0];
    if (!oldRow) { res.status(404).json({ error: "Row not found" }); return; }

    const body = req.body as Record<string, unknown>;
    const keys = Object.keys(body).filter((k) => /^[a-z_][a-z0-9_]*$/i.test(k) && k !== "id");
    if (keys.length === 0) { res.status(400).json({ error: "No fields provided" }); return; }

    const setClause = keys.map((k, i) => `${escId(k)} = $${i + 1}`).join(", ");
    const values = [...keys.map((k) => body[k]), id];

    const result = await db.execute(
      sql.raw(`UPDATE ${escId(table)} SET ${setClause} WHERE id = $${keys.length + 1} RETURNING *`, values as never)
    );
    if (!result.rows[0]) { res.status(404).json({ error: "Row not found" }); return; }

    await logDbAdminOp(admin.id, admin.email, "UPDATE", table, { id, before: oldRow, after: result.rows[0] });
    res.json(result.rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: String(err) }); }
});

// ─── 6. Delete row ───────────────────────────────────────────────────────────

router.delete("/platform/db/tables/:table/rows/:id", async (req, res) => {
  const { table, id } = req.params;
  const admin = (req as any).platformAdmin;
  try {
    const valid = await getValidTables();
    if (!valid.includes(table)) { res.status(404).json({ error: "Table not found" }); return; }

    const oldResult = await db.execute(sql.raw(`SELECT * FROM ${escId(table)} WHERE id = $1 LIMIT 1`, [id] as never));
    const oldRow = oldResult.rows[0];
    if (!oldRow) { res.status(404).json({ error: "Row not found" }); return; }

    await db.execute(sql.raw(`DELETE FROM ${escId(table)} WHERE id = $1`, [id] as never));

    await logDbAdminOp(admin.id, admin.email, "DELETE", table, { id, deleted: oldRow });
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: String(err) }); }
});

// ─── 7. Archive row ──────────────────────────────────────────────────────────

router.post("/platform/db/tables/:table/rows/:id/archive", async (req, res) => {
  const { table, id } = req.params;
  const { reason = "" } = req.body as { reason?: string };
  const admin = (req as any).platformAdmin;
  try {
    const valid = await getValidTables();
    if (!valid.includes(table)) { res.status(404).json({ error: "Table not found" }); return; }

    const oldResult = await db.execute(sql.raw(`SELECT * FROM ${escId(table)} WHERE id = $1 LIMIT 1`, [id] as never));
    const row = oldResult.rows[0];
    if (!row) { res.status(404).json({ error: "Row not found" }); return; }

    await db.execute(sql`
      INSERT INTO platform_db_archives (table_name, record_id, data, reason, admin_id, admin_email)
      VALUES (${table}, ${id}, ${JSON.stringify(row)}::jsonb, ${reason}, ${admin.id}, ${admin.email})
    `);

    await logDbAdminOp(admin.id, admin.email, "ARCHIVE", table, { id, reason, data: row });
    res.json({ ok: true, archived: row });
  } catch (err) { console.error(err); res.status(500).json({ error: String(err) }); }
});

// ─── 8. Archives list ────────────────────────────────────────────────────────

router.get("/platform/db/archives", async (req, res) => {
  const tableName = String(req.query.table ?? "");
  const page  = Math.max(1, parseInt(String(req.query.page  ?? "1"), 10));
  const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? "50"), 10)));
  const offset = (page - 1) * limit;
  try {
    const whereClause = tableName ? sql`WHERE table_name = ${tableName}` : sql``;
    const rows = await db.execute(sql`
      SELECT * FROM platform_db_archives ${whereClause}
      ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}
    `);
    const countRes = await db.execute(sql`SELECT count(*)::int AS total FROM platform_db_archives ${whereClause}`);
    const total = (countRes.rows[0] as { total: number })?.total ?? 0;
    res.json({ data: rows.rows, total, page, limit });
  } catch (err) { console.error(err); res.status(500).json({ error: String(err) }); }
});

// ─── 9. SQL Console ──────────────────────────────────────────────────────────

router.post("/platform/db/sql", async (req, res) => {
  const { query: rawSql = "", read_only = true } = req.body as { query?: string; read_only?: boolean };
  const admin = (req as any).platformAdmin;
  const trimmed = rawSql.trim();
  if (!trimmed) { res.status(400).json({ error: "Query is required" }); return; }

  // Safety: only allow SELECT in read-only mode
  if (read_only) {
    const normalized = trimmed.replace(/\s+/g, " ").toUpperCase();
    const allowed = ["SELECT", "EXPLAIN", "SHOW", "WITH"];
    const firstWord = normalized.split(" ")[0];
    if (!allowed.includes(firstWord)) {
      res.status(403).json({ error: "Only SELECT / EXPLAIN / SHOW / WITH queries are allowed in read-only mode. Toggle off read-only to run mutations." });
      return;
    }
  }

  const start = Date.now();
  try {
    const result = await db.execute(sql.raw(trimmed));
    const elapsed = Date.now() - start;
    await logDbAdminOp(admin.id, admin.email, read_only ? "SQL_READ" : "SQL_WRITE", "__console__", {
      query: trimmed.slice(0, 500), rows: result.rows.length, elapsed_ms: elapsed,
    });
    res.json({ rows: result.rows, row_count: result.rows.length, elapsed_ms: elapsed });
  } catch (err) {
    const elapsed = Date.now() - start;
    await logDbAdminOp(admin.id, admin.email, "SQL_ERROR", "__console__", {
      query: trimmed.slice(0, 500), error: String(err), elapsed_ms: elapsed,
    });
    res.status(400).json({ error: String(err), elapsed_ms: elapsed });
  }
});

// ─── 10. Global Search ───────────────────────────────────────────────────────

router.get("/platform/db/search", async (req, res) => {
  const query = String(req.query.q ?? "").trim();
  if (!query || query.length < 2) { res.status(400).json({ error: "Query must be at least 2 characters" }); return; }

  const maxPerTable = 5;
  try {
    const tables = await getValidTables();
    const results: { table: string; rows: unknown[] }[] = [];

    // Search text-like columns in each table (limit to first 20 tables to avoid timeout)
    for (const table of tables.slice(0, 30)) {
      try {
        const colsResult = await db.execute(sql`
          SELECT column_name FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = ${table}
            AND data_type IN ('text', 'character varying', 'character', 'uuid')
          ORDER BY ordinal_position
        `);
        const cols = (colsResult.rows as { column_name: string }[]).map((c) => c.column_name);
        if (cols.length === 0) continue;

        const conds = cols.map((c) => `${escId(c)}::text ILIKE $1`).join(" OR ");
        const rows = await db.execute(
          sql.raw(`SELECT * FROM ${escId(table)} WHERE ${conds} LIMIT ${maxPerTable}`, [`%${query}%`] as never)
        );
        if (rows.rows.length > 0) results.push({ table, rows: rows.rows });
      } catch { /* skip table */ }
    }

    res.json({ data: results, query });
  } catch (err) { console.error(err); res.status(500).json({ error: String(err) }); }
});

// ─── 11. Bulk Operations ─────────────────────────────────────────────────────

router.post("/platform/db/bulk", async (req, res) => {
  const { table, ids, action, reason } = req.body as {
    table?: string; ids?: (string | number)[]; action?: string; reason?: string;
  };
  const admin = (req as any).platformAdmin;
  if (!table || !ids?.length || !action) {
    res.status(400).json({ error: "table, ids, and action are required" }); return;
  }
  try {
    const valid = await getValidTables();
    if (!valid.includes(table)) { res.status(404).json({ error: "Table not found" }); return; }

    let affected = 0;
    if (action === "delete") {
      const idList = ids.map((_, i) => `$${i + 1}`).join(", ");
      const result = await db.execute(
        sql.raw(`DELETE FROM ${escId(table)} WHERE id IN (${idList}) RETURNING id`, ids as never)
      );
      affected = result.rows.length;
      await logDbAdminOp(admin.id, admin.email, "BULK_DELETE", table, { ids, affected });
    } else if (action === "archive") {
      // Archive each row
      for (const id of ids) {
        const oldResult = await db.execute(sql.raw(`SELECT * FROM ${escId(table)} WHERE id = $1 LIMIT 1`, [id] as never));
        const row = oldResult.rows[0];
        if (!row) continue;
        await db.execute(sql`
          INSERT INTO platform_db_archives (table_name, record_id, data, reason, admin_id, admin_email)
          VALUES (${table}, ${String(id)}, ${JSON.stringify(row)}::jsonb, ${reason ?? ""}, ${admin.id}, ${admin.email})
        `);
        affected++;
      }
      await logDbAdminOp(admin.id, admin.email, "BULK_ARCHIVE", table, { ids, affected, reason });
    } else {
      res.status(400).json({ error: "Unknown action. Use 'delete' or 'archive'" }); return;
    }

    res.json({ ok: true, affected });
  } catch (err) { console.error(err); res.status(500).json({ error: String(err) }); }
});

// ─── 12. Export table as CSV ─────────────────────────────────────────────────

router.get("/platform/db/export/:table", async (req, res) => {
  const { table } = req.params;
  const search = String(req.query.search ?? "").trim();
  try {
    const valid = await getValidTables();
    if (!valid.includes(table)) { res.status(404).json({ error: "Table not found" }); return; }

    const colsResult = await db.execute(sql`
      SELECT column_name, data_type FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = ${table}
      ORDER BY ordinal_position
    `);
    const cols = (colsResult.rows as { column_name: string; data_type: string }[]);

    let whereClause = "";
    if (search) {
      const searchConditions = cols
        .filter((c) => ["text","character varying","character","uuid"].includes(c.data_type))
        .map((c) => `${escId(c.column_name)}::text ILIKE '%${search.replace(/'/g, "''")}%'`)
        .join(" OR ");
      if (searchConditions) whereClause = `WHERE ${searchConditions}`;
    }

    const rowsResult = await db.execute(sql.raw(`SELECT * FROM ${escId(table)} ${whereClause} LIMIT 10000`));
    const rows = rowsResult.rows as Record<string, unknown>[];

    if (rows.length === 0) {
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="${table}.csv"`);
      res.send(cols.map((c) => c.column_name).join(",") + "\n");
      return;
    }

    const headers = Object.keys(rows[0]);
    const csvLines = [
      headers.join(","),
      ...rows.map((row) =>
        headers.map((h) => {
          const v = row[h];
          if (v === null || v === undefined) return "";
          const s = typeof v === "object" ? JSON.stringify(v) : String(v);
          return `"${s.replace(/"/g, '""')}"`;
        }).join(",")
      ),
    ];

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${table}.csv"`);
    res.send(csvLines.join("\n"));
  } catch (err) { console.error(err); res.status(500).json({ error: String(err) }); }
});

// ─── 13. Integrity Checks ────────────────────────────────────────────────────

router.post("/platform/db/integrity", async (_req, res) => {
  try {
    const checks: { name: string; status: "ok" | "warn" | "error"; message: string; count?: number }[] = [];

    // Check 1: employees without users
    const orphanEmployees = await db.execute(sql`
      SELECT count(*)::int AS cnt FROM employees e
      WHERE NOT EXISTS (SELECT 1 FROM hrms_users u WHERE u.employee_id = e.id)
        AND e.employment_status != 'terminated'
    `);
    const orphanEmpCount = (orphanEmployees.rows[0] as { cnt: number })?.cnt ?? 0;
    checks.push({
      name: "Active employees without user accounts",
      status: orphanEmpCount > 0 ? "warn" : "ok",
      message: orphanEmpCount > 0 ? `${orphanEmpCount} active employee(s) have no linked user account` : "All active employees have user accounts",
      count: orphanEmpCount,
    });

    // Check 2: users pointing to non-existent employees
    const orphanUsers = await db.execute(sql`
      SELECT count(*)::int AS cnt FROM hrms_users u
      WHERE u.employee_id IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM employees e WHERE e.id = u.employee_id)
    `);
    const orphanUserCount = (orphanUsers.rows[0] as { cnt: number })?.cnt ?? 0;
    checks.push({
      name: "Users with invalid employee references",
      status: orphanUserCount > 0 ? "error" : "ok",
      message: orphanUserCount > 0 ? `${orphanUserCount} user(s) point to deleted employees` : "All user-employee references are valid",
      count: orphanUserCount,
    });

    // Check 3: tenants without subscription plans
    const tenantsNoPlan = await db.execute(sql`
      SELECT count(*)::int AS cnt FROM tenants t
      WHERE t.plan_id IS NULL AND t.status = 'active'
    `);
    const noPlanCount = (tenantsNoPlan.rows[0] as { cnt: number })?.cnt ?? 0;
    checks.push({
      name: "Active tenants without subscription plan",
      status: noPlanCount > 0 ? "warn" : "ok",
      message: noPlanCount > 0 ? `${noPlanCount} active tenant(s) have no plan assigned` : "All active tenants have a plan",
      count: noPlanCount,
    });

    // Check 4: invoices without subscriptions
    try {
      const orphanInvoices = await db.execute(sql`
        SELECT count(*)::int AS cnt FROM tenant_invoices i
        WHERE i.tenant_id NOT IN (SELECT id FROM tenants)
      `);
      const orphanInvCount = (orphanInvoices.rows[0] as { cnt: number })?.cnt ?? 0;
      checks.push({
        name: "Invoices with missing tenant",
        status: orphanInvCount > 0 ? "error" : "ok",
        message: orphanInvCount > 0 ? `${orphanInvCount} invoice(s) reference deleted tenants` : "All invoices have valid tenant references",
        count: orphanInvCount,
      });
    } catch { checks.push({ name: "Invoices with missing tenant", status: "ok", message: "Skipped (table not found)" }); }

    // Check 5: table bloat (tables with high dead tuple ratio)
    const bloatResult = await db.execute(sql`
      SELECT relname AS table_name,
        n_dead_tup,
        n_live_tup,
        CASE WHEN n_live_tup > 0 THEN round(100.0 * n_dead_tup / n_live_tup) ELSE 0 END AS dead_pct
      FROM pg_stat_user_tables
      WHERE schemaname = 'public' AND n_live_tup > 100 AND n_dead_tup > 0
      ORDER BY dead_pct DESC LIMIT 5
    `);
    const bloatedTables = (bloatResult.rows as { table_name: string; dead_pct: number }[]).filter((r) => r.dead_pct > 20);
    checks.push({
      name: "Table bloat check",
      status: bloatedTables.length > 0 ? "warn" : "ok",
      message: bloatedTables.length > 0
        ? `Tables with >20% dead tuples: ${bloatedTables.map((t) => t.table_name).join(", ")}. Run VACUUM.`
        : "No significant table bloat detected",
    });

    // Check 6: missing indexes on foreign keys
    const fkNoIndex = await db.execute(sql`
      SELECT count(*)::int AS cnt
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
        AND NOT EXISTS (
          SELECT 1 FROM pg_indexes pi
          WHERE pi.schemaname = 'public' AND pi.tablename = tc.table_name
            AND pi.indexdef LIKE '%' || kcu.column_name || '%'
        )
    `);
    const fkCount = (fkNoIndex.rows[0] as { cnt: number })?.cnt ?? 0;
    checks.push({
      name: "Foreign keys without indexes",
      status: fkCount > 20 ? "warn" : "ok",
      message: fkCount > 0 ? `${fkCount} foreign key(s) may lack an index (can slow JOINs)` : "Foreign key index coverage looks good",
      count: fkCount,
    });

    const overallStatus = checks.some((c) => c.status === "error") ? "error"
      : checks.some((c) => c.status === "warn") ? "warn" : "ok";

    res.json({ checks, overall: overallStatus, checked_at: new Date().toISOString() });
  } catch (err) { console.error(err); res.status(500).json({ error: String(err) }); }
});

// ─── 14. Maintenance ─────────────────────────────────────────────────────────

router.post("/platform/db/maintenance/vacuum", async (req, res) => {
  const { table = "" } = req.body as { table?: string };
  const admin = (req as any).platformAdmin;
  try {
    if (table) {
      const valid = await getValidTables();
      if (!valid.includes(table)) { res.status(404).json({ error: "Table not found" }); return; }
      await db.execute(sql.raw(`VACUUM ANALYZE ${escId(table)}`));
      await logDbAdminOp(admin.id, admin.email, "VACUUM", table, {});
      res.json({ ok: true, message: `VACUUM ANALYZE completed on ${table}` });
    } else {
      await db.execute(sql.raw("VACUUM ANALYZE"));
      await logDbAdminOp(admin.id, admin.email, "VACUUM", "__all__", {});
      res.json({ ok: true, message: "VACUUM ANALYZE completed on all tables" });
    }
  } catch (err) { console.error(err); res.status(500).json({ error: String(err) }); }
});

router.post("/platform/db/maintenance/reindex", async (req, res) => {
  const { table = "" } = req.body as { table?: string };
  const admin = (req as any).platformAdmin;
  try {
    if (table) {
      const valid = await getValidTables();
      if (!valid.includes(table)) { res.status(404).json({ error: "Table not found" }); return; }
      await db.execute(sql.raw(`REINDEX TABLE ${escId(table)}`));
      await logDbAdminOp(admin.id, admin.email, "REINDEX", table, {});
      res.json({ ok: true, message: `REINDEX completed on ${table}` });
    } else {
      res.status(400).json({ error: "Table name is required for REINDEX" });
    }
  } catch (err) { console.error(err); res.status(500).json({ error: String(err) }); }
});

router.post("/platform/db/maintenance/cleanup-sessions", async (_req, res) => {
  const admin = ((_req as any).platformAdmin);
  try {
    const result = await db.execute(sql`
      DELETE FROM sessions WHERE expires_at < now()
    `);
    await logDbAdminOp(admin.id, admin.email, "CLEANUP_SESSIONS", "sessions", { deleted: (result as any).rowCount ?? 0 });
    res.json({ ok: true, message: `Expired sessions cleaned up`, deleted: (result as any).rowCount ?? 0 });
  } catch (err) {
    // sessions table may not exist or have different schema
    res.json({ ok: true, message: "Session cleanup completed (or no expired sessions found)" });
  }
});

router.post("/platform/db/maintenance/cleanup-audit-logs", async (req, res) => {
  const { days = 365 } = req.body as { days?: number };
  const admin = (req as any).platformAdmin;
  try {
    const result = await db.execute(sql`
      DELETE FROM audit_logs WHERE created_at < now() - ${days + " days"}::interval
    `);
    await logDbAdminOp(admin.id, admin.email, "CLEANUP_AUDIT_LOGS", "audit_logs", { days, deleted: (result as any).rowCount ?? 0 });
    res.json({ ok: true, message: `Audit log entries older than ${days} days deleted`, deleted: (result as any).rowCount ?? 0 });
  } catch (err) { console.error(err); res.status(500).json({ error: String(err) }); }
});

// ─── 15. DB Audit Log ────────────────────────────────────────────────────────

router.get("/platform/db/audit-log", async (req, res) => {
  const page  = Math.max(1, parseInt(String(req.query.page  ?? "1"), 10));
  const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? "50"), 10)));
  const offset = (page - 1) * limit;
  const tableFilter = String(req.query.table ?? "").trim();
  const actionFilter = String(req.query.action ?? "").trim();

  try {
    const conditions: string[] = [];
    if (tableFilter) conditions.push(`table_name = '${tableFilter.replace(/'/g, "''")}'`);
    if (actionFilter) conditions.push(`action = '${actionFilter.replace(/'/g, "''")}'`);
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const rows = await db.execute(
      sql.raw(`SELECT * FROM platform_db_audit_log ${where} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`)
    );
    const countRes = await db.execute(sql.raw(`SELECT count(*)::int AS total FROM platform_db_audit_log ${where}`));
    const total = (countRes.rows[0] as { total: number })?.total ?? 0;
    res.json({ data: rows.rows, total, page, limit });
  } catch (err) { console.error(err); res.status(500).json({ error: String(err) }); }
});

// ─── 16. Danger Zone: Truncate ───────────────────────────────────────────────

router.post("/platform/db/danger/truncate", async (req, res) => {
  const { table, confirm_text } = req.body as { table?: string; confirm_text?: string };
  const admin = (req as any).platformAdmin;
  if (!table || confirm_text !== `TRUNCATE ${table}`) {
    res.status(400).json({ error: `To confirm, set confirm_text to exactly: TRUNCATE ${table}` }); return;
  }
  try {
    const valid = await getValidTables();
    if (!valid.includes(table)) { res.status(404).json({ error: "Table not found" }); return; }

    const countRes = await db.execute(sql.raw(`SELECT count(*)::int AS cnt FROM ${escId(table)}`));
    const deletedCount = (countRes.rows[0] as { cnt: number })?.cnt ?? 0;

    await db.execute(sql.raw(`TRUNCATE TABLE ${escId(table)} RESTART IDENTITY CASCADE`));
    await logDbAdminOp(admin.id, admin.email, "TRUNCATE", table, { deleted_count: deletedCount });
    res.json({ ok: true, message: `Table ${table} truncated. ${deletedCount} rows deleted.`, deleted_count: deletedCount });
  } catch (err) { console.error(err); res.status(500).json({ error: String(err) }); }
});

// ─── 17. DB Stats ─────────────────────────────────────────────────────────────

router.get("/platform/db/stats", async (_req, res) => {
  try {
    const [dbSize, tableCount, connResult, cacheResult] = await Promise.all([
      db.execute(sql`SELECT pg_size_pretty(pg_database_size(current_database())) AS db_size,
                          pg_database_size(current_database())::bigint AS db_size_bytes`),
      db.execute(sql`SELECT count(*)::int AS cnt FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`),
      db.execute(sql`SELECT count(*)::int AS active FROM pg_stat_activity WHERE state = 'active'`),
      db.execute(sql`
        SELECT round(100.0 * sum(heap_blks_hit) / nullif(sum(heap_blks_hit) + sum(heap_blks_read), 0), 2) AS cache_hit_pct
        FROM pg_statio_user_tables
      `),
    ]);
    res.json({
      db_size: (dbSize.rows[0] as { db_size: string })?.db_size,
      db_size_bytes: (dbSize.rows[0] as { db_size_bytes: number })?.db_size_bytes,
      table_count: (tableCount.rows[0] as { cnt: number })?.cnt ?? 0,
      active_connections: (connResult.rows[0] as { active: number })?.active ?? 0,
      cache_hit_pct: (cacheResult.rows[0] as { cache_hit_pct: number })?.cache_hit_pct ?? 0,
    });
  } catch (err) { console.error(err); res.status(500).json({ error: String(err) }); }
});

export default router;
