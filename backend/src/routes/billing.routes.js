// Billing routes for OPD/IPD payments and line-item details.
const router = require("express").Router();
const {
  listOPDPayments,
  getOPDPayment,
  createOPDPayment,
  updateOPDPayment,
  deleteOPDPayment,
  listIPDPayments,
  getIPDPayment,
  createIPDPayment,
  updateIPDPayment,
  deleteIPDPayment
} = require("../controllers/billing.controller");
const { requireAuth, requireRole } = require("../middleware/auth");

router.use(requireAuth);
router.get("/opd-payments", requireRole("Admin", "Patient", "Receptionist"), listOPDPayments);
router.get("/opd-payments/:id", requireRole("Admin", "Patient", "Receptionist"), getOPDPayment);
router.post("/opd-payments", requireRole("Admin", "Receptionist"), createOPDPayment);
router.put("/opd-payments/:id", requireRole("Admin", "Receptionist"), updateOPDPayment);
router.delete("/opd-payments/:id", requireRole("Admin"), deleteOPDPayment);
router.get("/ipd-payments", requireRole("Admin", "Patient", "Receptionist"), listIPDPayments);
router.get("/ipd-payments/:id", requireRole("Admin", "Patient", "Receptionist"), getIPDPayment);
router.post("/ipd-payments", requireRole("Admin", "Receptionist"), createIPDPayment);
router.put("/ipd-payments/:id", requireRole("Admin", "Receptionist"), updateIPDPayment);
router.delete("/ipd-payments/:id", requireRole("Admin"), deleteIPDPayment);

module.exports = router;
