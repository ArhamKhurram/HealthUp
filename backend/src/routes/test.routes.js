const router = require("express").Router();
const {
  listMedicalTests,
  getMedicalTest,
  createMedicalTest,
  updateMedicalTest,
  deleteMedicalTest,
  listOPDTestOrders,
  getOPDTestOrder,
  createOPDTestOrder,
  updateOPDTestOrder,
  deleteOPDTestOrder,
  listIPDTestOrders,
  getIPDTestOrder,
  createIPDTestOrder,
  updateIPDTestOrder,
  deleteIPDTestOrder
} = require("../controllers/test.controller");
const { requireAuth, requireRole } = require("../middleware/auth");

router.use(requireAuth);
router.get("/orders/opd", requireRole("Admin", "Doctor", "Nurse", "Patient"), listOPDTestOrders);
router.get("/orders/opd/:id", requireRole("Admin", "Doctor", "Nurse", "Patient"), getOPDTestOrder);
router.post("/orders/opd", requireRole("Admin", "Doctor"), createOPDTestOrder);
router.put("/orders/opd/:id", requireRole("Admin", "Doctor"), updateOPDTestOrder);
router.delete("/orders/opd/:id", requireRole("Admin"), deleteOPDTestOrder);
router.get("/orders/ipd", requireRole("Admin", "Doctor", "Nurse", "Patient"), listIPDTestOrders);
router.get("/orders/ipd/:id", requireRole("Admin", "Doctor", "Nurse", "Patient"), getIPDTestOrder);
router.post("/orders/ipd", requireRole("Admin", "Doctor"), createIPDTestOrder);
router.put("/orders/ipd/:id", requireRole("Admin", "Doctor"), updateIPDTestOrder);
router.delete("/orders/ipd/:id", requireRole("Admin"), deleteIPDTestOrder);
router.get("/", listMedicalTests);
router.get("/:id", getMedicalTest);
router.post("/", requireRole("Admin"), createMedicalTest);
router.put("/:id", requireRole("Admin"), updateMedicalTest);
router.delete("/:id", requireRole("Admin"), deleteMedicalTest);

module.exports = router;
