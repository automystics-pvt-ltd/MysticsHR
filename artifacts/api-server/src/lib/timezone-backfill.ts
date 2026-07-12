import { sql } from "drizzle-orm";
import { db } from "./db";
import { DEFAULT_TIMEZONE, isValidIanaTimezone } from "./timezones";

/**
 * One-time idempotent backfill of `employees.timezone` from the
 * configured company default in `system_settings.org_profile.timezone`.
 *
 * The schema's `DEFAULT 'Asia/Kolkata'` gives every existing row a
 * value when the column is added, but the task spec calls for the
 * company-configured timezone to be used. This helper aligns existing
 * rows on first boot after the migration and records a marker so it
 * does not run again.
 *
 * `system_settings` (like `employees`) is tenant-scoped: `tenant_id` is
 * NOT NULL. The backfill therefore runs once per tenant, using each
 * tenant's own `org_profile.timezone` setting and recording the
 * completion marker under that same tenant.
 */
export async function backfillEmployeeTimezones(): Promise<void> {
  try {
    const tenantRows = await db
      .execute<{ id: number }>(sql`SELECT id FROM tenants`)
      .then((r) => r.rows);

    for (const { id: tenantId } of tenantRows) {
      const markerRows = await db
        .execute<{ value: unknown }>(sql`
          SELECT value FROM system_settings
          WHERE category = 'system' AND key = 'employees_tz_backfilled' AND tenant_id = ${tenantId}
          LIMIT 1
        `)
        .then((r) => r.rows);
      if (markerRows.length > 0) continue;

      const [row] = await db
        .execute<{ value: unknown }>(sql`
          SELECT value FROM system_settings
          WHERE category = 'org_profile' AND key = 'timezone' AND tenant_id = ${tenantId}
          LIMIT 1
        `)
        .then((r) => r.rows);
      const companyTz =
        typeof row?.value === "string" && isValidIanaTimezone(row.value)
          ? row.value
          : DEFAULT_TIMEZONE;

      await db.execute(sql`
        UPDATE employees
        SET timezone = ${companyTz}
        WHERE tenant_id = ${tenantId}
          AND (timezone IS NULL OR timezone = '' OR timezone = ${DEFAULT_TIMEZONE})
      `);

      await db.execute(sql`
        INSERT INTO system_settings (tenant_id, category, key, value)
        VALUES (${tenantId}, 'system', 'employees_tz_backfilled', to_jsonb(true))
        ON CONFLICT DO NOTHING
      `);
    }
  } catch (e) {
    console.error("Timezone backfill failed (non-fatal):", e);
  }
}
