const router = require("express").Router();
const { authRequired } = require("../middleware/auth");
const { PrismaClient } = require("@prisma/client"); // added
const prisma = new PrismaClient(); // added

router.get("/", authRequired, async (req, res) => {
  const questions = await prisma.scoringQuestion.findMany({
    where: { isActive: true },
    orderBy: [{ group: "asc" }, { sortOrder: "asc" }, { id: "asc" }],
  });
  res.json(questions);
});

router.post("/", authRequired, async (req, res) => {
  const q = await prisma.scoringQuestion.create({ data: req.body });
  res.json(q);
});

router.put("/:id", authRequired, async (req, res) => {
  const q = await prisma.scoringQuestion.update({
    where: { id: Number(req.params.id) },
    data: req.body,
  });
  res.json(q);
});

router.delete("/:id", authRequired, async (req, res) => {
  await prisma.scoringQuestion.update({
    where: { id: Number(req.params.id) },
    data: { isActive: false },
  });
  res.json({ ok: true });
});

module.exports = router;
