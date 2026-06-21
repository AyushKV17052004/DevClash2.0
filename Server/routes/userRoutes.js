import express from "express";
import { getProfile, putProfile } from "../controllers/userProfileController.js";
import { verifyToken } from "../controllers/authController.js";

const router = express.Router();

router.get("/profile", verifyToken, getProfile);
router.put("/profile", verifyToken, putProfile);

export default router;
