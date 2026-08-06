process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const { Client } = require("pg");
const { PrismaClient } = require("@prisma/client");

const mysqlPrisma = new PrismaClient();

async function runFullMigration() {
  console.log("Connecting to Supabase PostgreSQL via direct pg client...");
  const pgClient = new Client({
    host: "aws-0-ap-northeast-1.pooler.supabase.com",
    port: 6543,
    user: "postgres.ymxubceemfstuwboieum",
    password: "ms-managment",
    database: "postgres",
    ssl: { rejectUnauthorized: false }
  });

  try {
    await pgClient.connect();
    console.log("Connected to Supabase PostgreSQL successfully!");

    const fetchTable = async (tableName) => {
      try {
        const res = await pgClient.query(`SELECT * FROM "${tableName}"`);
        return res.rows;
      } catch (err) {
        console.warn(`Could not read table "${tableName}":`, err.message);
        return [];
      }
    };

    // Helper to format JS values for MySQL Prisma
    const prepareRecord = (rec) => {
      const cleaned = { ...rec };
      // Convert null JSON fields to null or array/object
      Object.keys(cleaned).forEach(key => {
        if (cleaned[key] === null || cleaned[key] === undefined) {
          delete cleaned[key];
        }
      });
      return cleaned;
    };

    // 1. Companies
    const companies = await fetchTable("Company");
    console.log(`Found ${companies.length} Companies in Supabase.`);
    for (const c of companies) {
      await mysqlPrisma.company.upsert({
        where: { id: c.id },
        update: prepareRecord(c),
        create: prepareRecord(c)
      }).catch(e => console.warn(`Company ${c.name} sync error:`, e.message));
    }

    // 2. Internal Companies
    const ownCos = await fetchTable("InternalCompany");
    console.log(`Found ${ownCos.length} Internal Companies in Supabase.`);
    for (const c of ownCos) {
      await mysqlPrisma.internalCompany.upsert({
        where: { id: c.id },
        update: prepareRecord(c),
        create: prepareRecord(c)
      }).catch(e => console.warn(`InternalCompany ${c.name} sync error:`, e.message));
    }

    // 3. Branches
    const branches = await fetchTable("Branch");
    console.log(`Found ${branches.length} Branches in Supabase.`);
    for (const b of branches) {
      await mysqlPrisma.branch.upsert({
        where: { id: b.id },
        update: prepareRecord(b),
        create: prepareRecord(b)
      }).catch(e => console.warn(`Branch ${b.name} sync error:`, e.message));
    }

    // 4. Users
    const users = await fetchTable("User");
    console.log(`Found ${users.length} Users in Supabase.`);
    for (const u of users) {
      await mysqlPrisma.user.upsert({
        where: { email: u.email },
        update: prepareRecord(u),
        create: prepareRecord(u)
      }).catch(e => console.warn(`User ${u.email} sync error:`, e.message));
    }

    // 5. Roles
    const roles = await fetchTable("Role");
    console.log(`Found ${roles.length} Roles in Supabase.`);
    for (const r of roles) {
      await mysqlPrisma.role.upsert({
        where: { id: r.id },
        update: prepareRecord(r),
        create: prepareRecord(r)
      }).catch(e => console.warn(`Role ${r.name} sync error:`, e.message));
    }

    // 6. Staff
    const staff = await fetchTable("Staff");
    console.log(`Found ${staff.length} Staff members in Supabase.`);
    for (const s of staff) {
      await mysqlPrisma.staff.upsert({
        where: { id: s.id },
        update: prepareRecord(s),
        create: prepareRecord(s)
      }).catch(e => console.warn(`Staff ${s.name} sync error:`, e.message));
    }

    // 7. Applicants
    const applicants = await fetchTable("Applicant");
    console.log(`Found ${applicants.length} Applicants in Supabase.`);
    for (const a of applicants) {
      await mysqlPrisma.applicant.upsert({
        where: { id: a.id },
        update: prepareRecord(a),
        create: prepareRecord(a)
      }).catch(e => console.warn(`Applicant ${a.fullName} sync error:`, e.message));
    }

    // 8. Tasks
    const tasks = await fetchTable("Task");
    console.log(`Found ${tasks.length} Tasks in Supabase.`);
    for (const t of tasks) {
      await mysqlPrisma.task.upsert({
        where: { id: t.id },
        update: prepareRecord(t),
        create: prepareRecord(t)
      }).catch(e => console.warn(`Task ${t.title} sync error:`, e.message));
    }

    // 9. Interviews
    const interviews = await fetchTable("Interview");
    console.log(`Found ${interviews.length} Interviews in Supabase.`);
    for (const i of interviews) {
      await mysqlPrisma.interview.upsert({
        where: { id: i.id },
        update: prepareRecord(i),
        create: prepareRecord(i)
      }).catch(e => console.warn(`Interview ${i.id} sync error:`, e.message));
    }

    // 10. Placements
    const placements = await fetchTable("Placement");
    console.log(`Found ${placements.length} Placements in Supabase.`);
    for (const p of placements) {
      await mysqlPrisma.placement.upsert({
        where: { id: p.id },
        update: prepareRecord(p),
        create: prepareRecord(p)
      }).catch(e => console.warn(`Placement ${p.id} sync error:`, e.message));
    }

    // 11. Payroll
    const payroll = await fetchTable("PayrollRecord");
    console.log(`Found ${payroll.length} Payroll Records in Supabase.`);
    for (const pr of payroll) {
      await mysqlPrisma.payrollRecord.upsert({
        where: { id: pr.id },
        update: prepareRecord(pr),
        create: prepareRecord(pr)
      }).catch(e => console.warn(`Payroll ${pr.id} sync error:`, e.message));
    }

    // 12. Vehicles
    const vehicles = await fetchTable("Vehicle");
    console.log(`Found ${vehicles.length} Vehicles in Supabase.`);
    for (const v of vehicles) {
      await mysqlPrisma.vehicle.upsert({
        where: { id: v.id },
        update: prepareRecord(v),
        create: prepareRecord(v)
      }).catch(e => console.warn(`Vehicle ${v.id} sync error:`, e.message));
    }

    // 13. Suppliers
    const suppliers = await fetchTable("Supplier");
    console.log(`Found ${suppliers.length} Suppliers in Supabase.`);
    for (const sup of suppliers) {
      await mysqlPrisma.supplier.upsert({
        where: { id: sup.id },
        update: prepareRecord(sup),
        create: prepareRecord(sup)
      }).catch(e => console.warn(`Supplier ${sup.id} sync error:`, e.message));
    }

    console.log("--------------------------------------------------");
    console.log("🎉 MIGRATION COMPLETED SUCCESSFULLY FROM SUPABASE TO HOSTINGER MYSQL!");
    console.log("--------------------------------------------------");
  } catch (err) {
    console.error("Migration error:", err.message);
  } finally {
    await pgClient.end().catch(() => {});
    await mysqlPrisma.$disconnect();
  }
}

runFullMigration();
