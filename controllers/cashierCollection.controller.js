import mongoose from "mongoose";
import CashierCollection from "../models/cashierCollection.model.js";
import ConductorBus from "../models/ConductorBus.model.js";
import Conductor from "../models/conductors.model.js";
import Driver from "../models/drivers.model.js";
import BusRoute from "../models/busRouteMapping.model.js";
import { getISTDayBounds } from "../utils/dateUtils.js";


// ─────────────────────────────────────────────────────────────────
// GET /api/cashier-collections/summary?batch_no=X&date=YYYY-MM-DD
//
// Returns a full cashier dashboard view for a conductor on a date:
//  - Conductor & driver info
//  - Cash ticket sales for that date (from Ticket collection)
//  - Personal amount set for that assignment
//  - All cashier collection transactions recorded on that date
//  - Cumulative outstanding balance (total sales - total collected)
// ─────────────────────────────────────────────────────────────────
export const getCashierSummary = async (req, res) => {
  try {
    const { batch_no } = req.query;

    if (!batch_no) {
      return res.status(400).json({ message: "batch_no is required" });
    }

    // Always use today's date (server-side IST)
    const today = new Date().toISOString().split("T")[0]; // "YYYY-MM-DD"

    // 1. Find the conductor-bus assignment for today only
    const assignment = await ConductorBus.findOne({ batch_no, assignedDate: today })
      .populate("conductorId", "name batch_no")
      .populate("driverId", "name batch_no");

    if (!assignment) {
      return res.status(404).json({ message: "No bus assignment found for this conductor today" });
    }

    // 2. Get cash ticket sales for today
    const db = mongoose.connection.db;
    const selectedDate = new Date(today);
    const start = new Date(selectedDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(selectedDate);
    end.setHours(23, 59, 59, 999);

    const tickets = await db
      .collection("Ticket")
      .find({
        batch_no,
        dateTime: { $gte: start, $lte: end },
        paymentMode: "Cash",
      })
      .toArray();

    const cashSalesOnDate = tickets.reduce((sum, t) => sum + Number(t.price || 0), 0);

    // 3. Get all cashier collections for this conductor today
    const collectionsOnDate = await CashierCollection.find({
      batch_no,
      collectionDate: today,
    }).sort({ createdAt: 1 });

    const totalCollectedOnDate = collectionsOnDate.reduce(
      (sum, c) => sum + c.collectedAmount,
      0
    );

    // 4. Cumulative calculation (across ALL dates — handles midnight crossover)
    // Total cash tickets EVER for this conductor (all dates, all trips)
    const allCashTickets = await db
      .collection("Ticket")
      .find({ batch_no, paymentMode: "Cash" })
      .toArray();
    const totalCumulativeSales = allCashTickets.reduce(
      (sum, t) => sum + Number(t.price || 0),
      0
    );

    // Total ever collected by cashier for this conductor
    const allCollections = await CashierCollection.find({ batch_no });
    const totalCumulativeCollected = allCollections.reduce(
      (sum, c) => sum + c.collectedAmount,
      0
    );

    // Outstanding balance = cumulative sales - cumulative collected.
    // Clamped to 0: prevents negative values if a data-entry error causes over-collection.
    const overallRemainingBalance = Math.max(0, totalCumulativeSales - totalCumulativeCollected);

    // Today's remaining = portion of today's sales still outstanding, capped by overall balance.
    const todaysRemainingBalance = Math.max(0, Math.min(cashSalesOnDate, overallRemainingBalance));

    res.status(200).json({
      conductorName: assignment.conductorId?.name || "N/A",
      conductorBatchNo: batch_no,
      driverName: assignment.driverId?.name || "N/A",
      driverBatchNo: assignment.driver_batch_no || "N/A",
      busNumber: assignment.assignedbusNumber,
      shift: assignment.shift,
      personalAmount: assignment.personalAmount || 0,
      date: today,
      // This date's data
      cashSalesOnDate,
      collectionsOnDate,
      totalCollectedOnDate,
      todaysRemainingBalance,
      // Cumulative totals (for overall balance tracking)
      totalCumulativeSales,
      totalCumulativeCollected,
      overallRemainingBalance,
    });
  } catch (err) {
    console.error("Cashier summary error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─────────────────────────────────────────────────────────────────
// POST /api/cashier-collections/collect
// Body: { batch_no, collectedAmount, collectionDate, notes }
//
// Records a new cash handover from conductor to cashier.
// ─────────────────────────────────────────────────────────────────
export const recordCollection = async (req, res) => {
  try {
    const { batch_no, collectedAmount, notes } = req.body;

    // Always record collection for today (server-side date)
    const today = new Date().toISOString().split("T")[0];

    if (!batch_no || !collectedAmount) {
      return res
        .status(400)
        .json({ message: "batch_no and collectedAmount are required" });
    }

    if (collectedAmount <= 0) {
      return res.status(400).json({ message: "Collected amount must be greater than 0" });
    }

    // Verify conductor exists
    const conductor = await Conductor.findOne({ batch_no }).select("name batch_no _id");
    if (!conductor) {
      return res.status(404).json({ message: "Conductor not found with this batch number" });
    }

    // Guard: check if there is anything left to collect
    const db = mongoose.connection.db;
    const allCashTicketsPre = await db
      .collection("Ticket")
      .find({ batch_no, paymentMode: "Cash" })
      .toArray();
    const totalSalesPre = allCashTicketsPre.reduce((sum, t) => sum + Number(t.price || 0), 0);
    const allCollectionsPre = await CashierCollection.find({ batch_no });
    const totalCollectedPre = allCollectionsPre.reduce((sum, c) => sum + c.collectedAmount, 0);
    const currentBalance = totalSalesPre - totalCollectedPre;

    if (currentBalance <= 0) {
      return res.status(400).json({ message: "No outstanding balance to collect. All cash has already been collected." });
    }

    const newCollection = await CashierCollection.create({
      conductorId: conductor._id,
      conductorName: conductor.name,
      batch_no: conductor.batch_no,
      collectedAmount: Number(collectedAmount),
      collectionDate: today,
      collectedByName: req.user?.username || req.user?.email || "Admin",
      collectedBy: req.user?._id || null,
      notes: notes || "",
    });

    // Recalculate cumulative balance after this collection (reuse pre-check values).
    // Clamped to 0: prevents returning a negative balance on over-collection.
    const overallRemainingBalance = Math.max(0, totalSalesPre - (totalCollectedPre + Number(collectedAmount)));

    res.status(201).json({
      message: "Collection recorded successfully",
      collection: newCollection,
      overallRemainingBalance,
    });
  } catch (err) {
    console.error("Record collection error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─────────────────────────────────────────────────────────────────
// PATCH /api/cashier-collections/personal-amount
// Body: { batch_no, personalAmount }
//
// Updates the personal starting amount (0-50 Rs) for the conductor's
// active bus assignment.
// ─────────────────────────────────────────────────────────────────
export const setPersonalAmount = async (req, res) => {
  try {
    const { batch_no, personalAmount } = req.body;

    if (!batch_no || personalAmount === undefined) {
      return res.status(400).json({ message: "batch_no and personalAmount are required" });
    }

    const amount = Number(personalAmount);
    if (isNaN(amount) || amount < 0 || amount > 50) {
      return res.status(400).json({ message: "personalAmount must be a number between 0 and 50" });
    }

    // Always update for today's assignment (server-side date)
    const today = new Date().toISOString().split("T")[0];

    const assignment = await ConductorBus.findOneAndUpdate(
      { batch_no, assignedDate: today },
      { personalAmount: amount },
      { new: true }
    );

    if (!assignment) {
      return res.status(404).json({ message: "No bus assignment found for this conductor today" });
    }

    res.status(200).json({
      message: "Personal amount updated successfully",
      personalAmount: assignment.personalAmount,
    });
  } catch (err) {
    console.error("Set personal amount error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─────────────────────────────────────────────────────────────────
// GET /api/cashier-collections/all?date=YYYY-MM-DD
//
// Returns all collection transactions for a given date (admin overview).
// ─────────────────────────────────────────────────────────────────
export const getAllCollectionsForDate = async (req, res) => {
  try {
    const { date } = req.query;

    const filter = date ? { collectionDate: date } : {};
    const collections = await CashierCollection.find(filter).sort({ createdAt: -1 });

    res.status(200).json({ collections, count: collections.length });
  } catch (err) {
    console.error("Get all collections error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─────────────────────────────────────────────────────────────────
// GET /api/cashier-collections/active-summaries?date=YYYY-MM-DD
//
// Returns a summary list of all active daily conductor-bus assignments
// along with their daily sales, collected amounts, and remaining balances.
// ─────────────────────────────────────────────────────────────────
export const getActiveConductorSummaries = async (req, res) => {
  try {
    // Always use today's date (server-side IST)
    const today = new Date().toISOString().split("T")[0];

    // Find all assignments strictly for today
    // Use populate match to exclude soft-deleted conductors
    const assignments = await ConductorBus.find({ assignedDate: today })
      .populate({ path: "conductorId", match: { isDeleted: { $ne: true } }, select: "name batch_no" })
      .populate("driverId", "name batch_no");

    // If conductor was soft-deleted, populate returns null — filter those out
    const activeAssignments = assignments.filter(a => a.conductorId != null);

    const db = mongoose.connection.db;

    // Today's ticket date range (server local IST)
    const selectedDate = new Date(today);
    const start = new Date(selectedDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(selectedDate);
    end.setHours(23, 59, 59, 999);

    const date = today; // alias for collectionDate query below

    const summaries = [];

    for (const assign of activeAssignments) {
      const batch_no = assign.batch_no;
      if (!batch_no) continue;

      // Skip duplicates if any
      if (summaries.some(s => s.conductorBatchNo === batch_no)) continue;

      // 2. Fetch daily ticket sales
      const tickets = await db
        .collection("Ticket")
        .find({
          batch_no,
          dateTime: { $gte: start, $lte: end },
          paymentMode: "Cash",
        })
        .toArray();

      const cashSalesOnDate = tickets.reduce((sum, t) => sum + Number(t.price || 0), 0);

      // 3. Fetch collections for today
      const collectionsOnDate = await CashierCollection.find({
        batch_no,
        collectionDate: today,
      });

      const totalCollectedOnDate = collectionsOnDate.reduce(
        (sum, c) => sum + c.collectedAmount,
        0
      );

      // 4. Calculate cumulative balance (total sales - total collected)
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
        (sum, c) => sum + c.collectedAmount,
        0
      );

      // Clamped to 0: prevents negative values if a data-entry error causes over-collection.
      const overallRemainingBalance = Math.max(0, totalCumulativeSales - totalCumulativeCollected);
      const todaysRemainingBalance = Math.max(0, Math.min(cashSalesOnDate, overallRemainingBalance));

      summaries.push({
        conductorName: assign.conductorId?.name || "N/A",
        conductorBatchNo: batch_no,
        driverName: assign.driverId?.name || "N/A",
        driverBatchNo: assign.driver_batch_no || assign.driverId?.batch_no || "N/A",
        busNumber: assign.assignedbusNumber,
        shift: assign.shift,
        personalAmount: assign.personalAmount || 0,
        cashSalesOnDate,
        totalCollectedOnDate,
        todaysRemainingBalance,
        overallRemainingBalance,
        assignmentId: assign._id,
      });
    }

    res.status(200).json(summaries);
  } catch (err) {
    console.error("Active summaries error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


// ─────────────────────────────────────────────────────────────────
// GET /api/cashier-collections/offduty-summary?batch_no=X
//
// Returns a conductor's outstanding balance regardless of whether
// they are assigned to a bus today. Used for collecting cash from
// conductors who are off-duty but have pending balances from
// previous working days.
//
// Does NOT require a ConductorBus assignment for today.
// ─────────────────────────────────────────────────────────────────
export const getOffDutySummary = async (req, res) => {
  try {
    const { batch_no } = req.query;

    if (!batch_no) {
      return res.status(400).json({ message: "batch_no is required" });
    }

    // 1. Look up conductor — no bus assignment required
    const conductor = await Conductor.findOne({ batch_no }).select("name batch_no _id");
    if (!conductor) {
      return res.status(404).json({ message: "Conductor not found with this batch number" });
    }

    // 2. Check if this conductor is already assigned today (so frontend can warn/redirect)
    const today = new Date().toISOString().split("T")[0];
    const todayAssignment = await ConductorBus.findOne({ batch_no, assignedDate: today })
      .select("assignedbusNumber shift")
      .lean();

    // 3. Compute cumulative cash sales (all time)
    const db = mongoose.connection.db;
    const allCashTickets = await db
      .collection("Ticket")
      .find({ batch_no, paymentMode: "Cash" })
      .toArray();
    const totalCumulativeSales = allCashTickets.reduce(
      (sum, t) => sum + Number(t.price || 0),
      0
    );

    // 4. Compute cumulative collected (all time)
    const allCollections = await CashierCollection.find({ batch_no });
    const totalCumulativeCollected = allCollections.reduce(
      (sum, c) => sum + c.collectedAmount,
      0
    );

    // 5. Outstanding balance (clamped to 0)
    const overallRemainingBalance = Math.max(0, totalCumulativeSales - totalCumulativeCollected);

    // 6. Get the most recent collection for display
    const lastCollection = await CashierCollection.findOne({ batch_no })
      .sort({ createdAt: -1 })
      .select("collectedAmount collectionDate createdAt")
      .lean();

    res.status(200).json({
      conductorName: conductor.name,
      conductorBatchNo: conductor.batch_no,
      conductorId: conductor._id,
      isAssignedToday: !!todayAssignment,
      todayAssignment: todayAssignment || null,
      totalCumulativeSales,
      totalCumulativeCollected,
      overallRemainingBalance,
      lastCollection: lastCollection || null,
    });
  } catch (err) {
    console.error("Off-duty summary error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


// ─────────────────────────────────────────────────────────────────
// GET /api/cashier-collections/pending-by-date?batch_no=X
//
// Returns a per-date breakdown of cash sales vs. collections for a
// conductor, filtered to only dates with an outstanding balance.
//
// Algorithm:
//   1. Aggregate Ticket collection: group cash tickets by IST calendar
//      date using $dateToString with timezone: "Asia/Calcutta".
//      This ensures midnight IST = correct day, regardless of UTC offset.
//   2. Aggregate CashierCollection: group collected amounts by collectionDate.
//   3. Merge: for every date that appears in either set, compute
//      remaining = sales - collected.
//   4. Return only dates where remaining > 0, sorted newest-first.
//   5. Include summary totals for the UI summary card.
// ─────────────────────────────────────────────────────────────────
export const getPendingBalanceByDate = async (req, res) => {
  try {
    const { batch_no } = req.query;

    if (!batch_no) {
      return res.status(400).json({ message: "batch_no is required" });
    }

    // ── Step 1: Verify conductor exists ──────────────────────────────
    const conductor = await Conductor.findOne({ batch_no }).select("name batch_no");
    if (!conductor) {
      return res.status(404).json({ message: "Conductor not found with this batch number" });
    }

    // ── Step 2: Aggregate cash ticket sales by IST date ──────────────
    // MongoDB's $dateToString with "Asia/Calcutta" correctly converts
    // UTC dateTime fields to the IST calendar date string (YYYY-MM-DD).
    const db = mongoose.connection.db;
    const ticketSalesByDate = await db
      .collection("Ticket")
      .aggregate([
        {
          $match: {
            batch_no,
            paymentMode: "Cash",
          },
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$dateTime",
                timezone: "Asia/Calcutta",
              },
            },
            totalSales: { $sum: { $toDouble: "$price" } },
            ticketCount: { $sum: 1 },
          },
        },
        {
          $project: {
            _id: 0,
            date: "$_id",
            totalSales: { $round: ["$totalSales", 2] },
            ticketCount: 1,
          },
        },
      ])
      .toArray();

    // ── Step 3: Aggregate all collections for this conductor ──────────
    // CashierCollection.collectionDate is stored as "YYYY-MM-DD" string.
    const allCollections = await CashierCollection.aggregate([
      { $match: { batch_no } },
      {
        $group: {
          _id: "$collectionDate",
          totalCollected: { $sum: "$collectedAmount" },
        },
      },
      {
        $project: {
          _id: 0,
          date: "$_id",
          totalCollected: { $round: ["$totalCollected", 2] },
        },
      },
    ]);

    // ── Step 4: Build a unified map of all dates ──────────────────────
    // Key: "YYYY-MM-DD", Value: { sales, collected }
    const dateMap = new Map();

    for (const entry of ticketSalesByDate) {
      dateMap.set(entry.date, {
        sales: entry.totalSales,
        ticketCount: entry.ticketCount,
        collected: 0,
      });
    }

    for (const entry of allCollections) {
      if (dateMap.has(entry.date)) {
        dateMap.get(entry.date).collected = entry.totalCollected;
      } else {
        // Collections recorded on a date with no ticket sales (edge case)
        dateMap.set(entry.date, {
          sales: 0,
          ticketCount: 0,
          collected: entry.totalCollected,
        });
      }
    }

    // ── Step 5: Compute remaining & filter to pending only ────────────
    const todayIST = new Date()
      .toLocaleDateString("en-CA", { timeZone: "Asia/Calcutta" }); // "YYYY-MM-DD"

    const pendingDates = [];
    let totalPendingSales = 0;
    let totalCollectedAgainstPending = 0;

    for (const [date, data] of dateMap) {
      const remaining = Math.round((data.sales - data.collected) * 100) / 100;
      if (remaining <= 0) continue; // fully collected — skip

      // Calculate how many days ago this date was (in IST calendar days)
      const msPerDay = 24 * 60 * 60 * 1000;
      const todayParts = todayIST.split("-").map(Number);
      const dateParts  = date.split("-").map(Number);
      const todayUTCMidnight = Date.UTC(todayParts[0], todayParts[1] - 1, todayParts[2]);
      const dateUTCMidnight  = Date.UTC(dateParts[0],  dateParts[1] - 1,  dateParts[2]);
      const daysAgo = Math.round((todayUTCMidnight - dateUTCMidnight) / msPerDay);

      // Human-readable display date (e.g. "19 Jul 2026")
      const displayDate = new Date(date + "T12:00:00Z").toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });

      pendingDates.push({
        date,
        displayDate,
        daysAgo,
        sales: data.sales,
        ticketCount: data.ticketCount,
        collected: data.collected,
        remaining,
      });

      totalPendingSales            += data.sales;
      totalCollectedAgainstPending += data.collected;
    }

    // Sort: most recent date first
    pendingDates.sort((a, b) => b.date.localeCompare(a.date));

    const totalOutstanding = Math.round(
      (totalPendingSales - totalCollectedAgainstPending) * 100
    ) / 100;

    return res.status(200).json({
      conductorName:               conductor.name,
      batch_no:                    conductor.batch_no,
      pendingDates,
      pendingDaysCount:            pendingDates.length,
      totalPendingSales:           Math.round(totalPendingSales * 100) / 100,
      totalCollectedAgainstPending: Math.round(totalCollectedAgainstPending * 100) / 100,
      totalOutstanding,
    });
  } catch (err) {
    console.error("Pending balance by date error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─────────────────────────────────────────────────────────────────
// GET /api/cashier-collections/offduty-summaries
//
// Returns a list of all non-active conductors who have a positive
// outstanding balance (cumulative cash sales > cumulative collected).
// ─────────────────────────────────────────────────────────────────
export const getOffDutyConductors = async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];

    // 1. Find all active conductor assignments today
    const activeAssignments = await ConductorBus.find({ assignedDate: today })
      .select("batch_no")
      .lean();
    const activeBatches = new Set(activeAssignments.map(a => a.batch_no));

    // 2. Fetch all ticket sales grouped by batch_no (cash payment mode only)
    const db = mongoose.connection.db;
    const salesData = await db.collection("Ticket").aggregate([
      { $match: { paymentMode: "Cash" } },
      { $group: { _id: "$batch_no", totalSales: { $sum: { $toDouble: "$price" } } } }
    ]).toArray();

    // 3. Fetch cashier collection totals grouped by batch_no
    const collectionsData = await CashierCollection.aggregate([
      { $group: { _id: "$batch_no", totalCollected: { $sum: "$collectedAmount" } } }
    ]);

    const salesMap = new Map(salesData.map(item => [item._id, item.totalSales]));
    const collectedMap = new Map(collectionsData.map(item => [item._id, item.totalCollected]));

    // 4. Fetch all non-deleted conductors
    const conductors = await Conductor.find({ isDeleted: { $ne: true } }).lean();

    const offDutyList = [];

    for (const conductor of conductors) {
      const batch_no = conductor.batch_no;
      if (!batch_no) continue;

      // Skip if active today
      if (activeBatches.has(batch_no)) continue;

      const totalSales = salesMap.get(batch_no) || 0;
      const totalCollected = collectedMap.get(batch_no) || 0;
      const overallRemainingBalance = Math.max(0, totalSales - totalCollected);

      // Only include if they have a remaining balance to collect
      if (overallRemainingBalance > 0) {
        offDutyList.push({
          conductorName: conductor.name,
          conductorBatchNo: batch_no,
          conductorId: conductor._id,
          totalCumulativeSales: totalSales,
          totalCumulativeCollected: totalCollected,
          overallRemainingBalance,
        });
      }
    }

    // Sort by remaining balance descending
    offDutyList.sort((a, b) => b.overallRemainingBalance - a.overallRemainingBalance);

    res.status(200).json(offDutyList);
  } catch (err) {
    console.error("Get off duty conductors error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

