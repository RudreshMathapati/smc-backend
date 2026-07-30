import BusBreakdown from "../models/busBreakdown.model.js";
// adminNote is stored on the model via updateBreakdownStatus
import ConductorBus from "../models/ConductorBus.model.js";

// POST /api/bus-breakdowns/report  (conductor protected)
export const reportBreakdown = async (req, res) => {
  try {
    const conductor = req.conductor; // set by conductorProtect middleware
    const { issueDescription, breakdownType } = req.body;
    const type = breakdownType?.trim() || "Other Breakdown";
    const isEmergency = type === "Accident / Collision";

    const dt = new Date();
    const istDate = new Date(dt.getTime() + 5.5 * 60 * 60 * 1000);
    const todayStr =
      `${istDate.getUTCFullYear()}-` +
      `${String(istDate.getUTCMonth() + 1).padStart(2, "0")}-` +
      `${String(istDate.getUTCDate()).padStart(2, "0")}`;

    // Resolve active bus assignment from conductor for today
    let assignment = await ConductorBus.findOne({
      $or: [{ conductorId: conductor._id }, { batch_no: String(conductor.batch_no) }],
      assignedDate: todayStr,
      isActive: true,
    });

    if (!assignment) {
      assignment = await ConductorBus.findOne({
        $or: [{ conductorId: conductor._id }, { batch_no: String(conductor.batch_no) }],
        isActive: true,
      });
    }

    if (!assignment) {
      return res.status(404).json({
        message: "No active bus assignment found for your account today. Please contact admin.",
      });
    }

    const today = todayStr;

    const newBreakdown = new BusBreakdown({
      conductorId: conductor._id,
      conductorName: conductor.name,
      batch_no: conductor.batch_no,
      busId: assignment.busId,
      busNumber: assignment.assignedbusNumber,
      breakdownDate: today,
      breakdownType: type,
      isEmergency: isEmergency,
      issueDescription: (issueDescription || "").trim(),
      status: "Open",
    });

    await newBreakdown.save();

    res.status(201).json({
      success: true,
      message: "Bus breakdown reported successfully.",
      breakdown: newBreakdown,
    });
  } catch (err) {
    console.error("Report breakdown error:", err);
    res.status(500).json({ message: "Internal server error." });
  }
};

// PATCH /api/bus-breakdowns/:id/resolve  (conductor protected)
export const resolveBreakdown = async (req, res) => {
  try {
    const conductor = req.conductor;
    const { id } = req.params;

    const breakdown = await BusBreakdown.findById(id);
    if (!breakdown) {
      return res.status(404).json({ message: "Breakdown record not found." });
    }

    // Ensure conductor can only resolve their own breakdowns
    if (breakdown.conductorId.toString() !== conductor._id.toString()) {
      return res.status(403).json({ message: "You can only resolve your own breakdown reports." });
    }

    if (breakdown.status === "Resolved") {
      return res.status(400).json({ message: "This breakdown is already resolved." });
    }

    const resolvedEnd = new Date();
    const durationMs = resolvedEnd - new Date(breakdown.startTime);
    const durationMinutes = Math.max(0, Math.round(durationMs / (1000 * 60)));

    breakdown.endTime = resolvedEnd;
    breakdown.durationMinutes = durationMinutes;
    breakdown.status = "Resolved";

    await breakdown.save();

    res.status(200).json({
      success: true,
      message: "Breakdown resolved successfully.",
      breakdown,
    });
  } catch (err) {
    console.error("Resolve breakdown error:", err);
    res.status(500).json({ message: "Internal server error." });
  }
};

// GET /api/bus-breakdowns/my  (conductor protected)
export const getMyBreakdowns = async (req, res) => {
  try {
    const conductor = req.conductor;

    const breakdowns = await BusBreakdown.find({ conductorId: conductor._id })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: breakdowns.length,
      breakdowns,
    });
  } catch (err) {
    console.error("Get my breakdowns error:", err);
    res.status(500).json({ message: "Internal server error." });
  }
};

// GET /api/bus-breakdowns/date?date=YYYY-MM-DD  (admin route, no auth guard)
export const getBreakdownsForDate = async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ message: "Date parameter is required" });
    }

    const breakdowns = await BusBreakdown.find({ breakdownDate: date }).populate(
      "conductorId",
      "name batch_no"
    );

    res.status(200).json(breakdowns);
  } catch (err) {
    console.error("Get breakdowns error:", err);
    res.status(500).json({ message: "Internal server error." });
  }
};

// GET /api/bus-breakdowns/all  (admin: all breakdowns with optional filters)
export const getAllBreakdowns = async (req, res) => {
  try {
    const { status, batch_no, busNumber, breakdownType, isEmergency, startDate, endDate } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (batch_no) filter.batch_no = batch_no;
    if (busNumber) filter.busNumber = { $regex: busNumber, $options: "i" };
    if (breakdownType) filter.breakdownType = breakdownType;
    if (isEmergency !== undefined && isEmergency !== "") {
      filter.isEmergency = isEmergency === "true";
    }
    if (startDate || endDate) {
      filter.breakdownDate = {};
      if (startDate) filter.breakdownDate.$gte = startDate;
      if (endDate) filter.breakdownDate.$lte = endDate;
    }

    const breakdowns = await BusBreakdown.find(filter)
      .sort({ createdAt: -1 })
      .populate("conductorId", "name batch_no phone_no");

    res.status(200).json({
      success: true,
      count: breakdowns.length,
      breakdowns,
    });
  } catch (err) {
    console.error("Get all breakdowns error:", err);
    res.status(500).json({ message: "Internal server error." });
  }
};

// PATCH /api/bus-breakdowns/:id/status  (admin: update status + adminNote)
export const updateBreakdownStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNote } = req.body;

    const validStatuses = ["Open", "Resolved"];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status. Must be Open or Resolved." });
    }

    const updateData = { status };
    if (adminNote !== undefined) updateData.adminNote = adminNote;
    if (status === "Resolved" && !updateData.endTime) {
      const now = new Date();
      updateData.endTime = now;
    }

    const breakdown = await BusBreakdown.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!breakdown) {
      return res.status(404).json({ message: "Breakdown record not found." });
    }

    res.status(200).json({
      success: true,
      message: `Breakdown status updated to "${status}".`,
      breakdown,
    });
  } catch (err) {
    console.error("Update breakdown status error:", err);
    res.status(500).json({ message: "Internal server error." });
  }
};
