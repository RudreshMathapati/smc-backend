import Conductor from "../models/conductors.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// Register Conductor
export const registerConductor = async (req, res) => {
  try {
    const { name, batch_no, password, type } = req.body;

    // Check if conductor already exists
    const existingConductor = await Conductor.findOne({ batch_no });
    if (existingConductor) {
      return res.status(400).json({ message: "Batch No already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const newConductor = new Conductor({
      name,
      batch_no,
      password: hashedPassword,
      type, // save Permanent / Temporary
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

    const conductor = await Conductor.findOne({ batch_no });
    if (!conductor) {
      return res.status(404).json({ message: "Conductor not found" });
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
    const conductors = await Conductor.find().select("-password");
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
    const { name, password, type } = req.body;
    let updatedData = { name, type };

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
    const conductor = await Conductor.findByIdAndDelete(req.params.id);
    if (!conductor)
      return res.status(404).json({ message: "Conductor not found" });
    res.json({ message: "Conductor deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
