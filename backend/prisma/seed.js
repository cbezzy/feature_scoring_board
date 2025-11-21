const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const bcrypt = require("bcryptjs");

async function main() {
  const questions = [
    // Customer Impact
    { key: "tenant_coverage", label: "Tenant Coverage", group: "Customer Impact", maxScore: 5, isNegative: false, sortOrder: 10 },
    { key: "user_coverage", label: "User Coverage", group: "Customer Impact", maxScore: 5, isNegative: false, sortOrder: 20 },
    { key: "revenue_retention", label: "Revenue / Retention", group: "Customer Impact", maxScore: 5, isNegative: false, sortOrder: 30 },

    // Engineering Cost
    { key: "time_required", label: "Time Required", group: "Engineering Cost", helpText: "Long time = lower value", maxScore: 10, isNegative: true, sortOrder: 40 },
    { key: "build_complexity", label: "Build Complexity", group: "Engineering Cost", maxScore: 5, isNegative: true, sortOrder: 50 },
    { key: "maintenance_burden", label: "Maintenance Burden", group: "Engineering Cost", maxScore: 5, isNegative: true, sortOrder: 60 },

    // Ops & Infra
    { key: "performance_load", label: "Performance / Load", group: "Ops & Infrastructure", maxScore: 5, isNegative: true, sortOrder: 70 },
    { key: "support_impact", label: "Support Impact", group: "Ops & Infrastructure", maxScore: 5, isNegative: true, sortOrder: 80 },
    { key: "security_compliance", label: "Security / Compliance", group: "Ops & Infrastructure", maxScore: 5, isNegative: true, sortOrder: 90 },

    // Strategy
    { key: "roadmap_fit", label: "Roadmap Fit", group: "Strategic Alignment", maxScore: 5, isNegative: false, sortOrder: 100 },
    { key: "differentiation", label: "Differentiation", group: "Strategic Alignment", maxScore: 5, isNegative: false, sortOrder: 110 },
    { key: "multitenant_reuse", label: "Multi-Tenant Reuse", group: "Strategic Alignment", maxScore: 5, isNegative: false, sortOrder: 120 },
  ];

  for (const q of questions) {
    await prisma.scoringQuestion.upsert({
      where: { key: q.key },
      update: q,
      create: q,
    });
  }

  const email = "admin@local.test";

  // Check if already exists
  const existing = await prisma.admin.findUnique({ where: { email } });
  if (existing) {
    console.log("Default admin already exists:", email);
    return;
  }

  const passwordHash = await bcrypt.hash("1234", 10);

  const admin = await prisma.admin.create({
    data: {
      name: "Admin",
      email,
      passwordHash,
      isActive: true,
    }
  });

  console.log("Created default admin:", admin);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1); });
