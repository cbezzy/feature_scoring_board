const router = require("express").Router();
const { authRequired } = require("../middleware/auth");
const {
  listAdmins,
  createAdmin,
  updateAdmin
} = require("../controllers/admins.controller");

// internal-only admin management
router.get("/", authRequired, listAdmins);
router.post("/", authRequired, createAdmin);
router.put("/:id", authRequired, updateAdmin);

module.exports = router;
