const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

function buildCutoffs(questions = []) {
  const totalPossible = questions.reduce((sum, q) => sum + (q.maxScore || 0), 0);
  return {
    totalPossible,
    highCutoff: totalPossible * 0.75,
    medCutoff: totalPossible * 0.55,
  };
}

function median(values = []) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

function withScoreSummary(feature, cutoffs) {
  if (!feature) return feature;

  const totalsMap = new Map();
  let lastReviewedAt = null;
  
  for (const answer of feature.answers || []) {
    const q = answer.question;
    if (!q) continue;

    // Track most recent answer update for "last reviewed"
    if (answer.updatedAt) {
      const answerDate = new Date(answer.updatedAt);
      if (!lastReviewedAt || answerDate > new Date(lastReviewedAt)) {
        lastReviewedAt = answer.updatedAt;
      }
    }

    const normalized = q.isNegative
      ? (q.maxScore - Number(answer.value || 0))
      : Number(answer.value || 0);
    const key = answer.adminId || "legacy";

    if (!totalsMap.has(key)) {
      totalsMap.set(key, {
        adminId: answer.adminId || null,
        adminName:
          answer.admin?.name ||
          (answer.adminId ? `Admin #${answer.adminId}` : "Unattributed"),
        adminEmail: answer.admin?.email || null,
        total: 0,
      });
    }

    const entry = totalsMap.get(key);
    entry.total += normalized;
  }

  const scoreTotals = Array.from(totalsMap.values()).sort(
    (a, b) => b.total - a.total
  );

  const aggregated = Number(median(scoreTotals.map((t) => t.total)).toFixed(2));
  const priority = cutoffs
    ? aggregated >= cutoffs.highCutoff
      ? "high"
      : aggregated >= cutoffs.medCutoff
      ? "medium"
      : "low"
    : "low";

  return {
    ...feature,
    scoreTotals,
    total: Number.isFinite(aggregated) ? aggregated : 0,
    priority,
    lastReviewedAt,
  };
}

async function getScoreCutoffs() {
  const questions = await prisma.scoringQuestion.findMany({
    where: { isActive: true },
    select: { id: true, maxScore: true },
  });
  return buildCutoffs(questions);
}

function newCode() {
  return "FR-" + Date.now().toString(36).toUpperCase();
}

// GET /api/features
async function listFeatures(req, res) {
  try {
    const cutoffs = await getScoreCutoffs();

    const features = await prisma.featureRequest.findMany({
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        updatedBy: { select: { id: true, name: true, email: true } },
        answers: {
          include: {
            question: true,
            admin: { select: { id: true, name: true, email: true } },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    res.json(features.map((f) => withScoreSummary(f, cutoffs)));
  } catch (e) {
    console.error("listFeatures error:", e);
    res.status(500).json({ error: "Failed to load features" });
  }
}


async function getFeature(req, res) {
  const id = Number(req.params.id);
  const feature = await prisma.featureRequest.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      updatedBy: { select: { id: true, name: true, email: true } },
      answers: {
        include: {
          question: true,
          admin: { select: { id: true, name: true, email: true } },
        },
      },
      logs: { orderBy: { createdAt: "desc" }, take: 50 },
    },
  });
  if (!feature) return res.status(404).json({ error: "Not found" });

  const cutoffs = await getScoreCutoffs();
  res.json(withScoreSummary(feature, cutoffs));
}

// POST /api/features
async function createFeature(req, res) {
  try {
    const data = req.body || {};
    const adminId = req.admin?.id;

    const code = data.code || `FR-${Date.now().toString(36).toUpperCase()}`;

    const feature = await prisma.featureRequest.create({
      data: {
        code,
        title: data.title || "New feature request",
        summary: data.summary || "",
        module: data.module || "",
        status: data.status || "intake",
        requestedBy: data.requestedBy || "",
        tenant: data.tenant || "",
        tags: data.tags || [],
        decisionNotes: data.decisionNotes || "",
        createdByAdminId: adminId || null,
        updatedByAdminId: adminId || null,
      },
    });

    const cutoffs = await getScoreCutoffs();
    const fresh = await prisma.featureRequest.findUnique({
      where: { id: feature.id },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        updatedBy: { select: { id: true, name: true, email: true } },
        answers: {
          include: {
            question: true,
            admin: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    res.json(withScoreSummary(fresh, cutoffs));
  } catch (e) {
    console.error("createFeature error:", e);
    res.status(500).json({ error: "Failed to create feature" });
  }
}

async function updateFeature(req, res) {
  try {
    const id = Number(req.params.id);
    const data = req.body || {};
    const adminId = req.admin?.id;

    const feature = await prisma.featureRequest.update({
      where: { id },
      data: {
        title: data.title ?? undefined,
        summary: data.summary ?? undefined,
        module: data.module ?? undefined,
        status: data.status ?? undefined,
        requestedBy: data.requestedBy ?? undefined,
        tenant: data.tenant ?? undefined,
        tags: data.tags ?? undefined,
        decisionNotes: data.decisionNotes ?? undefined,
        updatedByAdminId: adminId || undefined,
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        updatedBy: { select: { id: true, name: true, email: true } },
        answers: {
          include: {
            question: true,
            admin: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    const cutoffs = await getScoreCutoffs();
    res.json(withScoreSummary(feature, cutoffs));
  } catch (e) {
    console.error("updateFeature error:", e);
    res.status(500).json({ error: e.message || "Internal Server Error" });
  }
}


async function deleteFeature(req, res) {
  const id = Number(req.params.id);
  await prisma.featureRequest.delete({ where: { id }});
  res.json({ ok: true });
}

async function updateAnswers(req, res) {
  try {
    const featureId = Number(req.params.id);
    const adminId = req.admin?.id;
    if (!adminId) {
      return res.status(403).json({ error: "Admin context required" });
    }

    const answers = Array.isArray(req.body.answers) ? req.body.answers : [];
    const normalized = answers
      .map((a) => ({
        questionId: Number(a.questionId),
        value: Math.max(0, Number(a.value) || 0),
      }))
      .filter((a) => Number.isInteger(a.questionId));

    if (normalized.length) {
      const upserts = normalized.map((a) =>
        prisma.featureScoreAnswer.upsert({
          where: {
            featureId_questionId_adminId: {
              featureId,
              questionId: a.questionId,
              adminId,
            },
          },
          update: { value: a.value },
          create: {
            featureId,
            questionId: a.questionId,
            value: a.value,
            adminId,
          },
        })
      );

      await prisma.$transaction(upserts);
    }

    const feature = await prisma.featureRequest.findUnique({
      where: { id: featureId },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        updatedBy: { select: { id: true, name: true, email: true } },
        answers: {
          include: {
            question: true,
            admin: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    if (!feature) {
      return res.status(404).json({ error: "Feature not found" });
    }

    const cutoffs = await getScoreCutoffs();
    res.json(withScoreSummary(feature, cutoffs));
  } catch (e) {
    console.error("updateAnswers error:", e);
    res.status(500).json({ error: "Failed to update answers" });
  }
}

module.exports = {
  listFeatures,
  getFeature,
  createFeature,
  updateFeature,
  deleteFeature,
  updateAnswers,
};
