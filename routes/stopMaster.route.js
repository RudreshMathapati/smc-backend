import express from "express";
import {
  createStop,
  getAllStops,
  updateStop,
  deleteStop,
} from "../controllers/stopMaster.controller.js";

const router = express.Router();

router.post("/", createStop);
router.get("/", getAllStops);
router.put("/:id", updateStop);
router.delete("/:id", deleteStop);

export default router;
