import BusPOS from "../models/busPosMapping.model.js";
import Bus from "../models/bus.model.js";
import POSMachine from "../models/posMachine.model.js";
import mongoose from "mongoose";

// Helper to validate references
const validateBusAndPOS = async (busId, posMachineId) => {
  // Validate if the IDs are in correct ObjectId format
  if (!mongoose.Types.ObjectId.isValid(busId)) {
    throw new Error("Invalid Bus ID format");
  }
  if (!mongoose.Types.ObjectId.isValid(posMachineId)) {
    throw new Error("Invalid POS Machine ID format");
  }

  // Fetch both documents in parallel
  const [bus, pos] = await Promise.all([
    Bus.findById(busId),
    POSMachine.findById(posMachineId),
  ]);

  // Handle not found cases
  if (!bus) {
    throw new Error("Bus not found");
  }
  if (!pos) {
    throw new Error("POS Machine not found");
  }

  // Return valid references
  return { bus, pos };
};

// Create Assignment
export const assignPOSMachine = async (req, res) => {
  const { busId, posDeviceId } = req.body;

  // console.log("Bus id : ",busId)
  // console.log("Pos id : ", posDeviceId);
  try {
    const { bus, pos } = await validateBusAndPOS(busId, posDeviceId);

    if (!bus || !pos) {
      return res.status(404).json({ message: "Bus or POS machine not found" });
    }

    const existing = await BusPOS.findOne({
      $or: [{ bus: busId }, { posMachine: posDeviceId }],
    });

    if (existing) {
      return res
        .status(400)
        .json({ message: "Bus or POS machine already assigned" });
    }

    const newAssignment = await BusPOS.create({
      bus: busId,
      posMachine: posDeviceId,
    });

    res.status(201).json(newAssignment);
  } catch (error) {
    console.log(
      "Error in assignPOSMachine in busPosMapping.controller.js ",
      error.message
    );
    res.status(500).json({ message: error.message });
  }
};

// Read All Assignments
export const getAllBusPOSMappings = async (_req, res) => {
  try {
    const assignments = await BusPOS.find({})
      .populate("bus")
      .populate("posMachine");

    return res.status(200).json({
      success: true,
      total: assignments.length,
      data: assignments,
    });
  } catch (error) {
    console.error("Error fetching bus-pos mappings:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch Bus-POS mappings",
      error: error.message,
    });
  }
};

// Update Assignment
export const updatePOSAssignment = async (req, res) => {
  const { id } = req.params;
  const { busId, posDeviceId } = req.body;

  console.log(req.body);
  console.log(req.params);

  try {
    const { bus, pos } = await validateBusAndPOS(busId, posDeviceId);

    if (!bus || !pos) {
      return res.status(404).json({ message: "Bus or POS machine not found" });
    }

    const conflict = await BusPOS.findOne({
      $or: [{ bus: busId }, { posMachine: posDeviceId }],
      _id: { $ne: id }, // exclude current assignment from conflict check
    });

    if (conflict) {
      return res.status(400).json({
        message: "Conflict: Either the bus or POS is already assigned",
      });
    }

    const updatedAssignment = await BusPOS.findByIdAndUpdate(
      id,
      { bus: busId, posMachine: posDeviceId },
      { new: true }
    );

    if (!updatedAssignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    res.status(200).json(updatedAssignment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete Assignment
export const deletePOSAssignment = async (req, res) => {
  const { id } = req.params;

  try {
    const deleted = await BusPOS.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    res.status(200).json({ message: "Assignment deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
