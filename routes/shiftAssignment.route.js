import express from "express";
import {
  assignShift,
  bulkAssignShift,
  getShiftAssignments,
  getAvailableForShift,
  removeShiftAssignment,
} from "../controllers/shiftAssignment.controller.js";

const router = express.Router();

// /available and /bulk must be declared BEFORE /:id to avoid route shadowing
router.get("/available", getAvailableForShift);
router.get("/", getShiftAssignments);
router.post("/bulk", bulkAssignShift);
router.post("/", assignShift);
router.delete("/:id", removeShiftAssignment);

export default router;
