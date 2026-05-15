require("dotenv").config();

const { PrismaClient } = require("@prisma/client");
const { listScoringTodoFeatures } = require("../src/utils/scoringTodos");
const {
  sendDailyScoringTodoReminder,
  isConfigured,
} = require("../src/services/mailgun");

async function main() {
  if (!isConfigured()) {
    console.warn("send-daily-scoring-reminders: MAILGUN_* not set; nothing to do");
    return;
  }

  const prisma = new PrismaClient();
  try {
    const admins = await prisma.admin.findMany({
      where: { isActive: true },
      select: { id: true, email: true, name: true },
    });

    let sent = 0;
    let skippedNoTodos = 0;
    let errors = 0;

    for (const admin of admins) {
      const email = (admin.email || "").trim();
      if (!email) continue;

      const todos = await listScoringTodoFeatures(prisma, admin.id);
      if (!todos.length) {
        skippedNoTodos++;
        continue;
      }

      try {
        await sendDailyScoringTodoReminder(
          email,
          admin.name || email,
          todos
        );
        sent++;
      } catch (e) {
        errors++;
        console.error(
          `send-daily-scoring-reminders: failed for ${email}:`,
          e.message || e
        );
      }
    }

    console.info(
      `send-daily-scoring-reminders: sent=${sent} skippedNoTodos=${skippedNoTodos} errors=${errors}`
    );

    if (errors > 0) {
      process.exitCode = 1;
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("send-daily-scoring-reminders:", e);
  process.exit(1);
});
