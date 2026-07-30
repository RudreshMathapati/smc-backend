import mongoose from "mongoose";
import GPS from "../models/gps.model.js";
import Bus from "../models/bus.model.js";
import Route from "../models/route.model.js";
import PosMachineModel from "../models/posMachine.model.js";
import User from "../models/user.model.js";
import BusBreakdown from "../models/busBreakdown.model.js";
import ConductorBus from "../models/ConductorBus.model.js";
import ShiftAssignment from "../models/shiftAssignment.model.js";
import PosIssue from "../models/posIssue.model.js";
import BusRoute from "../models/busRouteMapping.model.js";
import { getISTDayBounds } from "../utils/dateUtils.js";

// ── Returns 7 days of daily revenue for a given week offset ──────────────────
// weekOffset = 0 → current 7 days (today back 6 days)
// weekOffset = 1 → 7 days ending 7 days ago, etc.
// Uses MongoDB $group aggregation — only 7 numbers come over the wire, not raw docs.
export const getWeeklyRevenue = async (weekOffset = 0) => {
  const db = mongoose.connection.db;
  const offset = Math.max(0, Math.min(Number(weekOffset) || 0, 52));

  const nowIST = new Date(new Date().getTime() + 5.5 * 60 * 60 * 1000);

  // Anchor: last day of the requested 7-day window (in IST)
  const endIST = new Date(nowIST);
  endIST.setUTCDate(endIST.getUTCDate() - offset * 7);

  // Build the ordered list of 7 IST date strings + their display labels
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(endIST);
    d.setUTCDate(d.getUTCDate() - i);
    const ds = [
      d.getUTCFullYear(),
      String(d.getUTCMonth() + 1).padStart(2, "0"),
      String(d.getUTCDate()).padStart(2, "0"),
    ].join("-");
    const label = d.toLocaleDateString("en-IN", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
    days.push({ ds, label, total: 0 });
  }

  // Query range bounds
  const { start: rangeStart } = getISTDayBounds(days[0].ds);
  const { end: rangeEnd }     = getISTDayBounds(days[days.length - 1].ds);

  // ── Aggregation: sum price per IST calendar day ──────────────────
  // $dateAdd shifts UTC → IST so $dateToString produces the correct IST date
  const agg = await db.collection("Ticket").aggregate([
    { $match: { dateTime: { $gte: rangeStart, $lte: rangeEnd } } },
    {
      $group: {
        _id: {
          $dateToString: {
            format: "%Y-%m-%d",
            date: {
              $dateAdd: {
                startDate: "$dateTime",
                unit: "minute",
                amount: 330, // +5h30m = IST
              },
            },
          },
        },
        total: { $sum: { $toDouble: "$price" } },
      },
    },
  ]).toArray();

  // Merge aggregation results into the ordered days array
  const aggMap = {};
  agg.forEach((r) => { aggMap[r._id] = r.total; });
  days.forEach((d) => { d.total = aggMap[d.ds] || 0; });

  return {
    weekOffset: offset,
    periodLabel: `${days[0].label} – ${days[6].label}`,
    dailyVolume: days,
  };
};

export const getDashboardAnalytics = async () => {
  try {
    const buses = await Bus.find();

    // 🔥 BYPASS MONGOOSE (IMPORTANT)
    const gps = await GPS.collection
      .find({ speed: { $exists: true } })
      .sort({ timestamp: -1 })
      .toArray();

    const totalBuses = buses.length;

    // ================= FLEET LOGIC =================

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
      if (speed > 5) runningBuses++;
      else idleBuses++;
    });

    const breakdownBuses = buses.filter(
      (b) => b.status === "Under Maintenance"
    ).length;

    // Fetch active breakdowns & emergency accidents
    const openBreakdowns = await BusBreakdown.countDocuments({ status: "Open" });
    const openAccidents = await BusBreakdown.countDocuments({
      status: "Open",
      $or: [{ isEmergency: true }, { breakdownType: "Accident / Collision" }],
    });

    // ================= TRIPS LOGIC =================

    // Today's IST date string
    const todayIST = (() => {
      const now = new Date();
      const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
      return ist.toISOString().split("T")[0];
    })();

    const tripsRunningNow = await ConductorBus.countDocuments({
      assignedDate: todayIST,
      isActive: true,
    });

    const tripsCompletedToday = await ConductorBus.countDocuments({
      assignedDate: todayIST,
    });

    // ================= DATE BOUNDS =================

    const db = mongoose.connection.db;
    const nowIST = new Date(new Date().getTime() + 5.5 * 60 * 60 * 1000);

    // Today
    const { start: dayStart, end: dayEnd } = getISTDayBounds(todayIST);

    // Week (last 7 days, IST-aligned)
    const weekStartIST = new Date(nowIST);
    weekStartIST.setUTCDate(weekStartIST.getUTCDate() - 6);
    const weekStartStr = [
      weekStartIST.getUTCFullYear(),
      String(weekStartIST.getUTCMonth() + 1).padStart(2, "0"),
      String(weekStartIST.getUTCDate()).padStart(2, "0"),
    ].join("-");
    const { start: weekStart } = getISTDayBounds(weekStartStr);

    // Month (1st of current month, IST)
    const monthStartStr = `${nowIST.getUTCFullYear()}-${String(nowIST.getUTCMonth() + 1).padStart(2, "0")}-01`;
    const { start: monthStart } = getISTDayBounds(monthStartStr);

    // ================= TICKET QUERIES =================

    // Today
    const todayTickets = await db.collection("Ticket").find({
      dateTime: { $gte: dayStart, $lte: dayEnd },
    }).toArray();
    const collectionToday = todayTickets.reduce((s, t) => s + Number(t.price || 0), 0);

    // This week (also used for 7-day volume)
    const weekTickets = await db.collection("Ticket").find({
      dateTime: { $gte: weekStart, $lte: dayEnd },
    }).toArray();
    const collectionThisWeek = weekTickets.reduce((s, t) => s + Number(t.price || 0), 0);

    // This month
    const monthTickets = await db.collection("Ticket").find({
      dateTime: { $gte: monthStart, $lte: dayEnd },
    }).toArray();
    const collectionThisMonth = monthTickets.reduce((s, t) => s + Number(t.price || 0), 0);

    // Today's ticket revenue split
    const ticketRevenue = todayTickets
      .filter((t) => t.paymentMode !== "Pass")
      .reduce((s, t) => s + Number(t.price || 0), 0);
    const passRevenue = todayTickets
      .filter((t) => t.paymentMode === "Pass")
      .reduce((s, t) => s + Number(t.price || 0), 0);

    // ================= PAYMENT MODE SPLIT (this month) =================

    const ONLINE_MODES = ["UPI", "Online", "Card", "Wallet", "QR", "Net Banking"];
    const cashAmount = monthTickets
      .filter((t) => t.paymentMode === "Cash")
      .reduce((s, t) => s + Number(t.price || 0), 0);
    const passAmount = monthTickets
      .filter((t) => t.paymentMode === "Pass")
      .reduce((s, t) => s + Number(t.price || 0), 0);
    const onlineAmount = monthTickets
      .filter((t) => ONLINE_MODES.includes(t.paymentMode))
      .reduce((s, t) => s + Number(t.price || 0), 0);

    // ================= PASS COUNT BREAKDOWN (this month) =================

    const PASS_TYPES = ["Student Pass", "Citizen Pass", "Company Pass"];
    const passCountBreakdown = {};
    PASS_TYPES.forEach((p) => (passCountBreakdown[p] = 0));

    monthTickets.forEach((t) => {
      if (t.passCounts && typeof t.passCounts === "object") {
        Object.entries(t.passCounts).forEach(([passName, count]) => {
          const cnt = Number(count || 0);
          if (cnt > 0 && Object.prototype.hasOwnProperty.call(passCountBreakdown, passName)) {
            passCountBreakdown[passName] += cnt;
          }
        });
      }
    });

    const totalPassRiders = Object.values(passCountBreakdown).reduce((s, v) => s + v, 0);

    // ================= 7-DAY DAILY VOLUME =================
    // Build a map of the last 7 days in IST, then bucket weekTickets into them

    const dailyVolumeMap = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(nowIST);
      d.setUTCDate(d.getUTCDate() - i);
      const ds = [
        d.getUTCFullYear(),
        String(d.getUTCMonth() + 1).padStart(2, "0"),
        String(d.getUTCDate()).padStart(2, "0"),
      ].join("-");
      // Short label: "25 Jul"
      const label = d.toLocaleDateString("en-IN", {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      });
      dailyVolumeMap[ds] = { date: ds, label, total: 0 };
    }

    weekTickets.forEach((t) => {
      if (!t.dateTime) return;
      const tIST = new Date(new Date(t.dateTime).getTime() + 5.5 * 60 * 60 * 1000);
      const ds = [
        tIST.getUTCFullYear(),
        String(tIST.getUTCMonth() + 1).padStart(2, "0"),
        String(tIST.getUTCDate()).padStart(2, "0"),
      ].join("-");
      if (dailyVolumeMap[ds]) {
        dailyVolumeMap[ds].total += Number(t.price || 0);
      }
    });

    const dailyVolume = Object.values(dailyVolumeMap);

    // ================= QUICK STATS =================
    // Use raw db queries to avoid Mongoose collection-name caching issues
    // (Conductor collection is "Conductor" with capital C; Drivers is "Drivers")

    const [activeConductors, activeDrivers, openPosIssues, activeRoutes] =
      await Promise.all([
        db.collection("Conductor").countDocuments({ isDeleted: false }),
        db.collection("Drivers").countDocuments({ isDeleted: false }),
        PosIssue.countDocuments({ status: { $ne: "Resolved" } }),
        BusRoute.countDocuments({ status: "Active", isDeleted: false }),
      ]);

    // Conductors on duty today = those who drove a bus today (ConductorBus)
    const conductorsOnDutyList = await ConductorBus.distinct("batch_no", {
      assignedDate: todayIST,
    });
    const conductorsOnDuty = conductorsOnDutyList.length;

    // Unassigned = active conductors who have NO shift assignment at all
    const assignedBatchNos = await ShiftAssignment.distinct("batch_no", {
      personType: "Conductor",
      isDeleted: false,
    });
    const unassignedConductors = Math.max(0, activeConductors - assignedBatchNos.length);

    // ================= SHIFT SPLIT =================
    // Read from ShiftAssignment (standing shift) — NOT ConductorBus (daily trip log)

    const [morningShift, eveningShift, generalShift] = await Promise.all([
      ShiftAssignment.countDocuments({ personType: "Conductor", shift: "Morning", isDeleted: false }),
      ShiftAssignment.countDocuments({ personType: "Conductor", shift: "Evening", isDeleted: false }),
      ShiftAssignment.countDocuments({ personType: "Conductor", shift: "General", isDeleted: false }),
    ]);

    // ================= RECENT BREAKDOWNS (last 5 open) =================

    const recentBreakdowns = await BusBreakdown.find({ status: "Open" })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    // ================= RECENT POS ISSUES (last 5 unresolved) =================

    const recentPosIssues = await PosIssue.find({ status: { $ne: "Resolved" } })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    // ================= STATS =================

    const routesCount = await Route.countDocuments();
    const posDevicesCount = await PosMachineModel.countDocuments();
    const usersCount = await User.countDocuments();

    // ================= PAST PENDING CASH COLLECTIONS (strictly before today) =================
    const [yearNum, monthNum, dayNum] = todayIST.split("-").map(Number);
    const todayStartUTC = new Date(Date.UTC(yearNum, monthNum - 1, dayNum, 0, 0, 0, 0) - 5.5 * 60 * 60 * 1000);

    const activeConductorsList = await db
      .collection("Conductor")
      .find({ isDeleted: false })
      .project({ batch_no: 1, name: 1 })
      .toArray();

    const [pastSalesAgg, pastColsAgg] = await Promise.all([
      db.collection("Ticket").aggregate([
        {
          $match: {
            paymentMode: "Cash",
            dateTime: { $lt: todayStartUTC },
          },
        },
        {
          $group: {
            _id: "$batch_no",
            totalSales: { $sum: { $toDouble: "$price" } },
          },
        },
      ]).toArray(),

      db.collection("cashier_collections").aggregate([
        {
          $match: {
            collectionDate: { $lt: todayIST },
          },
        },
        {
          $group: {
            _id: "$batch_no",
            totalCollected: { $sum: "$collectedAmount" },
          },
        },
      ]).toArray(),
    ]);

    const salesMap = {};
    pastSalesAgg.forEach((r) => { salesMap[r._id] = r.totalSales; });

    const colsMap = {};
    pastColsAgg.forEach((r) => { colsMap[r._id] = r.totalCollected; });

    let pastPendingAmount = 0;
    let pastPendingConductorsCount = 0;

    activeConductorsList.forEach((c) => {
      const sales = salesMap[c.batch_no] || 0;
      const collected = colsMap[c.batch_no] || 0;
      const pending = Math.max(0, sales - collected);
      if (pending > 0) {
        pastPendingAmount += pending;
        pastPendingConductorsCount++;
      }
    });

    return {
      fleet: {
        totalBuses,
        runningBuses,
        idleBuses,
        breakdownBuses,
        openBreakdowns,
        openAccidents,
        tripsRunningNow,
        tripsCompletedToday,
      },
      revenue: {
        collectionToday,
        collectionThisWeek,
        collectionThisMonth,
        ticketRevenue,
        passRevenue,
        paymentSplit: { cash: cashAmount, online: onlineAmount, pass: passAmount },
        passCountBreakdown,
        totalPassRiders,
        pastPendingAmount,
        pastPendingConductorsCount,
      },
      stats: {
        buses: totalBuses,
        routes: routesCount,
        posDevices: posDevicesCount,
        users: usersCount,
        activeConductors,
        activeDrivers,
        conductorsOnDuty,
        openPosIssues,
        activeRoutes,
      },
      shifts: {
        morning: morningShift,
        evening: eveningShift,
        general: generalShift,
        unassigned: unassignedConductors,
      },
      dailyVolume,
      recentBreakdowns,
      recentPosIssues,
    };
  } catch (error) {
    console.log("❌ Dashboard Error:", error.message);
    throw error;
  }
};
