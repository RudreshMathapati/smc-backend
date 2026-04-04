import express from "express";
import mongoose from "mongoose";
import ConductorBus from "../models/ConductorBus.model.js";
import BusRoute from "../models/busRouteMapping.model.js";
import Route from "../models/route.model.js";

const router = express.Router();

// GET Conductor Daily Report
router.get("/conductor", async (req, res) => {
  try {
    const { batch_no, date } = req.query;

    if (!batch_no || !date) {
      return res.status(400).json({ message: "batch_no and date required" });
    }

    // 1. Get Bus assigned to conductor
    const conductorBus = await ConductorBus.findOne({
      batch_no,
      isActive: true,
    });

    if (!conductorBus) {
      return res.status(404).json({ message: "No bus assigned to conductor" });
    }

    const busNumber = conductorBus.assignedbusNumber;
    const busId = conductorBus.busId;

    // 2. Get Route assigned to bus
    const busRoute = await BusRoute.findOne({ busId }).populate("routeId");

    let routeName = "";
    if (busRoute && busRoute.routeId) {
      routeName = `${busRoute.routeId.source} → ${busRoute.routeId.destination}`;
    }

    // 3. Get Tickets directly from collection

    const db = mongoose.connection.db;
    // Convert selected date into start and end of day
    const selectedDate = new Date(date);

    const start = new Date(selectedDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(selectedDate);
    end.setHours(23, 59, 59, 999);

    // Fetch tickets using dateTime
    const tickets = await db
      .collection("Ticket")
      .find({
        batch_no: batch_no,
        dateTime: {
          $gte: start,
          $lte: end,
        },
      })
      .toArray();

    console.log("Tickets found:", tickets.length);

    // 4. Summary calculations
    let totalTickets = tickets.length;
    let cash = 0;
    let online = 0;
    let full = 0;
    let half = 0;
    let pass = 0;

    let stopData = {};

    tickets.forEach((t) => {
      if (t.paymentMode === "Cash") cash += t.price;
      else online += t.price;

      if (t.selectedPass === "None") full++;
      else if (t.selectedPass === "Half ticket") half++;
      else pass++;

      // Boarding
      if (!stopData[t.boardingStop]) {
        stopData[t.boardingStop] = { boarding: 0, dropping: 0 };
      }
      stopData[t.boardingStop].boarding++;

      // Dropping
      if (!stopData[t.destinationStop]) {
        stopData[t.destinationStop] = { boarding: 0, dropping: 0 };
      }
      stopData[t.destinationStop].dropping++;
    });

    const stops = Object.keys(stopData).map((stop) => ({
      stop,
      boarding: stopData[stop].boarding,
      dropping: stopData[stop].dropping,
    }));

    res.json({
      conductor: batch_no,
      busNumber,
      route: routeName,
      date,
      summary: {
        totalTickets,
        cash,
        online,
        total: cash + online,
      },
      ticketTypes: {
        full,
        half,
        pass,
      },
      stops,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
