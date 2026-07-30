import PosIssue from "../models/posIssue.model.js";
import ConductorBus from "../models/ConductorBus.model.js";
import BusPOS from "../models/busPosMapping.model.js";
import Bus from "../models/bus.model.js";
import PosMachine from "../models/posMachine.model.js";

/**
 * POST /api/pos-issues/raise
 * Conductor raises a new POS issue.
 */
export const raiseIssue = async (req, res) => {
  try {
    const conductor = req.conductor; // set by conductorProtect middleware
    const { issueType, description } = req.body;

    const validIssueTypes = [
      "POS Not Turning On",
      "Battery Issue",
      "Printer Problem",
      "Network Issue",
      "Other Issue",
    ];

    if (!issueType || !validIssueTypes.includes(issueType)) {
      return res.status(400).json({
        message: "Invalid issue type. Please select a valid POS problem.",
      });
    }

    const dt = new Date();
    const istDate = new Date(dt.getTime() + 5.5 * 60 * 60 * 1000);
    const todayStr =
      `${istDate.getUTCFullYear()}-` +
      `${String(istDate.getUTCMonth() + 1).padStart(2, "0")}-` +
      `${String(istDate.getUTCDate()).padStart(2, "0")}`;

    // Find active bus assignment for today
    let assignment = await ConductorBus.findOne({
      $or: [{ conductorId: conductor._id }, { batch_no: String(conductor.batch_no) }],
      assignedDate: todayStr,
      isActive: true,
    }).populate("busId");

    if (!assignment || !assignment.busId) {
      assignment = await ConductorBus.findOne({
        $or: [{ conductorId: conductor._id }, { batch_no: String(conductor.batch_no) }],
        isActive: true,
      }).populate("busId");
    }

    if (!assignment || !assignment.busId) {
      return res.status(404).json({
        message: "No active bus assignment found for your account. Please contact admin.",
      });
    }

    // Resolve POS machine
    let posMachine = null;
    const busPos = await BusPOS.findOne({ bus: assignment.busId._id }).populate("posMachine");
    if (busPos && busPos.posMachine) {
      posMachine = busPos.posMachine;
    } else {
      const posDoc = await PosMachine.findOne({ isDeleted: { $ne: true } });
      posMachine = posDoc || { _id: assignment.busId._id, posName: "POS Device", deviceId: "UNKNOWN" };
    }

    const resolvedPosName =
      posMachine.posName && posMachine.posName !== "undefined"
        ? posMachine.posName
        : posMachine.deviceId || "Unknown POS";

    const issue = await PosIssue.create({
      conductorId: conductor._id,
      conductorName: conductor.name,
      batch_no: conductor.batch_no,
      busId: assignment.busId._id,
      busNumber: assignment.assignedbusNumber || assignment.busId.busNumber,
      posMachineId: posMachine._id,
      posName: resolvedPosName,
      issueType,
      description: (description || "").trim(),
      status: "Open",
    });

    return res.status(201).json({
      success: true,
      message: "Issue raised successfully.",
      issue,
    });
  } catch (error) {
    console.error("❌ Raise Issue Error:", error.message);
    return res.status(500).json({ message: "Internal server error." });
  }
};

/**
 * GET /api/pos-issues/my
 */
export const getMyIssues = async (req, res) => {
  try {
    const conductor = req.conductor;

    const issues = await PosIssue.find({
      conductorId: conductor._id,
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: issues.length,
      issues,
    });
  } catch (error) {
    console.error("❌ Get My Issues Error:", error.message);
    return res.status(500).json({ message: "Internal server error." });
  }
};

/**
 * GET /api/pos-issues/all
 */
export const getAllIssues = async (req, res) => {
  try {
    const { status, batch_no, busNumber, startDate, endDate } = req.query;

    const filter = {};

    if (status) filter.status = status;
    if (batch_no) filter.batch_no = batch_no;
    if (busNumber) filter.busNumber = { $regex: busNumber, $options: "i" };
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    const issues = await PosIssue.find(filter)
      .sort({ createdAt: -1 })
      .populate("conductorId", "name batch_no phone_no")
      .populate("busId", "busNumber")
      .populate("posMachineId", "posName deviceId");

    return res.status(200).json({
      success: true,
      count: issues.length,
      issues,
    });
  } catch (error) {
    console.error("❌ Get All Issues Error:", error.message);
    return res.status(500).json({ message: "Internal server error." });
  }
};

/**
 * PATCH /api/pos-issues/:id/status
 */
export const updateIssueStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNote } = req.body;

    const validStatuses = ["Open", "In Progress", "Resolved"];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid status. Must be Open, In Progress, or Resolved.",
      });
    }

    const updateData = { status };
    if (adminNote !== undefined) updateData.adminNote = adminNote;
    if (status === "Resolved") updateData.resolvedAt = new Date();
    if (status !== "Resolved") updateData.resolvedAt = null;

    const issue = await PosIssue.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!issue) {
      return res.status(404).json({ message: "Issue not found." });
    }

    return res.status(200).json({
      success: true,
      message: `Issue status updated to "${status}".`,
      issue,
    });
  } catch (error) {
    console.error("❌ Update Issue Status Error:", error.message);
    return res.status(500).json({ message: "Internal server error." });
  }
};
