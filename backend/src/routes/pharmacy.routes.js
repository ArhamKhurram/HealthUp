// Pharmacy routes: medications and inventory.
const router = require("express").Router();
const {
  listMedications,
  getMedication,
  createMedication,
  updateMedication,
  deleteMedication
} = require("../controllers/pharmacy.controller");
const { requireAuth, requireRole } = require("../middleware/auth");

router.use(requireAuth);
router.get("/medications", requireRole("Admin", "Doctor", "Nurse"), listMedications);
router.get("/medications/:id", requireRole("Admin", "Doctor", "Nurse"), getMedication);
router.post("/medications", requireRole("Admin"), createMedication);
router.put("/medications/:id", requireRole("Admin"), updateMedication);
router.delete("/medications/:id", requireRole("Admin"), deleteMedication);

module.exports = router;
