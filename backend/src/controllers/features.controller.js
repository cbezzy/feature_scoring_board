const { PrismaClient } = require("@prisma/client");
const { SCORE_KEYS, totalScore, priorityBand } = require("../utils/scoring");
const prisma = new PrismaClient();

function newCode() {
  return "FR-" + Date.now().toString(36).toUpperCase();
}

// GET /api/features
async function listFeatures(req, res) {
  try {
    // load active questions for dynamic cutoffs
    const questions = await prisma.scoringQuestion.findMany({
      where: { isActive: true },
      select: { id: true, maxScore: true },
    });

    const totalPossible = questions.reduce((s, q) => s + (q.maxScore || 0), 0);
    const highCutoff = totalPossible * 0.75;
    const medCutoff = totalPossible * 0.55;

    // load features + answers + question metadata
    const features = await prisma.featureRequest.findMany({
      include: {
        answers: { include: { question: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    // compute total + priority per feature
    const mapped = features.map((f) => {
      let total = 0;
      for (const ans of f.answers || []) {
        const q = ans.question;
        if (!q) continue;
        const v = Number(ans.value ?? 0);
        total += q.isNegative ? (q.maxScore - v) : v;
      }

      const priority =
        total >= highCutoff ? "high" :
        total >= medCutoff ? "medium" :
        "low";

      return { ...f, total, priority };
    });

    res.json(mapped);
  } catch (e) {
    console.error("listFeatures error:", e);
    res.status(500).json({ error: "Failed to load features" });
  }
}


async function getFeature(req, res) {
  const id = Number(req.params.id);
  const feature = await prisma.featureRequest.findUnique({
    where: { id },
    include: { score: true, logs: { orderBy: { createdAt: "desc" }, take: 50 } }
  });
  if (!feature) return res.status(404).json({ error: "Not found" });

  const total = feature.score ? totalScore(feature.score) : 0;
  res.json({ ...feature, total, priority: priorityBand(total) });
}

// POST /api/features
async function createFeature(req, res) {
  try {
    const adminId = req.admin?.id || null;
    const data = req.body || {};

    const code = data.code || `FR-${Date.now().toString(36).toUpperCase()}`;

    // 1) Create the feature WITHOUT createdByAdminId/score
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
      },
    });

    // 2) Auto-create default answers for all active questions
    const questions = await prisma.scoringQuestion.findMany({
      where: { isActive: true },
      select: { id: true, maxScore: true },
    });

    if (questions.length) {
      await prisma.featureScoreAnswer.createMany({
        data: questions.map(q => ({
          featureId: feature.id,
          questionId: q.id,
          value: Math.round((q.maxScore || 0) / 2),
        })),
        skipDuplicates: true,
      });
    }

    // 3) Return the fresh feature with answers+questions
    const fresh = await prisma.featureRequest.findUnique({
      where: { id: feature.id },
      include: {
        answers: { include: { question: true } },
      },
    });

    res.json(fresh);
  } catch (e) {
    console.error("createFeature error:", e);
    res.status(500).json({ error: "Failed to create feature" });
  }
}

async function updateFeature(req, res) {
  try {
    const id = Number(req.params.id);
    const data = req.body || {};

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
        // IMPORTANT: remove updatedByAdminId unless you added it to schema
      },
      include: {
        answers: { include: { question: true } },
        // you can add these if you want them:
        // logs: true,
        // createdBy: true,
        // updatedBy: true,
      },
    });

    res.json(feature);
  } catch (e) {
    console.error("updateFeature error:", e);
    res.status(500).json({ error: e.message || "Internal Server Error" });
  }
}


async function updateScores(req, res) {
  const id = Number(req.params.id);
  const data = req.body;

  const scorePatch = {};
  for (const k of SCORE_KEYS) {
    if (data[k] != null) scorePatch[k] = Number(data[k]);
  }
  if (data.securityGate != null) scorePatch.securityGate = !!data.securityGate;
  if (data.performanceGate != null) scorePatch.performanceGate = !!data.performanceGate;

  const score = await prisma.featureScore.update({
    where: { featureRequestId: id },
    data: { ...scorePatch, updatedByAdminId: req.admin.id }
  });

  await prisma.featureDecisionLog.create({
    data: {
      featureRequestId: id,
      adminId: req.admin.id,
      action: "score_updated",
      payload: scorePatch
    }
  });

  res.json(score);
}

async function deleteFeature(req, res) {
  const id = Number(req.params.id);
  await prisma.featureRequest.delete({ where: { id }});
  res.json({ ok: true });
}

module.exports = {
  listFeatures,
  getFeature,
  createFeature,
  updateFeature,
  updateScores,
  deleteFeature
};
