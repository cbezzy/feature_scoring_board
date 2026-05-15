/**
 * Scoring "complete" = one FeatureScoreAnswer per active ScoringQuestion for the admin.
 */

async function getActiveQuestionIds(prisma) {
  const rows = await prisma.scoringQuestion.findMany({
    where: { isActive: true },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

/**
 * @param {import("@prisma/client").PrismaClient} prisma
 * @param {{ featureId: number, adminId: number }} args
 */
async function isAdminScoringComplete(prisma, { featureId, adminId }) {
  const aid = Number(adminId);
  if (!Number.isInteger(aid) || aid < 1) return false;

  const activeIds = await getActiveQuestionIds(prisma);
  if (!activeIds.length) return false;

  const grouped = await prisma.featureScoreAnswer.groupBy({
    by: ["questionId"],
    where: {
      featureId,
      adminId: aid,
      questionId: { in: activeIds },
    },
  });

  return grouped.length === activeIds.length;
}

module.exports = { getActiveQuestionIds, isAdminScoringComplete };
