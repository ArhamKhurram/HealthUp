const router = require("express").Router();
const {
  listPatients,
  getPatient,
  createPatient,
  updatePatient,
  deletePatient
} = require("../controllers/patient.controller");
const { requireAuth, requireRole } = require("../middleware/auth");

router.use(requireAuth);
router.get("/", requireRole("Admin", "Doctor", "Nurse"), listPatients);
router.get("/:id", requireRole("Admin", "Doctor", "Nurse", "Patient"), getPatient);
router.post("/", requireRole("Admin"), createPatient);
router.put("/:id", requireRole("Admin"), updatePatient);
router.delete("/:id", requireRole("Admin"), deletePatient);

module.exports = router;
