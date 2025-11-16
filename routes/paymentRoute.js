import { Router } from "express";
import { createPayment, verifyPayment } from "../controllers/paymentController.js";
import { protect } from "../middleware/auth.js";

const router = Router();

router.post("/create", protect, createPayment);
router.post("/verify", protect, verifyPayment);

export default router;
