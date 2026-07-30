import express from "express";
import {
  assignShift,
  bulkAssignShift,
  getShiftAssignments,
  getAvailableForShift,
  removeShiftAssignment,
  resetShift,
} from "../controllers/shiftAssignment.controller.js";

const router = express.Router();

// /available, /bulk, and /reset/:shift must be declared BEFORE /:id to avoid route shadowing
router.get("/available", getAvailableForShift);
router.get("/", getShiftAssignments);
router.post("/bulk", bulkAssignShift);
router.post("/", assignShift);
router.delete("/reset/:shift", resetShift);   // archive + clear whole shift
router.delete("/:id", removeShiftAssignment); // direct delete, no history

export default router;
