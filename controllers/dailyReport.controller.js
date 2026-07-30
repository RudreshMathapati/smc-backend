import mongoose from "mongoose";
import ConductorBus from "../models/ConductorBus.model.js";
import BusRoute from "../models/busRouteMapping.model.js";
import BusBreakdown from "../models/busBreakdown.model.js";
import CashierCollection from "../models/cashierCollection.model.js";
import { getISTDayBounds } from "../utils/dateUtils.js";

// Helper function to parse time strings like "08:30 AM", "8:30 am", "14:15", "02:15 PM" into minutes from midnight
const parseTimeToMinutes = (timeStr) => {
  if (!timeStr) return null;
  const regex = /(\d+):(\d+)(?:\s*(AM|PM))?/i;
  const match = timeStr.match(regex);
  if (!match) return null;
  let hrs = parseInt(match[1]);
  const mins = parseInt(match[2]);
  const ampm = match[3];
  if (ampm) {
    if (ampm.toUpperCase() === "PM" && hrs < 12) hrs += 12;
    if (ampm.toUpperCase() === "AM" && hrs === 12) hrs = 0;
  }
  return hrs * 60 + mins;
};

// Helper to derive shift window ("Morning" vs "Evening") from breakdown startTime in IST
const getBreakdownShiftFromTime = (startTimeStr) => {
  if (!startTimeStr) return "Morning";
  const dt = new Date(startTimeStr);
  if (isNaN(dt.getTime())) return "Morning";
  const istMinutes = (dt.getUTCHours() * 60 + dt.getUTCMinutes() + 330) % (24 * 60);
  const istHours = istMinutes / 60;
  if (istHours >= 13 && istHours < 22) {
    return "Evening";
  }
  return "Morning";
};

// GET /api/daily-report?date=YYYY-MM-DD
export const getDailyReport = async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ message: "Date parameter is required" });
    }

    // 1. Fetch conductor assignments for the specific date
    const assignments = await ConductorBus.find({ assignedDate: date })
      .populate("conductorId", "name batch_no")
      .populate("driverId", "name batch_no");

    const db = mongoose.connection.db;

    // IST-aware date boundaries for the requested date
    const { start, end } = getISTDayBounds(date);

    // ─── BATCH PREFETCH (eliminates N+1 queries) ─────────────────────────────
    // Collect all busIds and batch_nos from assignments
    const busIds = [...new Set(assignments.map(a => a.busId?.toString()).filter(Boolean))];
    const batchNos = [...new Set(assignments.map(a => a.batch_no).filter(Boolean))];
    const conductorIds = [...new Set(assignments.map(a => a.conductorId?._id?.toString()).filter(Boolean))];

    // Fetch all BusRoute mappings for these buses in one query
    const busRoutes = await BusRoute.find({ bus: { $in: busIds } }).populate("route");
    const busRouteMap = {};
    busRoutes.forEach(br => { busRouteMap[br.bus.toString()] = br; });

    // Fetch all tickets for these conductors on this date in one query
    const allTickets = await db.collection("Ticket").find({
      batch_no: { $in: batchNos },
      dateTime: { $gte: start, $lte: end }
    }).toArray();
    const ticketsByBatch = {};
    allTickets.forEach(t => {
      if (!ticketsByBatch[t.batch_no]) ticketsByBatch[t.batch_no] = [];
      ticketsByBatch[t.batch_no].push(t);
    });

    // Fetch all bus breakdowns for this date in one query
    const allBreakdowns = await BusBreakdown.find({
      conductorId: { $in: conductorIds },
      breakdownDate: date
    });
    const breakdownsByKey = {};
    allBreakdowns.forEach(b => {
      // Key by conductorId only — the bus in the breakdown may differ
      // from the bus in the assignment (e.g., substitute bus), so busId is NOT used.
      const conductorKey = (b.conductorId?._id || b.conductorId).toString();
      if (!breakdownsByKey[conductorKey]) breakdownsByKey[conductorKey] = [];
      breakdownsByKey[conductorKey].push(b);
    });
    // ─────────────────────────────────────────────────────────────────────────

    const shiftGroups = {
      Morning: [],
      Evening: [],
      General: []
    };

    for (const assign of assignments) {
      if (!assign.conductorId || !assign.batch_no) continue;

      // Ensure no duplicate conductors in the same shift group
      const batchNo = assign.batch_no;
      const shiftName = assign.shift && shiftGroups[assign.shift] ? assign.shift : "Morning";
      const alreadyAdded = shiftGroups[shiftName].some(item => item.conductorBatchNo === batchNo);
      if (alreadyAdded) continue;

      // Use pre-fetched BusRoute data
      const busRoute = busRouteMap[assign.busId?.toString()] || null;
      const routeIdVal = busRoute?.route?.routeId || "N/A";
      const routeDistance = busRoute?.route?.distance || 0;
      const scheduledTrips = busRoute?.route?.trips || [];

      // Use pre-fetched tickets for this conductor, filtered by bus + shift
      const allConductorTickets = ticketsByBatch[batchNo] || [];
      const tickets = allConductorTickets.filter(t => {
        // Must match the bus assigned for this shift
        const isSameBus = !t.busNumber ||
          String(t.busNumber).trim().toLowerCase() === String(assign.assignedbusNumber).trim().toLowerCase();
        if (!isSameBus) return false;
        // If the ticket has a shift field, it must match this assignment's shift
        if (t.shift) {
          return String(t.shift).trim().toLowerCase() === String(assign.shift).trim().toLowerCase();
        }
        return true; // Backward compat: legacy tickets without shift field
      });

      let cashSales = 0;
      let onlineSales = 0;
      tickets.forEach(t => {
        if (t.paymentMode === "Cash") {
          cashSales += Number(t.price || 0);
        } else {
          onlineSales += Number(t.price || 0);
        }
      });
      const totalSales = cashSales + onlineSales;

      // 4. Calculate completed trips & total KM
      let completedTrips = 0;
      if (tickets.length > 0) {
        let tripsCount = 0;
        
        // Match tickets against scheduled trips
        scheduledTrips.forEach(sTrip => {
          const tripStartMin = parseTimeToMinutes(sTrip.sourceTime);
          const tripEndMin = parseTimeToMinutes(sTrip.destinationTime);
          
          if (tripStartMin !== null && tripEndMin !== null) {
            // Buffer: 15 minutes before and after scheduled trip times
            const startWindow = tripStartMin - 15;
            const endWindow = tripEndMin + 15;
            
            const hasTicketInTrip = tickets.some(t => {
              const ticketMin = parseTimeToMinutes(t.time);
              if (ticketMin === null) return false;
              return ticketMin >= startWindow && ticketMin <= endWindow;
            });
            
            if (hasTicketInTrip) {
              tripsCount++;
            }
          }
        });

        // Fallback: gap-based grouping (gap > 45 minutes) if schedule doesn't match
        if (tripsCount === 0) {
          const ticketMinutes = tickets
            .map(t => parseTimeToMinutes(t.time))
            .filter(m => m !== null)
            .sort((a, b) => a - b);

          if (ticketMinutes.length > 0) {
            tripsCount = 1;
            for (let i = 1; i < ticketMinutes.length; i++) {
              if (ticketMinutes[i] - ticketMinutes[i - 1] > 45) {
                tripsCount++;
              }
            }
          }
        }
        
        completedTrips = tripsCount;
      }

      const totalKm = routeDistance * completedTrips;

      // Filter breakdown data specifically for this conductor assignment's shift and bus
      const assignCondId = (assign.conductorId?._id || assign.conductorId).toString();
      const assignBusNo = String(assign.assignedbusNumber || "").trim().toLowerCase();
      const assignBusId = assign.busId?.toString();
      const condAssignmentsOnDate = assignments.filter(a =>
        (a.conductorId?._id || a.conductorId).toString() === assignCondId
      );

      const breakdowns = allBreakdowns.filter(b => {
        const bCondId = (b.conductorId?._id || b.conductorId || "").toString();
        const bBatch = String(b.batch_no || "").trim();
        const isSameConductor = (bCondId && bCondId === assignCondId) || (bBatch && bBatch === batchNo);
        if (!isSameConductor) return false;

        const bBusNo = String(b.busNumber || "").trim().toLowerCase();
        const bBusId = (b.busId?._id || b.busId || "").toString();

        if (bBusNo && assignBusNo && bBusNo === assignBusNo) return true;
        if (bBusId && assignBusId && bBusId === assignBusId) return true;
        if (b.shift && assign.shift && String(b.shift).trim().toLowerCase() === String(assign.shift).trim().toLowerCase()) return true;
        if (condAssignmentsOnDate.length === 1) return true;

        // Fallback: match by time window of the breakdown
        const derivedShift = getBreakdownShiftFromTime(b.startTime || b.createdAt);
        if (derivedShift && assign.shift && String(derivedShift).toLowerCase() === String(assign.shift).toLowerCase()) {
          return true;
        }

        return false;
      });

      let totalBreakdownMin = 0;
      breakdowns.forEach(b => {
        totalBreakdownMin += (b.durationMinutes || 0);
      });
      const breakdownHours = Number((totalBreakdownMin / 60).toFixed(2));
      const breakdownCount = breakdowns.length;

      const detailRow = {
        routeId: routeIdVal,
        busNumber: assign.assignedbusNumber,
        conductorName: assign.conductorId?.name || "N/A",
        conductorBatchNo: batchNo,
        driverName: assign.driverId?.name || "N/A",
        driverBatchNo: assign.driver_batch_no || assign.driverId?.batch_no || "N/A",
        cashSales,
        onlineSales,
        totalSales,
        completedTrips,
        routeDistance,
        totalKm,
        breakdownCount,
        breakdownHours,
        shift: assign.shift || "Morning"
      };

      // Add to corresponding shift group
      shiftGroups[shiftName].push(detailRow);
    }

    // 6. Calculate subtotals for each shift and grand totals
    const result = {
      date,
      shifts: {}
    };

    let grandTotalKm = 0;
    let grandTotalSales = 0;
    let grandTotalBreakdownHours = 0;
    let grandConductorsCount = 0;

    Object.keys(shiftGroups).forEach(shift => {
      const rows = shiftGroups[shift];
      let shiftTotalKm = 0;
      let shiftTotalSales = 0;
      let shiftTotalBreakdownHours = 0;

      rows.forEach(r => {
        shiftTotalKm += r.totalKm;
        shiftTotalSales += r.totalSales;
        shiftTotalBreakdownHours += r.breakdownHours;
      });

      result.shifts[shift] = {
        conductors: rows,
        subtotals: {
          totalKm: shiftTotalKm,
          totalSales: shiftTotalSales,
          breakdownHours: Number(shiftTotalBreakdownHours.toFixed(2)),
          count: rows.length
        }
      };

      grandTotalKm += shiftTotalKm;
      grandTotalSales += shiftTotalSales;
      grandTotalBreakdownHours += shiftTotalBreakdownHours;
      grandConductorsCount += rows.length;
    });

    result.grandTotals = {
      totalKm: grandTotalKm,
      totalSales: grandTotalSales,
      breakdownHours: Number(grandTotalBreakdownHours.toFixed(2)),
      totalConductors: grandConductorsCount
    };

    res.status(200).json(result);
  } catch (err) {
    console.error("Daily report query error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PERIOD REPORTS HELPER & CONTROLLERS
// ─────────────────────────────────────────────────────────────────────────────

// Helper function to generate report data for a range of dates
export const generatePeriodReportData = async (startDateStr, endDateStr) => {
  const db = mongoose.connection.db;

  const startDay = new Date(startDateStr);
  const endDay = new Date(endDateStr);
  
  const datesList = [];
  let currentDay = new Date(startDay);
  while (currentDay <= endDay) {
    datesList.push(currentDay.toISOString().split("T")[0]);
    currentDay.setDate(currentDay.getDate() + 1);
  }

  // Fetch all assignments that could possibly be relevant:
  // assignedDate in range
  const assignments = await ConductorBus.find({
    assignedDate: { $gte: startDateStr, $lte: endDateStr }
  })
    .populate("conductorId", "name batch_no")
    .populate("driverId", "name batch_no");

  const allBatchNos = [...new Set(assignments.map(a => a.batch_no).filter(Boolean))];
  const allConductorIds = [...new Set(assignments.map(a => a.conductorId?._id).filter(Boolean))];

  // Fetch all tickets for these conductors in the date range
  const startRange = new Date(startDateStr);
  startRange.setHours(0, 0, 0, 0);
  const endRange = new Date(endDateStr);
  endRange.setHours(23, 59, 59, 999);

  const tickets = await db.collection("Ticket").find({
    batch_no: { $in: allBatchNos },
    dateTime: { $gte: startRange, $lte: endRange }
  }).toArray();

  // Fetch all breakdowns in the date range
  const breakdowns = await BusBreakdown.find({
    conductorId: { $in: allConductorIds },
    breakdownDate: { $gte: startDateStr, $lte: endDateStr }
  });

  // Fetch all cashier collections in the range
  const collections = await CashierCollection.find({
    batch_no: { $in: allBatchNos },
    collectionDate: { $gte: startDateStr, $lte: endDateStr }
  });

  // Load BusRoute mapping for route info & distance
  const busRouteMappings = await BusRoute.find({}).populate("route");
  const busRouteMap = new Map();
  busRouteMappings.forEach(br => {
    if (br.bus) {
      busRouteMap.set(br.bus.toString(), br);
    }
  });

  // Helper arrays/maps for aggregation
  const conductorAgg = {};
  const driverAgg = {};
  const routeAgg = {};
  const dailyBreakdown = {};

  // Initialize daily breakdown structure
  datesList.forEach(d => {
    dailyBreakdown[d] = {
      date: d,
      totalSales: 0,
      cashSales: 0,
      onlineSales: 0,
      totalKm: 0,
      breakdownHours: 0,
      activeConductors: 0,
      ticketsCount: 0
    };
  });

  // Process day-by-day to guarantee absolute parity with daily report logic
  for (const d of datesList) {
    const dayStart = new Date(d);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(d);
    dayEnd.setHours(23, 59, 59, 999);

    // Active assignments on this specific day
    const dayAssignments = assignments.filter(assign => 
      assign.assignedDate === d
    );

    const addedBatches = new Set();

    for (const assign of dayAssignments) {
      if (!assign.conductorId || !assign.batch_no) continue;

      const batchNo = assign.batch_no;
      const uniqueKey = `${batchNo}_${assign.shift}`;
      // Prevent duplicates in the same shift on the same day
      if (addedBatches.has(uniqueKey)) continue;
      addedBatches.add(uniqueKey);

      // Guard: skip orphaned assignments that have no busId — they cannot be
      // mapped to a route, so including them would produce misleading zeros.
      if (!assign.busId) continue;

      // Route and distance
      const busRoute = busRouteMap.get(assign.busId.toString());
      const routeIdVal = busRoute?.route?.routeId || "N/A";
      const routeDistance = busRoute?.route?.distance || 0;
      const scheduledTrips = busRoute?.route?.trips || [];

      // Filter tickets for this conductor on this specific day, matched by bus + shift
      const dayConductorTickets = tickets.filter(t => {
        if (t.batch_no !== batchNo) return false;
        if (t.dateTime < dayStart || t.dateTime > dayEnd) return false;
        // Must match the bus assigned for this shift
        const isSameBus = !t.busNumber ||
          String(t.busNumber).trim().toLowerCase() === String(assign.assignedbusNumber).trim().toLowerCase();
        if (!isSameBus) return false;
        // If ticket has a shift field, it must match this assignment's shift
        if (t.shift) {
          return String(t.shift).trim().toLowerCase() === String(assign.shift).trim().toLowerCase();
        }
        return true; // Backward compat: legacy tickets without shift
      });

      let cashSales = 0;
      let onlineSales = 0;
      dayConductorTickets.forEach(t => {
        if (t.paymentMode === "Cash") {
          cashSales += (t.price || 0);
        } else {
          onlineSales += (t.price || 0);
        }
      });
      const totalSales = cashSales + onlineSales;

      // Completed trips calculations (identical to daily report)
      let completedTrips = 0;
      if (dayConductorTickets.length > 0) {
        let tripsCount = 0;
        
        scheduledTrips.forEach(sTrip => {
          const tripStartMin = parseTimeToMinutes(sTrip.sourceTime);
          const tripEndMin = parseTimeToMinutes(sTrip.destinationTime);
          
          if (tripStartMin !== null && tripEndMin !== null) {
            const startWindow = tripStartMin - 15;
            const endWindow = tripEndMin + 15;
            
            const hasTicketInTrip = dayConductorTickets.some(t => {
              const ticketMin = parseTimeToMinutes(t.time);
              if (ticketMin === null) return false;
              return ticketMin >= startWindow && ticketMin <= endWindow;
            });
            
            if (hasTicketInTrip) {
              tripsCount++;
            }
          }
        });

        // Fallback gap grouping
        if (tripsCount === 0) {
          const ticketMinutes = dayConductorTickets
            .map(t => parseTimeToMinutes(t.time))
            .filter(m => m !== null)
            .sort((a, b) => a - b);

          if (ticketMinutes.length > 0) {
            tripsCount = 1;
            for (let i = 1; i < ticketMinutes.length; i++) {
              if (ticketMinutes[i] - ticketMinutes[i - 1] > 45) {
                tripsCount++;
              }
            }
          }
        }
        
        completedTrips = tripsCount;
      }

      const totalKm = routeDistance * completedTrips;

      // Filter breakdowns for this conductor on this specific day and shift/bus
      const periodAssignCondId = (assign.conductorId?._id || assign.conductorId).toString();
      const periodAssignBusNo = String(assign.assignedbusNumber || "").trim().toLowerCase();
      const periodAssignBusId = assign.busId?.toString();
      const dayAssignmentsForCond = dayAssignments.filter(a =>
        (a.conductorId?._id || a.conductorId).toString() === periodAssignCondId
      );

      const dayBreakdowns = breakdowns.filter(b => {
        if (b.breakdownDate !== d) return false;
        const bCondId = (b.conductorId?._id || b.conductorId || "").toString();
        const bBatch = String(b.batch_no || "").trim();
        const isSameConductor = (bCondId && bCondId === periodAssignCondId) || (bBatch && bBatch === batchNo);
        if (!isSameConductor) return false;

        const bBusNo = String(b.busNumber || "").trim().toLowerCase();
        const bBusId = (b.busId?._id || b.busId || "").toString();

        if (bBusNo && periodAssignBusNo && bBusNo === periodAssignBusNo) return true;
        if (bBusId && periodAssignBusId && bBusId === periodAssignBusId) return true;
        if (b.shift && assign.shift && String(b.shift).trim().toLowerCase() === String(assign.shift).trim().toLowerCase()) return true;
        if (dayAssignmentsForCond.length === 1) return true;

        // Fallback: match by time window of the breakdown
        const derivedShift = getBreakdownShiftFromTime(b.startTime || b.createdAt);
        if (derivedShift && assign.shift && String(derivedShift).toLowerCase() === String(assign.shift).toLowerCase()) {
          return true;
        }

        return false;
      });

      let totalBreakdownMin = 0;
      dayBreakdowns.forEach(b => {
        totalBreakdownMin += (b.durationMinutes || 0);
      });
      const breakdownHours = Number((totalBreakdownMin / 60).toFixed(2));
      const breakdownCount = dayBreakdowns.length;

      // Cashier collections for this conductor on this specific day
      const dayCollections = collections.filter(c => 
        c.batch_no === batchNo &&
        c.collectionDate === d
      );
      const collectedAmount = dayCollections.reduce((sum, col) => sum + col.collectedAmount, 0);

      // NOTE: Do NOT compute per-day remaining balance here.
      // Cross-day payments (e.g. paying yesterday's debt on today's shift) would
      // cause per-day sum to be wrong. We accumulate cashSales and totalCollected
      // across the whole period and derive the true remaining at the end.

      // Conductor Aggregation
      if (!conductorAgg[batchNo]) {
        conductorAgg[batchNo] = {
          conductorName: assign.conductorId.name,
          conductorBatchNo: batchNo,
          daysWorked: 0,
          totalTickets: 0,
          cashSales: 0,
          onlineSales: 0,
          totalSales: 0,
          totalKm: 0,
          breakdownCount: 0,
          breakdownHours: 0,
          totalCollected: 0
          // remainingBalance is NOT stored here; computed once at final formatting
        };
      }
      const cObj = conductorAgg[batchNo];
      cObj.daysWorked += 1;
      cObj.totalTickets += dayConductorTickets.length;
      cObj.cashSales += cashSales;
      cObj.onlineSales += onlineSales;
      cObj.totalSales += totalSales;
      cObj.totalKm += totalKm;
      cObj.breakdownCount += breakdownCount;
      cObj.breakdownHours += breakdownHours;
      cObj.totalCollected += collectedAmount;

      // Driver Aggregation
      if (assign.driverId) {
        const dBatch = assign.driver_batch_no || assign.driverId.batch_no || "N/A";
        if (!driverAgg[dBatch]) {
          driverAgg[dBatch] = {
            driverName: assign.driverId.name,
            driverBatchNo: dBatch,
            daysWorked: 0,
            totalKm: 0,
            breakdownCount: 0
          };
        }
        const dObj = driverAgg[dBatch];
        dObj.daysWorked += 1;
        dObj.totalKm += totalKm;
        dObj.breakdownCount += breakdownCount;
      }

      // Route Aggregation
      if (routeIdVal !== "N/A") {
        if (!routeAgg[routeIdVal]) {
          routeAgg[routeIdVal] = {
            routeId: routeIdVal,
            source: busRoute?.route?.source || "",
            destination: busRoute?.route?.destination || "",
            totalKm: 0,
            totalSales: 0,
            completedTrips: 0
          };
        }
        const rObj = routeAgg[routeIdVal];
        rObj.totalKm += totalKm;
        rObj.totalSales += totalSales;
        rObj.completedTrips += completedTrips;
      }

      // Daily Breakdown Aggregation
      const dayData = dailyBreakdown[d];
      dayData.totalSales += totalSales;
      dayData.cashSales += cashSales;
      dayData.onlineSales += onlineSales;
      dayData.totalKm += totalKm;
      dayData.breakdownHours += breakdownHours;
      dayData.activeConductors += 1;
      dayData.ticketsCount += dayConductorTickets.length;
    }
  }

  // Final formatting
  // remainingBalance is computed here as true cumulative: cashSales - totalCollected.
  // Using Math.max(0, ...) guards against over-collection data-entry errors.
  const conductorsList = Object.values(conductorAgg).map(c => ({
    ...c,
    breakdownHours: Number(c.breakdownHours.toFixed(2)),
    remainingBalance: Math.max(0, c.cashSales - c.totalCollected),
    averageEPKM: c.totalKm > 0 ? Number((c.totalSales / c.totalKm).toFixed(2)) : 0
  }));

  const driversList = Object.values(driverAgg);

  const routesList = Object.values(routeAgg).map(r => ({
    ...r,
    epkm: r.totalKm > 0 ? Number((r.totalSales / r.totalKm).toFixed(2)) : 0
  }));

  const dailyBreakdownList = Object.values(dailyBreakdown).map(day => ({
    ...day,
    breakdownHours: Number(day.breakdownHours.toFixed(2)),
    epkm: day.totalKm > 0 ? Number((day.totalSales / day.totalKm).toFixed(2)) : 0
  }));

  // Grand totals
  let grandTotalSales = 0;
  let grandCashSales = 0;
  let grandOnlineSales = 0;
  let grandTotalKm = 0;
  let grandBreakdownHours = 0;
  let grandBreakdownCount = 0;
  let grandTickets = 0;
  let grandCollected = 0;
  let grandRemaining = 0;

  conductorsList.forEach(c => {
    grandTotalSales += c.totalSales;
    grandCashSales += c.cashSales;
    grandOnlineSales += c.onlineSales;
    grandTotalKm += c.totalKm;
    grandBreakdownHours += c.breakdownHours;
    grandBreakdownCount += c.breakdownCount;
    grandTickets += c.totalTickets;
    grandCollected += c.totalCollected;
    grandRemaining += c.remainingBalance;
  });

  const grandTotals = {
    totalSales: grandTotalSales,
    cashSales: grandCashSales,
    onlineSales: grandOnlineSales,
    totalKm: grandTotalKm,
    breakdownCount: grandBreakdownCount,
    breakdownHours: Number(grandBreakdownHours.toFixed(2)),
    totalTickets: grandTickets,
    totalCollected: grandCollected,
    remainingBalance: grandRemaining,
    averageEPKM: grandTotalKm > 0 ? Number((grandTotalSales / grandTotalKm).toFixed(2)) : 0
  };

  return {
    startDate: startDateStr,
    endDate: endDateStr,
    daysCount: datesList.length,
    grandTotals,
    conductors: conductorsList,
    drivers: driversList,
    routes: routesList,
    dailyBreakdown: dailyBreakdownList
  };
};

// GET /api/daily-report/range?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
export const getRangeReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ message: "startDate and endDate parameters are required" });
    }

    const data = await generatePeriodReportData(startDate, endDate);
    res.status(200).json(data);
  } catch (err) {
    console.error("Range report error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// GET /api/daily-report/weekly?startDate=YYYY-MM-DD
export const getWeeklyReport = async (req, res) => {
  try {
    const { startDate } = req.query;
    if (!startDate) {
      return res.status(400).json({ message: "startDate parameter is required" });
    }

    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(start.getDate() + 6); // 7-day range including startDate

    const endDateStr = end.toISOString().split("T")[0];
    const data = await generatePeriodReportData(startDate, endDateStr);
    res.status(200).json(data);
  } catch (err) {
    console.error("Weekly report error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// GET /api/daily-report/monthly?year=YYYY&month=MM
export const getMonthlyReport = async (req, res) => {
  try {
    const { year, month } = req.query;
    if (!year || !month) {
      return res.status(400).json({ message: "year and month parameters are required" });
    }

    const yrNum = parseInt(year);
    const moNum = parseInt(month) - 1; // JS month is 0-indexed

    const start = new Date(Date.UTC(yrNum, moNum, 1));
    const end = new Date(Date.UTC(yrNum, moNum + 1, 0)); // last day of month

    const startDateStr = start.toISOString().split("T")[0];
    const endDateStr = end.toISOString().split("T")[0];

    const data = await generatePeriodReportData(startDateStr, endDateStr);
    res.status(200).json(data);
  } catch (err) {
    console.error("Monthly report error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
