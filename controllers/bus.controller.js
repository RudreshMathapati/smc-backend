import Bus from "../models/bus.model.js";
import ConductorBus from "../models/ConductorBus.model.js";
import BusRoute from "../models/busRouteMapping.model.js";
import BusPOS from "../models/busPosMapping.model.js";

// @access  Admin

// Add bus
export const addBus = async (req, res) => {
  try {
    const { busNumber, type, capacity, registrationNumber, status, chassisNumber, makersName } = req.body;

    // Validate input
    if (!busNumber || !type || !capacity || !registrationNumber || !status) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const newBus = new Bus({
      busNumber,
      type,
      capacity,
      registrationNumber,
      status,
      chassisNumber,
      makersName,
    });

    await newBus.save();
    res.status(201).json({ message: "Bus added successfully", bus: newBus });
  } catch (error) {
    console.error("Error adding bus:", error);
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        message: `Bus with this ${field} already exists.`,
      });
    }
    res.status(500).json({ message: "Server error" });
  }
};

// Get all buses
export const getAllBuses = async (req, res) => {
  try {
    const allBuses = await Bus.find({ isDeleted: { $ne: true } });
    res.status(200).json(allBuses);
  } catch (error) {
    console.error("Error fetching buses:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

// Delete a bus
export const deleteBus = async (req, res) => {
  try {
    const bus = await Bus.findById(req.params.id);
    if (!bus) {
      return res.status(404).json({ message: "Bus not found" });
    }

    if (bus.isDeleted) {
      return res.status(400).json({ message: "Bus is already deleted" });
    }

    // Step 1: Soft-delete the bus record
    bus.isDeleted = true;
    const suffix = `_del_${Date.now()}`;
    bus.busNumber = `${bus.busNumber}${suffix}`;
    bus.registrationNumber = `${bus.registrationNumber}${suffix}`;
    await bus.save();

    // Step 2: Deactivate conductor-bus assignments (frees conductor and driver)
    await ConductorBus.updateMany(
      { busId: bus._id, isActive: true },
      { isActive: false }
    );

    // Step 3: Soft-delete bus-route mappings (frees route slot)
    await BusRoute.updateMany(
      { bus: bus._id, isDeleted: { $ne: true } },
      { isDeleted: true }
    );

    // Step 4: Soft-delete bus-POS mappings (frees POS machine)
    await BusPOS.updateMany(
      { bus: bus._id, isDeleted: { $ne: true } },
      { isDeleted: true }
    );

    res.status(200).json({ message: "Bus deleted successfully" });
  } catch (error) {
    console.error("Error deleting bus:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Optional: Update a bus
export const updateBus = async (req, res) => {
  try {
    const { busNumber, type, capacity, registrationNumber, status, chassisNumber, makersName } = req.body;

    // Validate required fields
    if (!busNumber || !type || !capacity || !registrationNumber || !status) {
      return res.status(400).json({ message: "All required fields must be provided" });
    }

    // Check if another bus (different _id) has the same busNumber
    const duplicateBusNumber = await Bus.findOne({ busNumber, _id: { $ne: req.params.id } });
    if (duplicateBusNumber) {
      return res.status(400).json({ message: "Another bus with this bus number already exists." });
    }

    // Check if another bus (different _id) has the same registrationNumber
    const duplicateRegNumber = await Bus.findOne({ registrationNumber, _id: { $ne: req.params.id } });
    if (duplicateRegNumber) {
      return res.status(400).json({ message: "Another bus with this registration number already exists." });
    }

    const updatedBus = await Bus.findByIdAndUpdate(
      req.params.id,
      { busNumber, type, capacity, registrationNumber, status, chassisNumber, makersName },
      { new: true }
    );

    if (!updatedBus) {
      return res.status(404).json({ message: "Bus not found" });
    }

    res
      .status(200)
      .json({ message: "Bus updated successfully", bus: updatedBus });
  } catch (error) {
    console.error("Error updating bus:", error.message, error.stack);
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        message: `Bus with this ${field} already exists.`,
      });
    }
    res.status(500).json({ message: error.message || "Server error" });
  }
};
