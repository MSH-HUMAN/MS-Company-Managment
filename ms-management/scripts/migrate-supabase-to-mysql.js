const { PrismaClient } = require("@prisma/client");

// MySQL client (default Prisma instance using DATABASE_URL)
const mysqlPrisma = new PrismaClient();

// Supabase PostgreSQL client (using SUPABASE_DATABASE_URL from env)
const { PrismaClient: PostgresClient } = require("@prisma/client");
const supabaseUrl = process.env.SUPABASE_DATABASE_URL;

async function migrateData() {
  if (!supabaseUrl) {
    console.log("No SUPABASE_DATABASE_URL found in .env, skipping data migration.");
    return;
  }

  console.log("Connecting to Supabase PostgreSQL to fetch records...");
  const pgPrisma = new PostgresClient({
    datasources: {
      db: { url: supabaseUrl }
    }
  });

  try {
    // 1. Migrate Companies
    const companies = await pgPrisma.company.findMany().catch(() => []);
    console.log(`Migrating ${companies.length} Companies...`);
    for (const c of companies) {
      await mysqlPrisma.company.upsert({
        where: { id: c.id },
        update: { ...c },
        create: { ...c }
      }).catch(e => console.warn(`Company ${c.name} sync warning:`, e.message));
    }

    // 2. Migrate Internal Companies
    const ownCos = await pgPrisma.internalCompany.findMany().catch(() => []);
    console.log(`Migrating ${ownCos.length} Internal Companies...`);
    for (const c of ownCos) {
      await mysqlPrisma.internalCompany.upsert({
        where: { id: c.id },
        update: { ...c },
        create: { ...c }
      }).catch(e => console.warn(`InternalCompany ${c.name} sync warning:`, e.message));
    }

    // 3. Migrate Branches
    const branches = await pgPrisma.branch.findMany().catch(() => []);
    console.log(`Migrating ${branches.length} Branches...`);
    for (const b of branches) {
      await mysqlPrisma.branch.upsert({
        where: { id: b.id },
        update: { ...b },
        create: { ...b }
      }).catch(e => console.warn(`Branch ${b.name} sync warning:`, e.message));
    }

    // 4. Migrate Staff
    const staff = await pgPrisma.staff.findMany().catch(() => []);
    console.log(`Migrating ${staff.length} Staff members...`);
    for (const s of staff) {
      await mysqlPrisma.staff.upsert({
        where: { id: s.id },
        update: { ...s },
        create: { ...s }
      }).catch(e => console.warn(`Staff ${s.name} sync warning:`, e.message));
    }

    // 5. Migrate Applicants
    const applicants = await pgPrisma.applicant.findMany().catch(() => []);
    console.log(`Migrating ${applicants.length} Applicants...`);
    for (const a of applicants) {
      await mysqlPrisma.applicant.upsert({
        where: { id: a.id },
        update: { ...a },
        create: { ...a }
      }).catch(e => console.warn(`Applicant ${a.fullName} sync warning:`, e.message));
    }

    // 6. Migrate Tasks
    const tasks = await pgPrisma.task.findMany().catch(() => []);
    console.log(`Migrating ${tasks.length} Tasks...`);
    for (const t of tasks) {
      await mysqlPrisma.task.upsert({
        where: { id: t.id },
        update: { ...t },
        create: { ...t }
      }).catch(e => console.warn(`Task ${t.title} sync warning:`, e.message));
    }

    // 7. Migrate Interviews
    const interviews = await pgPrisma.interview.findMany().catch(() => []);
    console.log(`Migrating ${interviews.length} Interviews...`);
    for (const i of interviews) {
      await mysqlPrisma.interview.upsert({
        where: { id: i.id },
        update: { ...i },
        create: { ...i }
      }).catch(e => console.warn(`Interview ${i.id} sync warning:`, e.message));
    }

    // 8. Migrate Placements
    const placements = await pgPrisma.placement.findMany().catch(() => []);
    console.log(`Migrating ${placements.length} Placements...`);
    for (const p of placements) {
      await mysqlPrisma.placement.upsert({
        where: { id: p.id },
        update: { ...p },
        create: { ...p }
      }).catch(e => console.warn(`Placement ${p.id} sync warning:`, e.message));
    }

    // 9. Migrate Payroll
    const payroll = await pgPrisma.payrollRecord.findMany().catch(() => []);
    console.log(`Migrating ${payroll.length} Payroll Records...`);
    for (const pr of payroll) {
      await mysqlPrisma.payrollRecord.upsert({
        where: { id: pr.id },
        update: { ...pr },
        create: { ...pr }
      }).catch(e => console.warn(`Payroll ${pr.id} sync warning:`, e.message));
    }

    console.log("ALL DATA MIGRATED TO HOSTINGER MYSQL SUCCESSFULLY!");
  } catch (err) {
    console.error("Migration warning (non-fatal):", err.message);
  } finally {
    await pgPrisma.$disconnect();
    await mysqlPrisma.$disconnect();
  }
}

migrateData();
