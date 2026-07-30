import express from "express";
import { getDashboardAnalytics, getWeeklyRevenue } from "../controllers/dashboard.controller.js";

const router = express.Router();

router.get("/analytics", async (req, res) => {
  try {
    const data = await getDashboardAnalytics();
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: "Error fetching dashboard analytics", error: error.message });
  }
});

// weekOffset: 0 = current week, 1 = last week, 2 = two weeks ago …
router.get("/weekly-revenue", async (req, res) => {
  try {
    const weekOffset = Number(req.query.weekOffset) || 0;
    const data = await getWeeklyRevenue(weekOffset);
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: "Error fetching weekly revenue", error: error.message });
  }
});

export default router;
