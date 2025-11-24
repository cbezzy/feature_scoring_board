const router = require("express").Router();
const { authRequired } = require("../middleware/auth");
const controller = require("../controllers/modules.controller");

router.use(authRequired);

router.get("/", controller.listModules);
router.post("/", controller.createModule);
router.put("/:id", controller.updateModule);
router.delete("/:id", controller.deleteModule);

module.exports = router;

