const router = require("express").Router();
const multer = require("multer");
const { authRequired } = require("../middleware/auth");
const c = require("../controllers/features.controller");
const att = require("../controllers/attachments.controller");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
});

router.use(authRequired);

router.get("/", c.listFeatures);
router.post("/", c.createFeature);
router.post("/:id/attachments", upload.single("file"), att.uploadAttachment);
router.delete("/:id/attachments/:attachmentId", att.deleteAttachment);
router.get("/:id", c.getFeature);
router.put("/:id", c.updateFeature);
router.delete("/:id", c.deleteFeature);
router.put("/:id/answers", c.updateAnswers);

module.exports = router;
