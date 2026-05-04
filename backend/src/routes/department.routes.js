const router = require("express").Router();
const {
  listDepartments,
  createDepartment,
  updateDepartment,
  listNurses,
  createNurse,
  listWards,
  createWard,
  updateWard,
  listBeds,
  createBed,
  updateBed,
  updateBedStatus,
  listOpdRooms,
  createOpdRoom,
  updateOpdRoom,
  updateOpdRoomStatus,
  listDutyRoster,
  createDutyRoster,
  listEquipment,
  createEquipment,
  updateEquipmentStatus
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
router.put("/wards/:id", requireRole("Admin"), updateWard);
router.get("/beds", requireRole("Admin", "Nurse", "Doctor", "Receptionist"), listBeds);
router.post("/beds", requireRole("Admin"), createBed);
router.put("/beds/:id", requireRole("Admin"), updateBed);
router.put("/beds/:id/status", requireRole("Admin", "Nurse", "Receptionist"), updateBedStatus);
router.get("/opd-rooms", requireRole("Admin", "Doctor", "Nurse"), listOpdRooms);
router.post("/opd-rooms", requireRole("Admin"), createOpdRoom);
router.put("/opd-rooms/:id", requireRole("Admin"), updateOpdRoom);
router.put("/opd-rooms/:id/status", requireRole("Admin"), updateOpdRoomStatus);
router.get("/duty-roster", requireRole("Admin", "Nurse"), listDutyRoster);
router.post("/duty-roster", requireRole("Admin"), createDutyRoster);
router.get("/equipment", requireRole("Admin", "Nurse"), listEquipment);
router.post("/equipment", requireRole("Admin"), createEquipment);
router.put("/equipment/:id/status", requireRole("Admin"), updateEquipmentStatus);

module.exports = router;
