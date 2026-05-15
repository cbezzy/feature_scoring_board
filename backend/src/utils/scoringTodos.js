/**
 * Features the admin has never started scoring (no FeatureScoreAnswer rows for that admin).
 * Matches dashboard "Your Scoring Todo": scoreTotals has no entry for this adminId.
 *
 * @param {import("@prisma/client").PrismaClient} prisma
 * @param {number} adminId
 */
async function listScoringTodoFeatures(prisma, adminId) {
  const aid = Number(adminId);
  if (!Number.isInteger(aid) || aid < 1) return [];

  return prisma.featureRequest.findMany({
    where: {
      answers: {
        none: { adminId: aid },
      },
    },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      code: true,
      title: true,
      summary: true,
    },
  });
}

module.exports = { listScoringTodoFeatures };
