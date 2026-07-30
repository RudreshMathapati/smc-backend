import express from "express";
import {
  reportBreakdown,
  resolveBreakdown,
  getMyBreakdowns,
  getBreakdownsForDate,
  getAllBreakdowns,
  updateBreakdownStatus,
} from "../controllers/busBreakdown.controller.js";
import { conductorProtect } from "../middleware/conductorAuth.middleware.js";

const router = express.Router();

// POST /api/bus-breakdowns/report - Conductor reports a bus breakdown
router.post("/report", conductorProtect, reportBreakdown);

// PATCH /api/bus-breakdowns/:id/resolve - Conductor marks breakdown as resolved
router.patch("/:id/resolve", conductorProtect, resolveBreakdown);

// GET /api/bus-breakdowns/my - Conductor fetches their own breakdown history
router.get("/my", conductorProtect, getMyBreakdowns);

// GET /api/bus-breakdowns/date?date=YYYY-MM-DD - Admin: get breakdowns for a date
router.get("/date", getBreakdownsForDate);

// GET /api/bus-breakdowns/all - Admin: all breakdowns with optional filters
router.get("/all", getAllBreakdowns);

// PATCH /api/bus-breakdowns/:id/status - Admin: update status + adminNote
router.patch("/:id/status", updateBreakdownStatus);

export default router;
