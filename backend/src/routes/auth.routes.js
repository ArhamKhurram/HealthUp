const router = require("express").Router();
const { login, registerPatient, me } = require("../controllers/auth.controller");
const { requireAuth } = require("../middleware/auth");

router.post("/login", login);
router.post("/register/patient", registerPatient);
router.get("/me", requireAuth, me);

module.exports = router;
