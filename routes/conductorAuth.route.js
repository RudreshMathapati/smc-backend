import express from "express";
import {
  conductorLogin,
  getConductorProfile,
} from "../controllers/conductorAuth.controller.js";
import { conductorProtect } from "../middleware/conductorAuth.middleware.js";

const router = express.Router();

// POST /api/conductor-auth/login
// Conductor logs in with batch_no + password — returns JWT token
router.post("/login", conductorLogin);

// GET /api/conductor-auth/me
// Returns conductor profile + active bus-POS assignment (requires token)
router.get("/me", conductorProtect, getConductorProfile);

export default router;
