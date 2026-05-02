const router = require("express").Router();
const { listReviews, getReview, createReview, updateReview, deleteReview } = require("../controllers/review.controller");
const { requireAuth, requireRole } = require("../middleware/auth");

router.use(requireAuth);
router.get("/", listReviews);
router.get("/:id", getReview);
router.post("/", requireRole("Admin", "Patient"), createReview);
router.put("/:id", requireRole("Admin", "Patient"), updateReview);
router.delete("/:id", requireRole("Admin"), deleteReview);

module.exports = router;
