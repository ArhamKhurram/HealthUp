// IPD routes: admissions, progress notes, prescriptions, and IPD test orders.
const router = require("express").Router();
const {
  listAdmissions,
  getAdmission,
  createAdmission,
  updateAdmission,
  deleteAdmission,
  listPrescriptions,
  getPrescription,
  createPrescription,
  updatePrescription,
  deletePrescription,
  listPrescriptionMedications,
  getPrescriptionMedication,
  createPrescriptionMedication,
  updatePrescriptionMedication,
  deletePrescriptionMedication,
  listVitalsByAdmission,
  createVitalForAdmission
} = require("../controllers/ipd.controller");
const { requireAuth, requireRole } = require("../middleware/auth");

router.use(requireAuth);
router.get("/admissions", requireRole("Admin", "Doctor", "Nurse", "Receptionist", "Patient"), listAdmissions);
router.get("/admissions/:id", requireRole("Admin", "Doctor", "Nurse", "Receptionist", "Patient"), getAdmission);
router.get("/admissions/:id/vitals", requireRole("Admin", "Doctor", "Nurse", "Receptionist", "Patient"), listVitalsByAdmission);
router.post("/admissions/:id/vitals", requireRole("Nurse"), createVitalForAdmission);
router.post("/admissions", requireRole("Admin", "Doctor", "Nurse", "Receptionist"), createAdmission);
router.put("/admissions/:id", requireRole("Admin", "Doctor", "Nurse", "Receptionist"), updateAdmission);
router.delete("/admissions/:id", requireRole("Admin"), deleteAdmission);
router.get("/prescriptions", requireRole("Admin", "Doctor", "Nurse"), listPrescriptions);
router.get("/prescriptions/:id", requireRole("Admin", "Doctor", "Nurse"), getPrescription);
router.post("/prescriptions", requireRole("Admin", "Doctor"), createPrescription);
router.put("/prescriptions/:id", requireRole("Admin", "Doctor"), updatePrescription);
router.delete("/prescriptions/:id", requireRole("Admin"), deletePrescription);
router.get("/prescription-medications", requireRole("Admin", "Doctor", "Nurse"), listPrescriptionMedications);
router.get("/prescription-medications/:id", requireRole("Admin", "Doctor", "Nurse"), getPrescriptionMedication);
router.post("/prescription-medications", requireRole("Admin", "Doctor"), createPrescriptionMedication);
router.put("/prescription-medications/:id", requireRole("Admin", "Doctor"), updatePrescriptionMedication);
router.delete("/prescription-medications/:id", requireRole("Admin"), deletePrescriptionMedication);

module.exports = router;
