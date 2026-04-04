import express from "express";
import ConductorBus from "../models/ConductorBus.model.js";

const router = express.Router();

// Assign bus to conductor
router.post("/", async (req, res) => {
  try {
    const { busId, assignedbusNumber, conductorId, batch_no, assignedDate } =
      req.body;

    const busExists = await ConductorBus.findOne({
      busId,
      isActive: true,
    });

    if (busExists) {
      return res.status(400).json({
        message: "This bus is already assigned to another conductor",
      });
    }

    const conductorExists = await ConductorBus.findOne({
      conductorId,
      isActive: true,
    });

    if (conductorExists) {
      return res.status(400).json({
        message: "This conductor already has a bus assigned",
      });
    }

    const newAssign = new ConductorBus({
      busId,
      assignedbusNumber,
      conductorId,
      batch_no,
      assignedDate,
    });

    await newAssign.save();

    res.json({ message: "Bus assigned to conductor successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Get all assignments
router.get("/", async (req, res) => {
  const data = await ConductorBus.find({ isActive: true })
    .populate("busId")
    .populate("conductorId");

  res.json(data);
});

// ✅ UPDATE assignment
router.put("/:id", async (req, res) => {
  try {
    const { busId, assignedbusNumber, conductorId, batch_no } = req.body;

    const updated = await ConductorBus.findByIdAndUpdate(
      req.params.id,
      {
        busId,
        assignedbusNumber,
        conductorId,
        batch_no,
      },
      { new: true },
    );

    res.json({ message: "Assignment updated", updated });
  } catch (err) {
    res.status(500).json({ message: "Update failed" });
  }
});

// ✅ DELETE assignment (soft delete)
router.delete("/:id", async (req, res) => {
  try {
    await ConductorBus.findByIdAndUpdate(req.params.id, {
      isActive: false,
    });

    res.json({ message: "Assignment removed" });
  } catch (err) {
    res.status(500).json({ message: "Delete failed" });
  }
});

export default router;
