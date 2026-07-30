import Driver from "../models/drivers.model.js";
import ConductorBus from "../models/ConductorBus.model.js";
import ShiftAssignment from "../models/shiftAssignment.model.js";
import Conductor from "../models/conductors.model.js";

// Register Driver
export const registerDriver = async (req, res) => {
  try {
    const { name, batch_no, type, phone_no } = req.body;

    // Check if driver already exists
    const existingDriver = await Driver.findOne({ batch_no });
    if (existingDriver) {
      return res.status(400).json({ message: "Batch No already exists" });
    }

    if (phone_no) {
      const existingConductorPhone = await Conductor.findOne({ phone_no, isDeleted: { $ne: true } });
      const existingDriverPhone = await Driver.findOne({ phone_no, isDeleted: { $ne: true } });
      if (existingConductorPhone || existingDriverPhone) {
        return res.status(400).json({ message: "Phone number already registered with a conductor or driver" });
      }
    }

    const newDriver = new Driver({
      name,
      batch_no,
      type,
      phone_no,
    });

    await newDriver.save();
    res
      .status(201)
      .json({ message: "Driver registered successfully", newDriver });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Login Driver
export const loginDriver = async (req, res) => {
  res.status(400).json({ message: "Drivers do not have passwords to log in" });
};

// Get All Drivers
export const getDrivers = async (req, res) => {
  try {
    const drivers = await Driver.find({ isDeleted: { $ne: true } });
    res.json(drivers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get Single Driver by ID
export const getDriverById = async (req, res) => {
  try {
    const driver = await Driver.findById(req.params.id);
    if (!driver)
      return res.status(404).json({ message: "Driver not found" });
    res.json(driver);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update Driver
export const updateDriver = async (req, res) => {
  try {
    const { name, type, phone_no } = req.body;
    let updatedData = { name, type, phone_no };

    if (phone_no) {
      const existingConductorPhone = await Conductor.findOne({
        phone_no,
        isDeleted: { $ne: true }
      });
      const existingDriverPhone = await Driver.findOne({
        phone_no,
        _id: { $ne: req.params.id },
        isDeleted: { $ne: true }
      });
      if (existingConductorPhone || existingDriverPhone) {
        return res.status(400).json({ message: "Phone number already registered with a conductor or driver" });
      }
    }

    const driver = await Driver.findByIdAndUpdate(
      req.params.id,
      updatedData,
      { new: true }
    );

    if (!driver)
      return res.status(404).json({ message: "Driver not found" });
    res.json({ message: "Driver updated", driver });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Delete Driver
export const deleteDriver = async (req, res) => {
  try {
    const driver = await Driver.findById(req.params.id);
    if (!driver) {
      return res.status(404).json({ message: "Driver not found" });
    }

    if (driver.isDeleted) {
      return res.status(400).json({ message: "Driver is already deleted" });
    }

    // Step 1: Soft-delete the driver profile
    driver.isDeleted = true;
    driver.batch_no = `${driver.batch_no}_deleted_${Date.now()}`;
    await driver.save();

    // Step 2: Deactivate their active bus assignment (frees the bus and conductor)
    await ConductorBus.updateMany(
      { driverId: driver._id, isActive: true },
      { isActive: false }
    );

    // Step 3: Soft-delete their shift assignments (frees the shift slot)
    await ShiftAssignment.updateMany(
      { personId: driver._id, personType: "Driver", isDeleted: { $ne: true } },
      { isDeleted: true }
    );

    res.json({ message: "Driver deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
