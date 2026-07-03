import express from "express";
import {
  raiseIssue,
  getMyIssues,
  getAllIssues,
  updateIssueStatus,
} from "../controllers/posIssue.controller.js";
import { conductorProtect } from "../middleware/conductorAuth.middleware.js";

const router = express.Router();

// ────────────────────────────────────────────────────────────
// CONDUCTOR ROUTES (requires conductor JWT token)
// ────────────────────────────────────────────────────────────

// POST /api/pos-issues/raise
// Conductor submits a new POS issue (bus + POS auto-resolved)
router.post("/raise", conductorProtect, raiseIssue);

// GET /api/pos-issues/my
// Conductor fetches their own issues
router.get("/my", conductorProtect, getMyIssues);

// ────────────────────────────────────────────────────────────
// ADMIN ROUTES (no auth guard added — admin uses existing session)
// These are read by the admin dashboard which is already protected
// ────────────────────────────────────────────────────────────

// GET /api/pos-issues/all
// Admin: get all issues with optional query filters
router.get("/all", getAllIssues);

// PATCH /api/pos-issues/:id/status
// Admin: update issue status + optional note
router.patch("/:id/status", updateIssueStatus);

export default router;
