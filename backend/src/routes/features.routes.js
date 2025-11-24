const router = require("express").Router();
const { authRequired } = require("../middleware/auth");
const c = require("../controllers/features.controller");

router.use(authRequired);

router.get("/", c.listFeatures);
router.post("/", c.createFeature);
router.get("/:id", c.getFeature);
router.put("/:id", c.updateFeature);
router.delete("/:id", c.deleteFeature);
router.put("/:id/answers", c.updateAnswers);

module.exports = router;
