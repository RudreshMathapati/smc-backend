import Conductor from "../models/conductors.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import ConductorBus from "../models/ConductorBus.model.js";
import ShiftAssignment from "../models/shiftAssignment.model.js";
import Driver from "../models/drivers.model.js";

// Register Conductor
export const registerConductor = async (req, res) => {
  try {
    const { name, batch_no, password, type, phone_no } = req.body;

    // Check if conductor already exists
    const existingConductor = await Conductor.findOne({ batch_no });
    if (existingConductor) {
      return res.status(400).json({ message: "Batch No already exists" });
    }

    if (phone_no) {
      const existingConductorPhone = await Conductor.findOne({ phone_no, isDeleted: { $ne: true } });
      const existingDriverPhone = await Driver.findOne({ phone_no, isDeleted: { $ne: true } });
      if (existingConductorPhone || existingDriverPhone) {
        return res.status(400).json({ message: "Phone number already registered with a conductor or driver" });
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const newConductor = new Conductor({
      name,
      batch_no,
      password: hashedPassword,
      type, // save Permanent / Temporary
      phone_no,
    });

    await newConductor.save();
    res
      .status(201)
      .json({ message: "Conductor registered successfully", newConductor });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Login Conductor
export const loginConductor = async (req, res) => {
  try {
    const { batch_no, password } = req.body;

    const conductor = await Conductor.findOne({ batch_no, isDeleted: { $ne: true } });
    if (!conductor) {
      return res.status(404).json({ message: "Conductor not found or account is deactivated" });
    }

    const isMatch = await bcrypt.compare(password, conductor.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: conductor._id, batch_no: conductor.batch_no, type: conductor.type },
      process.env.JWT_SECRET || "secretkey",
      { expiresIn: "1d" }
    );

    res.json({ message: "Login successful", token });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Get All Conductors
export const getConductors = async (req, res) => {
  try {
    const conductors = await Conductor.find({ isDeleted: { $ne: true } }).select("-password");
    res.json(conductors);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get Single Conductor by ID
export const getConductorById = async (req, res) => {
  try {
    const conductor = await Conductor.findById(req.params.id).select(
      "-password"
    );
    if (!conductor)
      return res.status(404).json({ message: "Conductor not found" });
    res.json(conductor);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update Conductor
export const updateConductor = async (req, res) => {
  try {
    const { name, password, type, phone_no } = req.body;
    let updatedData = { name, type, phone_no };

    if (phone_no) {
      const existingConductorPhone = await Conductor.findOne({
        phone_no,
        _id: { $ne: req.params.id },
        isDeleted: { $ne: true }
      });
      const existingDriverPhone = await Driver.findOne({
        phone_no,
        isDeleted: { $ne: true }
      });
      if (existingConductorPhone || existingDriverPhone) {
        return res.status(400).json({ message: "Phone number already registered with a conductor or driver" });
      }
    }

    if (password) {
      updatedData.password = await bcrypt.hash(password, 10);
    }

    const conductor = await Conductor.findByIdAndUpdate(
      req.params.id,
      updatedData,
      { new: true }
    ).select("-password");

    if (!conductor)
      return res.status(404).json({ message: "Conductor not found" });
    res.json({ message: "Conductor updated", conductor });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Delete Conductor
export const deleteConductor = async (req, res) => {
  try {
    const conductor = await Conductor.findById(req.params.id);
    if (!conductor) {
      return res.status(404).json({ message: "Conductor not found" });
    }

    if (conductor.isDeleted) {
      return res.status(400).json({ message: "Conductor is already deleted" });
    }

    // Step 1: Soft-delete the conductor profile
    conductor.isDeleted = true;
    conductor.batch_no = `${conductor.batch_no}_deleted_${Date.now()}`;
    await conductor.save();

    // Step 2: Deactivate their active bus assignment (frees the bus and driver)
    await ConductorBus.updateMany(
      { conductorId: conductor._id, isActive: true },
      { isActive: false }
    );

    // Step 3: Soft-delete their shift assignments (frees the shift slot)
    await ShiftAssignment.updateMany(
      { personId: conductor._id, personType: "Conductor", isDeleted: { $ne: true } },
      { isDeleted: true }
    );

    res.json({ message: "Conductor deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
