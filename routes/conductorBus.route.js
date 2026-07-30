import express from "express";
import ConductorBus from "../models/ConductorBus.model.js";

const router = express.Router();

// Assign bus to conductor and driver
router.post("/", async (req, res) => {
  try {
    const { busId, assignedbusNumber, conductorId, batch_no, driverId, driver_batch_no, assignedDate, shift, personalAmount } =
      req.body;

    if (!shift || !["Morning", "Evening", "General"].includes(shift)) {
      return res.status(400).json({ message: "A valid shift (Morning, Evening, or General) is required" });
    }

    if (personalAmount !== undefined) {
      const amt = Number(personalAmount);
      if (isNaN(amt) || amt < 0 || amt > 50) {
        return res.status(400).json({ message: "Personal amount must be a number between 0 and 50" });
      }
    }

    const busExists = await ConductorBus.findOne({
      busId,
      assignedDate,
      shift,
      isActive: true,
    });

    if (busExists) {
      return res.status(400).json({
        message: "This bus is already assigned to another conductor/driver in this shift",
      });
    }

    const conductorExists = await ConductorBus.findOne({
      conductorId,
      assignedDate,
      shift,
      isActive: true,
    });

    if (conductorExists) {
      return res.status(400).json({
        message: "This conductor already has a bus assigned in this shift",
      });
    }

    if (driverId) {
      const driverExists = await ConductorBus.findOne({
        driverId,
        assignedDate,
        shift,
        isActive: true,
      });

      if (driverExists) {
        return res.status(400).json({
          message: "This driver already has a bus assigned in this shift",
        });
      }
    }

    const newAssign = new ConductorBus({
      busId,
      assignedbusNumber,
      conductorId,
      batch_no,
      driverId,
      driver_batch_no,
      assignedDate,
      shift,
      personalAmount: personalAmount !== undefined ? Number(personalAmount) : 0,
    });

    await newAssign.save();

    res.json({ message: "Bus assigned successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Get all assignments
router.get("/", async (req, res) => {
  const data = await ConductorBus.find({ isActive: true })
    .populate("busId")
    .populate("conductorId")
    .populate("driverId");

  res.json(data);
});

// ✅ UPDATE assignment
router.put("/:id", async (req, res) => {
  try {
    const { busId, assignedbusNumber, conductorId, batch_no, driverId, driver_batch_no, shift, personalAmount } = req.body;

    if (personalAmount !== undefined) {
      const amt = Number(personalAmount);
      if (isNaN(amt) || amt < 0 || amt > 50) {
        return res.status(400).json({ message: "Personal amount must be a number between 0 and 50" });
      }
    }

    const updated = await ConductorBus.findByIdAndUpdate(
      req.params.id,
      {
        busId,
        assignedbusNumber,
        conductorId,
        batch_no,
        driverId,
        driver_batch_no,
        ...(shift && { shift }),
        ...(personalAmount !== undefined && { personalAmount: Number(personalAmount) }),
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
