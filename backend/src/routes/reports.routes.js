const router = require("express").Router();
const {
  patientDirectory,
  opdAppointmentsView,
  billingSummary,
  doctorRating
} = require("../controllers/reports.controller");
const { requireAuth, requireRole } = require("../middleware/auth");

router.use(requireAuth);
router.get("/patients", requireRole("Admin", "Doctor", "Nurse"), patientDirectory);
router.get("/opd-appointments", requireRole("Admin", "Doctor", "Nurse"), opdAppointmentsView);
router.get("/billing", requireRole("Admin"), billingSummary);
router.get("/doctor-rating/:doctorId", requireRole("Admin", "Doctor", "Nurse"), doctorRating);

module.exports = router;

