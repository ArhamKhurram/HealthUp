const router = require("express").Router();
const {
  listDepartments,
  createDepartment,
  updateDepartment,
  listNurses,
  createNurse,
  listWards,
  createWard,
  listBeds,
  createBed,
  updateBedStatus,
  listOpdRooms,
  createOpdRoom,
  listDutyRoster,
  createDutyRoster,
  listEquipment,
  createEquipment
} = require("../controllers/department.controller");
const { requireAuth, requireRole } = require("../middleware/auth");

router.use(requireAuth);
router.get("/", listDepartments);
router.post("/", requireRole("Admin"), createDepartment);
router.put("/:id", requireRole("Admin"), updateDepartment);
router.get("/nurses", requireRole("Admin", "Nurse"), listNurses);
router.post("/nurses", requireRole("Admin"), createNurse);
router.get("/wards", requireRole("Admin", "Nurse", "Doctor", "Receptionist"), listWards);
router.post("/wards", requireRole("Admin"), createWard);
router.get("/beds", requireRole("Admin", "Nurse", "Doctor", "Receptionist"), listBeds);
router.post("/beds", requireRole("Admin"), createBed);
router.put("/beds/:id/status", requireRole("Admin", "Nurse", "Receptionist"), updateBedStatus);
router.get("/opd-rooms", requireRole("Admin", "Doctor", "Nurse"), listOpdRooms);
router.post("/opd-rooms", requireRole("Admin"), createOpdRoom);
router.get("/duty-roster", requireRole("Admin", "Nurse"), listDutyRoster);
router.post("/duty-roster", requireRole("Admin"), createDutyRoster);
router.get("/equipment", requireRole("Admin", "Nurse"), listEquipment);
router.post("/equipment", requireRole("Admin"), createEquipment);

module.exports = router;
