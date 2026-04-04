import express from "express";
import {
  assignPOSMachine,
  getAllBusPOSMappings,
  updatePOSAssignment,
  deletePOSAssignment,
} from "../controllers/busPosMapping.controller.js";

const router = express.Router();

// @route   POST /api/bus-pos-mapping
// @desc    Create a new Bus-POS assignment
router.post("/", assignPOSMachine);

// @route   GET /api/bus-pos-mapping
// @desc    Get all Bus-POS assignments
router.get("/", getAllBusPOSMappings);

// @route   PUT /api/bus-pos-mapping/:id
// @desc    Update a Bus-POS assignment
router.put("/:id", updatePOSAssignment);

// @route   DELETE /api/bus-pos-mapping/:id
// @desc    Delete a Bus-POS assignment
router.delete("/:id", deletePOSAssignment);

export default router;
