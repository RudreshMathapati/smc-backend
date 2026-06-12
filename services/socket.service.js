// services/socket.service.js
import { getDashboardAnalytics } from "../controllers/dashboard.controller.js";

export const startDashboardEmitter = (io) => {
  setInterval(async () => {
    try {
      const analytics = await getDashboardAnalytics();

      console.log("📡 Sending dashboard data:", analytics);

      io.emit("dashboard:update", analytics);
    } catch (err) {
      console.log("❌ Dashboard Error:", err.message);
      io.emit("dashboard:error", { message: "Failed to fetch real-time dashboard data" });
    }
  }, 10000);
};
