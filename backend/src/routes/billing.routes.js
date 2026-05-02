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
router.get("/opd-payments", requireRole("Admin", "Patient"), listOPDPayments);
router.get("/opd-payments/:id", requireRole("Admin", "Patient"), getOPDPayment);
router.post("/opd-payments", requireRole("Admin"), createOPDPayment);
router.put("/opd-payments/:id", requireRole("Admin"), updateOPDPayment);
router.delete("/opd-payments/:id", requireRole("Admin"), deleteOPDPayment);
router.get("/ipd-payments", requireRole("Admin", "Patient"), listIPDPayments);
router.get("/ipd-payments/:id", requireRole("Admin", "Patient"), getIPDPayment);
router.post("/ipd-payments", requireRole("Admin"), createIPDPayment);
router.put("/ipd-payments/:id", requireRole("Admin"), updateIPDPayment);
router.delete("/ipd-payments/:id", requireRole("Admin"), deleteIPDPayment);

module.exports = router;
