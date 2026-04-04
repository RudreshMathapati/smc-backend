import express from "express";
import {
  getProfile,
  getAllUsers,
  deleteUser, // ✅ Added
  updateUserProfile
} from "../controllers/user.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/", getAllUsers);
router.get("/profile", protect, getProfile);
router.put("/profile", protect, updateUserProfile);
router.delete("/:id", protect, deleteUser); // ✅ Added

export default router;
