import express from "express";
import { getDashboardAnalytics } from "../controllers/dashboard.controller.js";

const router = express.Router();

router.get("/analytics", async (req, res) => {
  try {
    const data = await getDashboardAnalytics();
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: "Error fetching dashboard analytics", error: error.message });
  }
});

export default router;
