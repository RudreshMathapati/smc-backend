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
 * POST /api/conductor-auth/login
 * Login for conductors using batch_no and password.
 * Returns a JWT token (via Authorization header, not cookie, for mobile compatibility).
 */
export const conductorLogin = async (req, res) => {
  try {
    const { batch_no, password } = req.body;

    if (!batch_no || !password) {
      return res
        .status(400)
        .json({ message: "Batch number and password are required." });
    }

    // 1. Find conductor by batch_no
    const conductor = await Conductor.findOne({ batch_no: batch_no.trim() });
    if (!conductor) {
      return res.status(401).json({ message: "Invalid batch number or password." });
    }

    // 2. Verify password
    const isMatch = await bcrypt.compare(password, conductor.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid batch number or password." });
    }

    // 3. Find active bus assignment for this conductor
    const assignment = await ConductorBus.findOne({
      conductorId: conductor._id,
      isActive: true,
    }).populate("busId");

    let busInfo = null;
    let posInfo = null;

    if (assignment && assignment.busId) {
      busInfo = {
        busId: assignment.busId._id,
        busNumber: assignment.busId.busNumber,
        assignedbusNumber: assignment.assignedbusNumber,
      };

      // 4. Find POS mapped to this bus
      const busPos = await BusPOS.findOne({
        bus: assignment.busId._id,
      }).populate("posMachine");

      if (busPos && busPos.posMachine) {
        posInfo = {
          posMachineId: busPos.posMachine._id,
          posName: busPos.posMachine.posName,
          deviceId: busPos.posMachine.deviceId,
        };
      }
    }

    // 5. Sign JWT — embed conductor info for stateless use in mobile app
    const token = jwt.sign(
      {
        conductorId: conductor._id,
        batch_no: conductor.batch_no,
        name: conductor.name,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
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
      assignment: busInfo
        ? {
            bus: busInfo,
            pos: posInfo,
          }
        : null,
    });
  } catch (error) {
    console.error("❌ Conductor Login Error:", error.message);
    return res.status(500).json({ message: "Internal server error." });
  }
};

/**
 * GET /api/conductor-auth/me
 * Returns conductor profile + active bus-POS assignment.
 * Requires: Authorization: Bearer <token>
 */
export const getConductorProfile = async (req, res) => {
  try {
    const conductor = req.conductor;

    // Fetch fresh assignment from DB
    const assignment = await ConductorBus.findOne({
      conductorId: conductor._id,
      isActive: true,
    }).populate("busId");

    let busInfo = null;
    let posInfo = null;

    if (assignment && assignment.busId) {
      busInfo = {
        busId: assignment.busId._id,
        busNumber: assignment.busId.busNumber,
      };

      const busPos = await BusPOS.findOne({
        bus: assignment.busId._id,
      }).populate("posMachine");

      if (busPos && busPos.posMachine) {
        posInfo = {
          posMachineId: busPos.posMachine._id,
          posName: busPos.posMachine.posName,
          deviceId: busPos.posMachine.deviceId,
        };
      }
    }

    return res.status(200).json({
      success: true,
      conductor: {
        _id: conductor._id,
        name: conductor.name,
        batch_no: conductor.batch_no,
        phone_no: conductor.phone_no,
        type: conductor.type,
      },
      assignment: busInfo
        ? {
            bus: busInfo,
            pos: posInfo,
          }
        : null,
    });
  } catch (error) {
    console.error("❌ Get Conductor Profile Error:", error.message);
    return res.status(500).json({ message: "Internal server error." });
  }
};
