import express from "express";
import mongoose from "mongoose";
import ConductorBus from "../models/ConductorBus.model.js";
import BusRoute from "../models/busRouteMapping.model.js";
import Route from "../models/route.model.js";
import Conductor from "../models/conductors.model.js";
import Driver from "../models/drivers.model.js";
import CashierCollection from "../models/cashierCollection.model.js";


const router = express.Router();

// GET Conductors who worked on a specific date
router.get("/conductors-by-date", async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ message: "date query parameter required" });
    }

    // 1. Find all ConductorBus assignments for this date
    const assignments = await ConductorBus.find({ assignedDate: date })
      .populate("conductorId", "name batch_no")
      .populate("driverId", "name batch_no");

    // Map of batch_no -> info
    const conductorsMap = {};

    assignments.forEach((cb) => {
      const batch = cb.batch_no;
      if (!batch) return;
      if (!conductorsMap[batch]) {
        conductorsMap[batch] = {
          batch_no: batch,
          name: cb.conductorId?.name || `Conductor ${batch}`,
          shiftCount: 0,
          buses: [],
          shifts: [],
        };
      }
      conductorsMap[batch].shiftCount += 1;
      if (cb.assignedbusNumber && !conductorsMap[batch].buses.includes(cb.assignedbusNumber)) {
        conductorsMap[batch].buses.push(cb.assignedbusNumber);
      }
      if (cb.shift && !conductorsMap[batch].shifts.includes(cb.shift)) {
        conductorsMap[batch].shifts.push(cb.shift);
      }
    });

    // 2. Also check Ticket collection for any conductors who issued tickets on this date
    const db = mongoose.connection.db;
    const selectedDate = new Date(date);
    const start = new Date(selectedDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(selectedDate);
    end.setHours(23, 59, 59, 999);

    const ticketBatches = await db
      .collection("Ticket")
      .distinct("batch_no", { dateTime: { $gte: start, $lte: end } });

    for (const batch of ticketBatches) {
      if (!batch) continue;
      if (!conductorsMap[batch]) {
        const conductorDoc = await Conductor.findOne({ batch_no: batch });
        conductorsMap[batch] = {
          batch_no: batch,
          name: conductorDoc?.name || `Conductor ${batch}`,
          shiftCount: 1,
          buses: [],
          shifts: [],
        };
      }
    }

    const result = Object.values(conductorsMap).sort((a, b) =>
      a.batch_no.localeCompare(b.batch_no)
    );

    res.json(result);
  } catch (err) {
    console.error("Error fetching conductors by date:", err);
    res.status(500).json({ message: "Server error fetching conductors by date" });
  }
});

// Helper function to process ticket list into standard summary metrics
function processTickets(tickets) {
  let cash = 0;
  let online = 0;
  let cashLuggage = 0;
  let cashPassenger = 0;
  let onlineLuggage = 0;
  let onlinePassenger = 0;

  let full = 0;
  let half = 0;
  let pass = 0;
  let passBreakdown = {};
  let stopData = {};

  tickets.forEach((t) => {
    const ticketPrice = Number(t.price || 0);
    const tLuggageCount = Number(t.luggageCount || 0);
    const tLuggageUnitAmount = Number(t.luggageAmount || 0);
    const tLuggageTotal = tLuggageCount * tLuggageUnitAmount;
    const tPassengerTotal = Math.max(0, ticketPrice - tLuggageTotal);

    if (t.paymentMode === "Cash") {
      cash += ticketPrice;
      cashLuggage += tLuggageTotal;
      cashPassenger += tPassengerTotal;
    } else {
      online += ticketPrice;
      onlineLuggage += tLuggageTotal;
      onlinePassenger += tPassengerTotal;
    }

    const adult = Number(t.adultCount || 0);
    full += adult;

    const child = Number(t.childCount || 0);
    half += child;

    let passCountInTicket = 0;
    if (t.passCounts && typeof t.passCounts === "object") {
      Object.entries(t.passCounts).forEach(([passName, count]) => {
        const cnt = Number(count || 0);
        if (cnt > 0) {
          passCountInTicket += cnt;
          passBreakdown[passName] = (passBreakdown[passName] || 0) + cnt;
        }
      });
    }
    pass += passCountInTicket;

    const passengerCount = adult + child + passCountInTicket;

    if (passengerCount > 0) {
      if (t.boardingStop) {
        if (!stopData[t.boardingStop]) {
          stopData[t.boardingStop] = { boarding: 0, dropping: 0 };
        }
        stopData[t.boardingStop].boarding += passengerCount;
      }
      if (t.destinationStop) {
        if (!stopData[t.destinationStop]) {
          stopData[t.destinationStop] = { boarding: 0, dropping: 0 };
        }
        stopData[t.destinationStop].dropping += passengerCount;
      }
    }
  });

  const totalTickets = full + half + pass;
  const stops = Object.keys(stopData).map((stop) => ({
    stop,
    boarding: stopData[stop].boarding,
    dropping: stopData[stop].dropping,
  }));

  return {
    summary: {
      totalTickets,
      cash,
      cashLuggage,
      cashPassenger,
      online,
      onlineLuggage,
      onlinePassenger,
      total: cash + online,
      totalLuggage: cashLuggage + onlineLuggage,
      totalPassenger: cashPassenger + onlinePassenger,
    },
    ticketTypes: {
      full,
      half,
      pass,
    },
    passBreakdown,
    stops,
  };
}

// GET Conductor Daily Report (Supports multi-shift & multi-bus)
router.get("/conductor", async (req, res) => {
  try {
    const { batch_no, date } = req.query;

    if (!batch_no || !date) {
      return res.status(400).json({ message: "batch_no and date required" });
    }

    // 1. Get ALL Bus assignments for conductor on the specific date
    const conductorBuses = await ConductorBus.find({ batch_no, assignedDate: date })
      .populate("conductorId", "name batch_no")
      .populate("driverId", "name batch_no");

    let conductorName = "N/A";
    if (conductorBuses.length > 0 && conductorBuses[0].conductorId?.name) {
      conductorName = conductorBuses[0].conductorId.name;
    } else {
      const condDoc = await Conductor.findOne({ batch_no });
      if (condDoc) conductorName = condDoc.name;
    }

    // 2. Get All Tickets for the selected date
    const db = mongoose.connection.db;
    const selectedDate = new Date(date);
    const start = new Date(selectedDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(selectedDate);
    end.setHours(23, 59, 59, 999);

    const allTickets = await db
      .collection("Ticket")
      .find({
        batch_no: batch_no,
        dateTime: { $gte: start, $lte: end },
      })
      .toArray();

    // 3. Process Overall Day Metrics across ALL tickets for the day
    const overallMetrics = processTickets(allTickets);

    // 4. Build Shift-Wise Breakdowns
    const shiftsList = [];
    let totalPersonalAmount = 0;

    if (conductorBuses.length > 0) {
      for (const cb of conductorBuses) {
        totalPersonalAmount += Number(cb.personalAmount || 0);

        const busNumber = cb.assignedbusNumber;
        const busId = cb.busId;
        const driverName = cb.driverId?.name || "N/A";
        const driverBatchNo = cb.driver_batch_no || cb.driverId?.batch_no || "N/A";

        // Route lookup for this bus
        let busRoute = await BusRoute.findOne({ bus: busId, isDeleted: { $ne: true } }).populate("route");
        if (!busRoute) {
          busRoute = await BusRoute.findOne({ bus: busId }).populate("route");
        }

        let routeName = "";
        let routeDistance = null;
        let routeIdVal = "";
        if (busRoute && busRoute.route) {
          routeName = `${busRoute.route.source} → ${busRoute.route.destination}`;
          routeDistance = busRoute.route.distance || null;
          routeIdVal = busRoute.route.routeId || "";
        }

        // Filter tickets specific to this shift/bus
        const shiftTickets = allTickets.filter((t) => {
          if (t.shift) {
            return (
              String(t.shift).trim().toLowerCase() === String(cb.shift).trim().toLowerCase()
            );
          }
          if (t.busNumber) {
            return (
              String(t.busNumber).trim().toLowerCase() === String(busNumber).trim().toLowerCase()
            );
          }
          return true;
        });

        const shiftMetrics = processTickets(shiftTickets);

        shiftsList.push({
          shift: cb.shift || "General",
          busNumber,
          driverName,
          driverBatchNo,
          route: routeName || "Default Route",
          routeId: routeIdVal,
          routeDistance,
          personalAmount: cb.personalAmount || 0,
          summary: shiftMetrics.summary,
          ticketTypes: shiftMetrics.ticketTypes,
          passBreakdown: shiftMetrics.passBreakdown,
          stops: shiftMetrics.stops,
        });
      }
    } else {
      // Fallback if no ConductorBus record exists but tickets were issued
      shiftsList.push({
        shift: "General",
        busNumber: allTickets[0]?.busNumber || "N/A",
        driverName: "N/A",
        driverBatchNo: "N/A",
        route: "—",
        routeId: "",
        routeDistance: null,
        personalAmount: 0,
        summary: overallMetrics.summary,
        ticketTypes: overallMetrics.ticketTypes,
        passBreakdown: overallMetrics.passBreakdown,
        stops: overallMetrics.stops,
      });
    }

    // 5. Cashier collections — cumulative balance calculation
    const allCashTickets = await db
      .collection("Ticket")
      .find({ batch_no, paymentMode: "Cash" })
      .toArray();
    const totalCumulativeSales = allCashTickets.reduce(
      (sum, t) => sum + Number(t.price || 0),
      0
    );

    const allCollections = await CashierCollection.find({ batch_no });
    const totalCumulativeCollected = allCollections.reduce(
      (sum, c) => sum + Number(c.collectedAmount || 0),
      0
    );

    const collectionsOnDate = await CashierCollection.find({
      batch_no,
      collectionDate: date,
    });
    const collectedOnDate = collectionsOnDate.reduce(
      (sum, c) => sum + Number(c.collectedAmount || 0),
      0
    );

    const overallRemainingBalance = totalCumulativeSales - totalCumulativeCollected;
    const todaysRemainingBalance = Math.max(
      0,
      Math.min(overallMetrics.summary.cash, overallRemainingBalance)
    );

    const cashSummary = {
      personalAmount: totalPersonalAmount,
      cashSalesOnDate: overallMetrics.summary.cash,
      collectedOnDate,
      todaysRemainingBalance,
      totalCumulativeSales,
      totalCumulativeCollected,
      overallRemainingBalance,
      cashLuggage: overallMetrics.summary.cashLuggage,
      cashPassenger: overallMetrics.summary.cashPassenger,
    };

    // Primary summary properties for legacy top-level compatibility
    const primaryShift = shiftsList[0] || {};

    res.json({
      conductor: batch_no,
      conductorName,
      date,
      totalShifts: shiftsList.length,
      overall: {
        summary: overallMetrics.summary,
        ticketTypes: overallMetrics.ticketTypes,
        passBreakdown: overallMetrics.passBreakdown,
        stops: overallMetrics.stops,
      },
      cashSummary,
      shifts: shiftsList,

      // Top-level legacy fields for backwards compatibility
      driverName: primaryShift.driverName || "N/A",
      driverBatchNo: primaryShift.driverBatchNo || "N/A",
      busNumber: shiftsList.map((s) => s.busNumber).join(", "),
      route: shiftsList.map((s) => s.route).filter((r) => r && r !== "—").join(" | ") || "—",
      routeId: primaryShift.routeId || "",
      routeDistance: primaryShift.routeDistance || null,
      shift: shiftsList.map((s) => s.shift).join(", "),
      summary: overallMetrics.summary,
      ticketTypes: overallMetrics.ticketTypes,
      passBreakdown: overallMetrics.passBreakdown,
      stops: overallMetrics.stops,
    });
  } catch (err) {
    console.error("Error generating conductor daily report:", err);
    res.status(500).json({ message: "Server error generating report" });
  }
});

export default router;

