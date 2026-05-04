// Department routes kept in demo-core: departments and nurse directory only.
const router = require("express").Router();
const {
  listDepartments,
  createDepartment,
  updateDepartment,
  listNurses,
  createNurse
} = require("../controllers/department.controller");
const { requireAuth, requireRole } = require("../middleware/auth");

router.use(requireAuth);
router.get("/", listDepartments);
router.post("/", requireRole("Admin"), createDepartment);
router.put("/:id", requireRole("Admin"), updateDepartment);
router.get("/nurses", requireRole("Admin", "Nurse"), listNurses);
router.post("/nurses", requireRole("Admin"), createNurse);

module.exports = router;
