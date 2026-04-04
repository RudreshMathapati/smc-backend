import express from "express";
import {
  registerConductor,
  loginConductor,
  getConductors,
  getConductorById,
  updateConductor,
  deleteConductor,
} from "../controllers/conductors.controller.js";

const router = express.Router();

// Routes
router.post("/register", registerConductor); // expects {name, batch_no, password, type}
router.post("/login", loginConductor);
router.get("/", getConductors);
router.get("/:id", getConductorById);
router.put("/:id", updateConductor); // expects {name, type, password?}
router.delete("/:id", deleteConductor);

export default router;
