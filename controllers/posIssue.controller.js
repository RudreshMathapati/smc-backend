import PosIssue from "../models/posIssue.model.js";
import ConductorBus from "../models/ConductorBus.model.js";
import BusPOS from "../models/busPosMapping.model.js";
import Bus from "../models/bus.model.js";
import PosMachine from "../models/posMachine.model.js";
import Conductor from "../models/conductors.model.js";

/**
 * POST /api/pos-issues/raise
 * Conductor raises a new POS issue.
 * Conductor identity + bus + POS are resolved automatically from the token and DB mappings.
 */
export const raiseIssue = async (req, res) => {
  try {
    const conductor = req.conductor; // set by conductorProtect middleware
    const { issueType, description } = req.body;

    // Validate input
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

    if (!description || description.trim().length < 5) {
      return res.status(400).json({
        message: "Description must be at least 5 characters.",
      });
    }

    // 1. Find the active bus assignment for this conductor
    const assignment = await ConductorBus.findOne({
      conductorId: conductor._id,
      isActive: true,
    }).populate("busId");

    if (!assignment || !assignment.busId) {
      return res.status(404).json({
        message:
          "No active bus assignment found for your account. Please contact admin.",
      });
    }

    // 2. Find the POS machine mapped to that bus
    const busPos = await BusPOS.findOne({
      bus: assignment.busId._id,
    }).populate("posMachine");

    if (!busPos || !busPos.posMachine) {
      return res.status(404).json({
        message:
          "No POS machine mapped to your assigned bus. Please contact admin.",
      });
    }

    // 3. Create the issue
    const pos = busPos.posMachine;
    const resolvedPosName =
      pos.posName && pos.posName !== "undefined"
        ? pos.posName
        : pos.deviceId || "Unknown POS";

    const issue = await PosIssue.create({
      conductorId: conductor._id,
      conductorName: conductor.name,
      batch_no: conductor.batch_no,
      busId: assignment.busId._id,
      busNumber: assignment.busId.busNumber,
      posMachineId: pos._id,
      posName: resolvedPosName,
      issueType,
      description: description.trim(),
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
 * Returns all issues raised by the currently logged-in conductor.
 */
export const getMyIssues = async (req, res) => {
  try {
    const conductor = req.conductor;

    const issues = await PosIssue.find({
      conductorId: conductor._id,
    }).sort({ createdAt: -1 }); // newest first

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
 * Admin: Returns all issues with optional filters.
 * Query params: status, conductorId, busNumber, startDate, endDate
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
 * Admin: Update the status of an issue and optionally add a note.
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
