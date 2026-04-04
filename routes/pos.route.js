import express from "express";
import {
  getAllPosMachines,
  createPosMachine,
  updatePosMachine,
  deletePosMachine,
} from "../controllers/posMachine.controller.js";

const router = express.Router();

// Route to get all POS machines
router.get("/", getAllPosMachines);

// Route to create a new POS machine
router.post("/", createPosMachine);

// Route to update a POS machine by ID
router.put("/:id", updatePosMachine);

// Route to delete a POS machine by ID
router.delete("/:id", deletePosMachine);

export default router;
