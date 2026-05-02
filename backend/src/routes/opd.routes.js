const router = require("express").Router();
const {
  listAppointments,
  getAppointment,
  createAppointment,
  updateAppointment,
  deleteAppointment,
  listPrescriptions,
  getPrescription,
  createPrescription,
  updatePrescription,
  deletePrescription,
  listPrescriptionMedications,
  getPrescriptionMedication,
  createPrescriptionMedication,
  updatePrescriptionMedication,
  deletePrescriptionMedication
} = require("../controllers/opd.controller");
const { requireAuth, requireRole } = require("../middleware/auth");

router.use(requireAuth);
router.get("/appointments", requireRole("Admin", "Doctor", "Nurse", "Patient"), listAppointments);
router.get("/appointments/:id", requireRole("Admin", "Doctor", "Nurse", "Patient"), getAppointment);
router.post("/appointments", requireRole("Admin", "Patient"), createAppointment);
router.put("/appointments/:id", requireRole("Admin", "Doctor", "Nurse"), updateAppointment);
router.delete("/appointments/:id", requireRole("Admin"), deleteAppointment);
router.get("/prescriptions", requireRole("Admin", "Doctor", "Nurse", "Patient"), listPrescriptions);
router.get("/prescriptions/:id", requireRole("Admin", "Doctor", "Nurse", "Patient"), getPrescription);
router.post("/prescriptions", requireRole("Admin", "Doctor"), createPrescription);
router.put("/prescriptions/:id", requireRole("Admin", "Doctor"), updatePrescription);
router.delete("/prescriptions/:id", requireRole("Admin"), deletePrescription);
router.get("/prescription-medications", requireRole("Admin", "Doctor", "Nurse", "Patient"), listPrescriptionMedications);
router.get("/prescription-medications/:id", requireRole("Admin", "Doctor", "Nurse", "Patient"), getPrescriptionMedication);
router.post("/prescription-medications", requireRole("Admin", "Doctor"), createPrescriptionMedication);
router.put("/prescription-medications/:id", requireRole("Admin", "Doctor"), updatePrescriptionMedication);
router.delete("/prescription-medications/:id", requireRole("Admin"), deletePrescriptionMedication);

module.exports = router;
