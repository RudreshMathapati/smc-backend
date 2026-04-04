import express from "express";
import {
  saveGpsData,
  getLatestGpsByDevice,
  getGpsHistoryByDevice,
  getAllGpsData,
} from "../controllers/gps.controller.js";

const router = express.Router();

router.post("/", saveGpsData); // Save GPS data
router.get("/", getAllGpsData); // Get all GPS data
router.get("/:deviceId", getLatestGpsByDevice); // Get latest location
router.get("/history/:deviceId", getGpsHistoryByDevice); // Get history

export default router;
