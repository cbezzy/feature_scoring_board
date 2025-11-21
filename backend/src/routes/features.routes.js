const router = require("express").Router();
const { authRequired } = require("../middleware/auth");
const c = require("../controllers/features.controller");
const { PrismaClient } = require("@prisma/client"); // added
const prisma = new PrismaClient(); // added

router.use(authRequired);

router.get("/", c.listFeatures);
router.post("/", c.createFeature);
router.get("/:id", c.getFeature);
router.put("/:id", c.updateFeature);
router.put("/:id/scores", c.updateScores);
router.delete("/:id", c.deleteFeature);

// answers upsert route - moved DB work into route with proper prisma import and error handling
router.put("/:id/answers", async (req, res, next) => {
  try {
    const featureId = Number(req.params.id);
    const answers = Array.isArray(req.body.answers) ? req.body.answers : [];
    // [{ questionId, value }, ...]

    const upserts = answers.map(a =>
      prisma.featureScoreAnswer.upsert({
        where: {
          featureId_questionId: { featureId, questionId: a.questionId }
        },
        update: { value: a.value },
        create: { featureId, questionId: a.questionId, value: a.value }
      })
    );

    await prisma.$transaction(upserts);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
