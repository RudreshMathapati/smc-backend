import GPS from "../models/gps.model.js";
import Bus from "../models/bus.model.js";
import Route from "../models/route.model.js";
import PosMachineModel from "../models/posMachine.model.js";
import User from "../models/user.model.js";

export const getDashboardAnalytics = async () => {
  try {
    const buses = await Bus.find();

    // 🔥 BYPASS MONGOOSE (IMPORTANT)
    const gps = await GPS.collection
      .find({ speed: { $exists: true } })
      .sort({ timestamp: -1 })
      .toArray();

    const totalBuses = buses.length;

    // ================= LOGIC =================

    const latestGPSMap = new Map();

    gps.forEach((g) => {
      if (!latestGPSMap.has(g.deviceId)) {
        latestGPSMap.set(g.deviceId, g);
      }
    });

    let runningBuses = 0;
    let idleBuses = 0;

    latestGPSMap.forEach((g) => {
      const speed = Number(g.speed) || 0;

      console.log("Device:", g.deviceId, "Speed:", speed);

      if (speed > 5) {
        runningBuses++;
      } else {
        idleBuses++;
      }
    });

    const breakdownBuses = buses.filter(
      (b) => b.status === "Under Maintenance",
    ).length;

    const routesCount = await Route.countDocuments();
    const posDevicesCount = await PosMachineModel.countDocuments();
    const usersCount = await User.countDocuments();

    return {
      fleet: {
        totalBuses,
        runningBuses,
        idleBuses,
        breakdownBuses,
        tripsRunningNow: 10,
        tripsCompletedToday: 25,
      },
      revenue: {
        collectionToday: 25000,
        collectionThisWeek: 98000,
        collectionThisMonth: 320000,
        ticketRevenue: 27000,
        passRevenue: 50000,
      },
      stats: {
        buses: totalBuses,
        routes: routesCount,
        posDevices: posDevicesCount,
        users: usersCount,
      },
    };
  } catch (error) {
    console.log("❌ Dashboard Error:", error.message);
    throw error;
  }
};
