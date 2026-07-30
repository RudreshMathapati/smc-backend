import express from "express";
import {
  getDailyReport,
  getRangeReport,
  getWeeklyReport,
  getMonthlyReport,
} from "../controllers/dailyReport.controller.js";

const router = express.Router();

// Specific routes first
router.get("/range", getRangeReport);
router.get("/weekly", getWeeklyReport);
router.get("/monthly", getMonthlyReport);

// Default daily report route
router.get("/", getDailyReport);

export default router;
