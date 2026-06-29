import bcrypt from "bcrypt";
import { db } from "../src/lib/db";
import { hrmsUsersTable } from "@workspace/db/schema";
import { tenantsTable } from "@workspace/db/schema";
import { and, eq } from "drizzle-orm";

/**
 * Provisions a Customer Admin (tenant-level administrator) in hrms_users.
 *
 * For Platform Super Admin provisioning (platform_admins table), use:
 *   psql $DATABASE_URL -c "INSERT INTO platform_admins (email, name, password_hash, is_active)
 *   VALUES ('admin@example.com', 'Platform Admin', '<bcrypt-hash>', true)
 *   ON CONFLICT (email) DO NOTHING;"
 *
 * Generate a bcrypt hash:
 *   node -e "require('bcrypt').hash('YourPass', 12).then(console.log)"
 *
 * Usage:
 *   EMAIL=admin@example.com FIRST_NAME=John LAST_NAME=Doe PASSWORD=StrongPass123 \
 *   TENANT_SLUG=default pnpm --filter @workspace/api-server dlx tsx scripts/add-super-admin.ts
 */
async function main() {
  const email = process.env.EMAIL?.trim().toLowerCase();
  const firstName = process.env.FIRST_NAME?.trim() || "Customer";
  const lastName = process.env.LAST_NAME?.trim() || "Admin";
  const password = process.env.PASSWORD?.trim() || "DemoTest123!@#";
  const tenantSlug = process.env.TENANT_SLUG?.trim() || "default";

  if (!email) {
    console.error("Missing EMAIL env var.");
    console.error(
      'Usage: EMAIL=you@example.com FIRST_NAME=John LAST_NAME=Doe PASSWORD="StrongPass123!" pnpm --filter @workspace/api-server dlx tsx scripts/add-super-admin.ts'
    );
    process.exit(1);
  }

  // Resolve tenant
  const [tenant] = await db
    .select()
    .from(tenantsTable)
    .where(eq(tenantsTable.slug, tenantSlug))
    .limit(1);

  if (!tenant) {
    console.error(`Tenant with slug "${tenantSlug}" not found.`);
    console.error("Run the migration script first: psql $DATABASE_URL -f lib/db/src/migrate-default-tenant.sql");
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const fullName = `${firstName} ${lastName}`.trim();

  // Check if user already exists in this tenant
  const [existingHrms] = await db
    .select()
    .from(hrmsUsersTable)
    .where(and(eq(hrmsUsersTable.email, email), eq(hrmsUsersTable.tenantId, tenant.id)))
    .limit(1);

  if (existingHrms) {
    await db
      .update(hrmsUsersTable)
      .set({
        role: "customer_admin",
        name: fullName,
        passwordHash,
        isActive: true,
        updatedAt: new Date(),
      })
      .where(and(eq(hrmsUsersTable.email, email), eq(hrmsUsersTable.tenantId, tenant.id)));
    console.log(`✓ Upgraded existing HRMS user to customer_admin: ${email} (tenant: ${tenantSlug})`);
  } else {
    await db.insert(hrmsUsersTable).values({
      tenantId: tenant.id,
      email,
      name: fullName,
      role: "customer_admin",
      passwordHash,
      isActive: true,
    });
    console.log(`+ Inserted new HRMS user as customer_admin: ${email} (tenant: ${tenantSlug})`);
  }

  console.log("\nDone. Sign in at your site with:");
  console.log(`  email:    ${email}`);
  console.log(`  password: ${password}`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
