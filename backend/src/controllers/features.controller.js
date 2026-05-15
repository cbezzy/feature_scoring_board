const { PrismaClient } = require("@prisma/client");
const { sendNewFeatureNotification, sendScoringCompleteNudge } = require("../services/mailgun");
const {
  getSignedDownloadUrl,
  deleteObject,
  spacesConfigured,
} = require("../services/spaces");
const { isAdminScoringComplete } = require("../utils/scoringCompletion");
const { longTextFieldsTooLongError } = require("../utils/featureTextValidation");
const prisma = new PrismaClient();

async function withAttachmentUrls(feature) {
  if (!feature) return feature;
  const rows = feature.attachments || [];
  if (!rows.length) {
    return { ...feature, attachments: [] };
  }
  const attachments = await Promise.all(
    rows.map(async (a) => {
      let downloadUrl = null;
      if (spacesConfigured()) {
        try {
          downloadUrl = await getSignedDownloadUrl(a.objectKey);
        } catch (e) {
          console.error("presign attachment failed:", e.message || e);
        }
      }
      const { objectKey: _ok, ...rest } = a;
      return { ...rest, downloadUrl };
    })
  );
  return { ...feature, attachments };
}

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
      attachments: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!feature) return res.status(404).json({ error: "Not found" });

  const cutoffs = await getScoreCutoffs();
  const withUrls = await withAttachmentUrls(feature);
  res.json(withScoreSummary(withUrls, cutoffs));
}

// POST /api/features
async function createFeature(req, res) {
  try {
    const data = req.body || {};
    const adminId = req.admin?.id;

    const textCheckPayload = {
      summary: data.summary || "",
      pros: data.pros || "",
      cons: data.cons || "",
      decisionNotes: data.decisionNotes || "",
    };
    const longErr = longTextFieldsTooLongError(textCheckPayload);
    if (longErr) {
      return res.status(400).json({ error: longErr });
    }

    const code = data.code || `FR-${Date.now().toString(36).toUpperCase()}`;

    const feature = await prisma.featureRequest.create({
      data: {
        code,
        title: data.title || "New feature request",
        summary: data.summary || "",
        pros: data.pros || "",
        cons: data.cons || "",
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
        attachments: { orderBy: { createdAt: "asc" } },
      },
    });

    if (!fresh) {
      return res.status(500).json({ error: "Failed to load created feature" });
    }

    const cutoffs = await getScoreCutoffs();

    const withUrls = await withAttachmentUrls(fresh);
    res.json(withScoreSummary(withUrls, cutoffs));
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

    const longErr = longTextFieldsTooLongError(data);
    if (longErr) {
      return res.status(400).json({ error: longErr });
    }

    const prior = await prisma.featureRequest.findUnique({
      where: { id },
      select: { newFeatureNotifySent: true },
    });
    if (!prior) {
      return res.status(404).json({ error: "Not found" });
    }

    const shouldSendIntroEmail = !prior.newFeatureNotifySent;

    const feature = await prisma.featureRequest.update({
      where: { id },
      data: {
        title: data.title ?? undefined,
        summary: data.summary ?? undefined,
        pros: data.pros ?? undefined,
        cons: data.cons ?? undefined,
        module: data.module ?? undefined,
        status: data.status ?? undefined,
        requestedBy: data.requestedBy ?? undefined,
        tenant: data.tenant ?? undefined,
        tags: data.tags ?? undefined,
        decisionNotes: data.decisionNotes ?? undefined,
        updatedByAdminId: adminId || undefined,
        ...(shouldSendIntroEmail ? { newFeatureNotifySent: true } : {}),
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
        attachments: { orderBy: { createdAt: "asc" } },
      },
    });

    if (shouldSendIntroEmail) {
      const adminRows = await prisma.admin.findMany({
        where: { isActive: true },
        select: { email: true },
      });
      const recipientEmails = [
        ...new Set(adminRows.map((a) => a.email).filter(Boolean)),
      ];
      void sendNewFeatureNotification(
        {
          id: feature.id,
          code: feature.code,
          title: feature.title,
        },
        recipientEmails
      ).catch((err) =>
        console.error("mailgun notify failed:", err.message || err)
      );
    }

    const cutoffs = await getScoreCutoffs();
    const withUrls = await withAttachmentUrls(feature);
    res.json(withScoreSummary(withUrls, cutoffs));
  } catch (e) {
    console.error("updateFeature error:", e);
    res.status(500).json({ error: e.message || "Internal Server Error" });
  }
}


async function deleteFeature(req, res) {
  const id = Number(req.params.id);
  const keys = await prisma.featureAttachment.findMany({
    where: { featureId: id },
    select: { objectKey: true },
  });
  await prisma.featureRequest.delete({ where: { id } });
  if (spacesConfigured()) {
    for (const { objectKey } of keys) {
      void deleteObject(objectKey).catch((e) =>
        console.error("deleteObject cleanup failed:", e.message || e)
      );
    }
  }
  res.json({ ok: true });
}

async function updateAnswers(req, res) {
  try {
    const featureId = Number(req.params.id);
    const adminId = Number(req.admin?.id);
    if (!Number.isInteger(adminId) || adminId < 1) {
      return res.status(403).json({ error: "Admin context required" });
    }

    const answers = Array.isArray(req.body.answers) ? req.body.answers : [];
    const rows = answers
      .map((a) => ({
        questionId: Number(a.questionId),
        raw: a.value,
      }))
      .filter((a) => Number.isInteger(a.questionId) && a.questionId > 0);

    let normalized = [];
    if (rows.length) {
      const ids = [...new Set(rows.map((r) => r.questionId))];
      const questions = await prisma.scoringQuestion.findMany({
        where: { id: { in: ids }, isActive: true },
        select: { id: true, maxScore: true },
      });
      const maxById = new Map(questions.map((q) => [q.id, q.maxScore ?? 0]));

      for (const r of rows) {
        const maxScore = maxById.get(r.questionId);
        if (maxScore === undefined) {
          return res.status(400).json({
            error: `Unknown or inactive scoring question: ${r.questionId}`,
          });
        }
        const { raw } = r;
        if (raw === null || raw === undefined || raw === "") {
          return res.status(400).json({
            error: `Missing score value for question ${r.questionId}`,
          });
        }
        const num = Number(raw);
        if (!Number.isInteger(num) || num < 0 || num > maxScore) {
          return res.status(400).json({
            error: `Score for question ${r.questionId} must be an integer from 0 to ${maxScore}`,
          });
        }
        normalized.push({ questionId: r.questionId, value: num });
      }
    }

    let wasComplete = false;
    if (normalized.length) {
      wasComplete = await isAdminScoringComplete(prisma, {
        featureId,
        adminId,
      });
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

    if (normalized.length) {
      const nowComplete = await isAdminScoringComplete(prisma, {
        featureId,
        adminId,
      });
      if (!wasComplete && nowComplete) {
        const admins = await prisma.admin.findMany({
          where: { isActive: true },
          select: { id: true, email: true },
        });
        const emails = [];
        for (const a of admins) {
          if (!a.email) continue;
          const done = await isAdminScoringComplete(prisma, {
            featureId,
            adminId: a.id,
          });
          if (!done) emails.push(a.email);
        }
        const deduped = [...new Set(emails)];
        const completedByName =
          req.admin?.name || req.admin?.email || "Teammate";

        // Nudge only admins who still owe scores. If everyone else already
        // finished, this list is empty (e.g. you are the last finisher).
        if (deduped.length === 0) {
          console.info(
            "[scoring-nudge] skip: no incomplete recipients",
            JSON.stringify({
              featureId,
              code: feature.code,
              completedByAdminId: adminId,
              reason: "all_other_active_admins_already_completed",
            })
          );
        } else {
          console.info(
            "[scoring-nudge] sending",
            JSON.stringify({
              featureId,
              code: feature.code,
              completedByAdminId: adminId,
              recipientCount: deduped.length,
            })
          );
        }

        void sendScoringCompleteNudge(
          {
            id: feature.id,
            code: feature.code,
            title: feature.title,
          },
          completedByName,
          deduped
        ).catch((err) =>
          console.error("mailgun scoring nudge failed:", err.message || err)
        );
      }
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
