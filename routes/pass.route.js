import express from "express";
import {
  createPass,
  getPasses,
  getPassById,
  updatePass,
  deletePass,
} from "../controllers/pass.controller.js";

const router = express.Router();

router.post("/", createPass);
router.get("/", getPasses);
router.get("/:id", getPassById);
router.put("/:id", updatePass);
router.delete("/:id", deletePass);

export default router;
