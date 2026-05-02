const router = require("express").Router();
const { listDepartments } = require("../controllers/department.controller");
const { requireAuth } = require("../middleware/auth");

router.use(requireAuth);
router.get("/", listDepartments);

module.exports = router;

