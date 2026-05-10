import { getDashboardAnalytics } from "../controllers/dashboard.controller.js";

export const startDashboardEmitter = (io) => {
  setInterval(async () => {
    try {
      const analytics = await getDashboardAnalytics();

      console.log("📡 Sending dashboard data:", analytics);

      io.emit("dashboard:update", analytics);
    } catch (err) {
      console.log("❌ Dashboard Error:", err.message);
    }
  }, 10000);
};
