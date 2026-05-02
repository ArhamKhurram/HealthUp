const router = require("express").Router();
const { listUsers, getUser, createUser, updateUser, deleteUser } = require("../controllers/user.controller");
const { requireAuth, requireRole } = require("../middleware/auth");

router.use(requireAuth);
router.get("/", requireRole("Admin"), listUsers);
router.get("/:id", requireRole("Admin"), getUser);
router.post("/", requireRole("Admin"), createUser);
router.put("/:id", requireRole("Admin"), updateUser);
router.delete("/:id", requireRole("Admin"), deleteUser);

module.exports = router;
