import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import Conductor from "../models/conductors.model.js";
import ConductorBus from "../models/ConductorBus.model.js";
import BusPOS from "../models/busPosMapping.model.js";
import Bus from "../models/bus.model.js";
import PosMachine from "../models/posMachine.model.js";
import { config } from "dotenv";

config();

/**
 * Get current date string in IST timezone (YYYY-MM-DD)
 */
const getTodayDateStr = () => {
  const dt = new Date();
  const istDate = new Date(dt.getTime() + 5.5 * 60 * 60 * 1000);
  return (
    `${istDate.getUTCFullYear()}-` +
    `${String(istDate.getUTCMonth() + 1).padStart(2, "0")}-` +
    `${String(istDate.getUTCDate()).padStart(2, "0")}`
  );
};

/**
 * Helper to resolve POS machine for a conductor as fallback.
 */
const resolvePosMachine = async (busId, conductorId, batch_no) => {
  try {
    if (busId) {
      const busPos = await BusPOS.findOne({
        bus: busId,
        isDeleted: { $ne: true },
      }).populate("posMachine");

      if (busPos && busPos.posMachine && !busPos.posMachine.isDeleted) {
        return {
          posMachineId: busPos.posMachine._id,
          posName: busPos.posMachine.posName,
          deviceId: busPos.posMachine.deviceId,
          serialNumber: busPos.posMachine.serialNumber || "",
        };
      }
    }

    const db = mongoose.connection.db;
    if (db) {
      const sessions = await db
        .collection("conductor_sessions")
        .find({
          $or: [
            { conductorId: conductorId },
            { batch_no: String(batch_no) },
          ],
          deviceId: { $exists: true, $nin: ["unknown", "", null] },
        })
        .sort({ loginTime: -1, _id: -1 })
        .limit(1)
        .toArray();

      if (sessions && sessions.length > 0) {
        const lastDeviceId = sessions[0].deviceId;
        const posMachine = await PosMachine.findOne({
          deviceId: lastDeviceId,
          isDeleted: { $ne: true },
        });

        if (posMachine) {
          return {
            posMachineId: posMachine._id,
            posName: posMachine.posName,
            deviceId: posMachine.deviceId,
            serialNumber: posMachine.serialNumber || "",
          };
        }
      }
    }
  } catch (error) {
    console.error("Error resolving POS Machine:", error.message);
  }
  return null;
};

/**
 * Resolves TODAY'S active bus assignments for a conductor,
 * auto-detects current active bus + POS from latest ticket issued today,
 * or defaults to today's assigned buses.
 */
const getConductorAssignmentsAndPos = async (conductor) => {
  const todayStr = getTodayDateStr();

  // STRICTLY filter by today's date (assignedDate = todayStr)
  const activeAssignments = await ConductorBus.find({
    $or: [
      { conductorId: conductor._id },
      { batch_no: String(conductor.batch_no) },
    ],
    assignedDate: todayStr,
    isActive: true,
  }).populate("busId");

  if (!activeAssignments || activeAssignments.length === 0) {
    return { assignedBuses: [], activeAssignment: null };
  }

  const assignedBuses = activeAssignments.map((a) => ({
    assignmentId: a._id,
    busId: a.busId ? a.busId._id : null,
    busNumber: a.assignedbusNumber || (a.busId ? a.busId.busNumber : ""),
    shift: a.shift || "Morning",
    assignedDate: a.assignedDate,
  }));

  // Query latest ticket issued today for auto detection
  let latestTicket = null;
  let autoPos = null;
  const db = mongoose.connection.db;

  if (db) {
    try {
      const tickets = await db
        .collection("Ticket")
        .find({ batch_no: String(conductor.batch_no) })
        .sort({ dateTime: -1, _id: -1 })
        .limit(1)
        .toArray();

      if (tickets && tickets.length > 0) {
        latestTicket = tickets[0];
      }
    } catch (err) {
      console.error("Error querying latest ticket:", err.message);
    }
  }

  let matchedAssignment = assignedBuses[0];

  if (latestTicket && latestTicket.busNumber) {
    const found = assignedBuses.find(
      (item) =>
        String(item.busNumber).trim().toLowerCase() ===
        String(latestTicket.busNumber).trim().toLowerCase()
    );
    if (found) {
      matchedAssignment = found;
    }
  }

  if (latestTicket) {
    const rawMachineId = latestTicket.machineid || latestTicket.deviceId;
    if (rawMachineId) {
      const posDoc = await PosMachine.findOne({
        $or: [
          { deviceId: String(rawMachineId) },
          { serialNumber: { $regex: String(rawMachineId), $options: "i" } },
        ],
        isDeleted: { $ne: true },
      });

      if (posDoc) {
        autoPos = {
          posMachineId: posDoc._id,
          posName: posDoc.posName,
          deviceId: posDoc.deviceId,
          serialNumber: posDoc.serialNumber || "",
        };
      } else {
        autoPos = {
          posMachineId: "",
          posName: `POS Device #${rawMachineId}`,
          deviceId: String(rawMachineId),
          serialNumber: String(rawMachineId),
        };
      }
    }
  }

  // Fallback for POS if not auto-detected from ticket
  if (!autoPos) {
    autoPos = await resolvePosMachine(
      matchedAssignment.busId,
      conductor._id,
      conductor.batch_no
    );
  }

  const activeAssignment = {
    bus: {
      busId: matchedAssignment.busId,
      busNumber: matchedAssignment.busNumber,
      shift: matchedAssignment.shift,
      assignmentId: matchedAssignment.assignmentId,
    },
    pos: autoPos,
    autoDetected: !!latestTicket,
  };

  return { assignedBuses, activeAssignment };
};

/**
 * POST /api/conductor-auth/login
 */
export const conductorLogin = async (req, res) => {
  try {
    const { batch_no, password } = req.body;

    if (!batch_no || !password) {
      return res
        .status(400)
        .json({ message: "Batch number and password are required." });
    }

    const conductor = await Conductor.findOne({
      batch_no: batch_no.trim(),
      isDeleted: { $ne: true },
    });
    if (!conductor) {
      return res
        .status(401)
        .json({ message: "Invalid batch number or password." });
    }

    const isMatch = await bcrypt.compare(password, conductor.password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ message: "Invalid batch number or password." });
    }

    // Resolve today's active bus assignments
    const { assignedBuses, activeAssignment } =
      await getConductorAssignmentsAndPos(conductor);

    // Guard requirement: Block login if no bus is assigned today
    if (!assignedBuses || assignedBuses.length === 0) {
      return res.status(403).json({
        success: false,
        message: "No bus assigned to you today. Please contact SMT admin.",
      });
    }

    const token = jwt.sign(
      {
        conductorId: conductor._id,
        batch_no: conductor.batch_no,
        name: conductor.name,
      },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    return res.status(200).json({
      success: true,
      token,
      conductor: {
        _id: conductor._id,
        name: conductor.name,
        batch_no: conductor.batch_no,
        phone_no: conductor.phone_no,
        type: conductor.type,
      },
      assignedBuses,
      assignment: activeAssignment,
    });
  } catch (error) {
    console.error("❌ Conductor Login Error:", error.message);
    return res.status(500).json({ message: "Internal server error." });
  }
};

/**
 * GET /api/conductor-auth/me
 */
export const getConductorProfile = async (req, res) => {
  try {
    const conductor = req.conductor;

    const { assignedBuses, activeAssignment } =
      await getConductorAssignmentsAndPos(conductor);

    return res.status(200).json({
      success: true,
      conductor: {
        _id: conductor._id,
        name: conductor.name,
        batch_no: conductor.batch_no,
        phone_no: conductor.phone_no,
        type: conductor.type,
      },
      assignedBuses,
      assignment: activeAssignment,
    });
  } catch (error) {
    console.error("❌ Get Conductor Profile Error:", error.message);
    return res.status(500).json({ message: "Internal server error." });
  }
};
