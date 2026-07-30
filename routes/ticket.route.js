import express from "express";
import mongoose from "mongoose";
import ConductorBus from "../models/ConductorBus.model.js";

const router = express.Router();

/**
 * POST /api/tickets
 * Called by the ETM mobile app to save a ticket.
 * Automatically resolves and injects the `shift` field from the active
 * conductor_bus assignment (matched by batch_no + busNumber + date).
 *
 * Body: standard ticket fields (batch_no, busNumber, dateTime, price, etc.)
 */
router.post("/", async (req, res) => {
  try {
    const ticketData = req.body;

    const { batch_no, busNumber, dateTime } = ticketData;

    if (!batch_no || !busNumber) {
      return res
        .status(400)
        .json({ message: "batch_no and busNumber are required" });
    }

    // Derive the assigned date string from dateTime (IST = UTC+5:30)
    const dt = dateTime ? new Date(dateTime) : new Date();
    const istDate = new Date(dt.getTime() + 5.5 * 60 * 60 * 1000);
    const dateStr =
      `${istDate.getUTCFullYear()}-` +
      `${String(istDate.getUTCMonth() + 1).padStart(2, "0")}-` +
      `${String(istDate.getUTCDate()).padStart(2, "0")}`;

    // Find all conductor_bus assignments for this conductor on this date
    const dayAssignments = await ConductorBus.find({
      batch_no,
      assignedDate: dateStr,
      isActive: true,
    });

    let resolvedShift = "Morning"; // default fallback

    if (dayAssignments.length === 1) {
      resolvedShift = dayAssignments[0].shift;
    } else if (dayAssignments.length > 1) {
      // Multiple shifts on same day — match by busNumber
      const busMatch = dayAssignments.find(
        (a) =>
          String(a.assignedbusNumber).trim().toLowerCase() ===
          String(busNumber).trim().toLowerCase()
      );
      resolvedShift = busMatch ? busMatch.shift : dayAssignments[0].shift;
    }

    // Inject shift into ticket data
    const ticketWithShift = {
      ...ticketData,
      shift: resolvedShift,
    };

    // Save directly to the Ticket collection (raw MongoDB insert, same as ETM app)
    const db = mongoose.connection.db;
    const result = await db.collection("Ticket").insertOne(ticketWithShift);

    return res.status(201).json({
      message: "Ticket saved successfully",
      ticketId: result.insertedId,
      shift: resolvedShift,
    });
  } catch (err) {
    console.error("Ticket save error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

export default router;
