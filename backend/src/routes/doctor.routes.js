// Doctor profile CRUD routes.
const router = require("express").Router();
const { listDoctors, getDoctor, createDoctor, updateDoctor, deleteDoctor } = require("../controllers/doctor.controller");
const { requireAuth, requireRole } = require("../middleware/auth");

router.use(requireAuth);
router.get("/", listDoctors);
router.get("/:id", getDoctor);
router.post("/", requireRole("Admin"), createDoctor);
router.put("/:id", requireRole("Admin"), updateDoctor);
router.delete("/:id", requireRole("Admin"), deleteDoctor);

module.exports = router;
