import ShiftAssignment from "../models/shiftAssignment.model.js";
import ShiftAssignmentHistory from "../models/shiftAssignmentHistory.model.js";
import ConductorBus from "../models/ConductorBus.model.js";
import Conductor from "../models/conductors.model.js";
import Driver from "../models/drivers.model.js";

// ─────────────────────────────────────────────
// POST /api/shifts
// Assign a conductor or driver to a shift (single)
// ─────────────────────────────────────────────
export const assignShift = async (req, res) => {
  try {
    const { personId, personType, shift } = req.body;

    if (!personId || !personType || !shift) {
      return res
        .status(400)
        .json({ message: "personId, personType, and shift are required" });
    }

    if (!["Conductor", "Driver"].includes(personType)) {
      return res
        .status(400)
        .json({ message: "personType must be 'Conductor' or 'Driver'" });
    }

    if (!["Morning", "Evening", "General"].includes(shift)) {
      return res
        .status(400)
        .json({ message: "shift must be 'Morning', 'Evening', or 'General'" });
    }

    // Verify the person exists in the DB and is active
    let person;
    if (personType === "Conductor") {
      person = await Conductor.findOne({ _id: personId, isDeleted: { $ne: true } }).select("name batch_no");
    } else {
      person = await Driver.findOne({ _id: personId, isDeleted: { $ne: true } }).select("name batch_no");
    }

    if (!person) {
      return res.status(404).json({ message: `${personType} not found` });
    }

    const assignment = new ShiftAssignment({
      personId,
      personType,
      batch_no: person.batch_no,
      name: person.name,
      shift,
    });

    await assignment.save();

    res
      .status(201)
      .json({ message: "Shift assigned successfully", data: assignment });
  } catch (error) {
    // Mongoose duplicate key on { personId, shift } unique index
    if (error.code === 11000) {
      return res
        .status(400)
        .json({ message: "This person is already assigned to this shift" });
    }
    console.error("Error assigning shift:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ─────────────────────────────────────────────
// POST /api/shifts/bulk
// Bulk-assign multiple conductors and/or drivers to a shift
// Body: { shift: "Morning", conductorIds: [...], driverIds: [...] }
// ─────────────────────────────────────────────
export const bulkAssignShift = async (req, res) => {
  try {
    const { shift, conductorIds = [], driverIds = [] } = req.body;

    if (!shift || !["Morning", "Evening", "General"].includes(shift)) {
      return res.status(400).json({ message: "Valid shift (Morning, Evening, or General) is required" });
    }

    if (conductorIds.length === 0 && driverIds.length === 0) {
      return res.status(400).json({ message: "Select at least one conductor or driver" });
    }

    // Fetch all selected conductors and drivers in parallel
    const [selectedConductors, selectedDrivers] = await Promise.all([
      conductorIds.length > 0
        ? Conductor.find({ _id: { $in: conductorIds }, isDeleted: { $ne: true } }).select("name batch_no")
        : Promise.resolve([]),
      driverIds.length > 0
        ? Driver.find({ _id: { $in: driverIds }, isDeleted: { $ne: true } }).select("name batch_no")
        : Promise.resolve([]),
    ]);

    // Build docs to insert
    const docs = [
      ...selectedConductors.map((c) => ({
        personId: c._id,
        personType: "Conductor",
        batch_no: c.batch_no,
        name: c.name,
        shift,
      })),
      ...selectedDrivers.map((d) => ({
        personId: d._id,
        personType: "Driver",
        batch_no: d.batch_no,
        name: d.name,
        shift,
      })),
    ];

    if (docs.length === 0) {
      return res.status(404).json({ message: "None of the selected people were found" });
    }

    // insertMany with ordered: false — continues on duplicates instead of stopping
    const result = await ShiftAssignment.insertMany(docs, { ordered: false });

    const skipped = docs.length - result.length;
    const message =
      skipped > 0
        ? `${result.length} assigned successfully. ${skipped} were already in this shift and skipped.`
        : `${result.length} staff assigned to ${shift} shift successfully`;

    res.status(201).json({ message, inserted: result.length, skipped });
  } catch (error) {
    // Handle partial success from insertMany with ordered:false
    if (error.name === "BulkWriteError" || error.code === 11000) {
      const inserted = error.result?.nInserted ?? 0;
      return res.status(207).json({
        message: `Partial success: ${inserted} assigned. Some were already in this shift.`,
        inserted,
      });
    }
    console.error("Error bulk assigning shifts:", error);
    res.status(500).json({ message: "Server error" });
  }
};


// ─────────────────────────────────────────────
// GET /api/shifts?shift=Morning
// Get all shift assignments, optionally filtered by shift
// ─────────────────────────────────────────────
export const getShiftAssignments = async (req, res) => {
  try {
    const { shift } = req.query;
    const filter = shift ? { shift, isDeleted: { $ne: true } } : { isDeleted: { $ne: true } };

    const assignments = await ShiftAssignment.find(filter).sort({
      shift: 1,
      personType: 1,
      name: 1,
    });

    res.status(200).json(assignments);
  } catch (error) {
    console.error("Error fetching shift assignments:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ─────────────────────────────────────────────
// GET /api/shifts/available?shift=Morning
// Returns conductors + drivers assigned to a shift
// who do NOT currently have an active bus assignment
// ─────────────────────────────────────────────
export const getAvailableForShift = async (req, res) => {
  try {
    const { shift } = req.query;

    if (!shift || !["Morning", "Evening", "General"].includes(shift)) {
      return res
        .status(400)
        .json({ message: "Query param 'shift' must be 'Morning', 'Evening', or 'General'" });
    }

    // 1. All people assigned to this shift (exclude soft-deleted entries)
    const shiftAssignments = await ShiftAssignment.find({ shift, isDeleted: { $ne: true } });

    // 2. Active bus assignments for today in the CURRENT shift only
    //    (a person already on a bus in this shift is truly "busy" for this shift)
    const todayStr = new Date().toISOString().split("T")[0];
    const activeBusAssignments = await ConductorBus.find({
      assignedDate: todayStr,
      shift,
      isActive: true,
    });

    // Build sets of IDs that are busy in the CURRENT shift
    const busyConductorIds = new Set(
      activeBusAssignments
        .map((a) => a.conductorId?.toString())
        .filter(Boolean)
    );
    const busyDriverIds = new Set(
      activeBusAssignments
        .map((a) => a.driverId?.toString())
        .filter(Boolean)
    );

    // 3. Filter: in the shift AND not currently assigned to a bus in this shift
    const conductors = shiftAssignments
      .filter(
        (a) =>
          a.personType === "Conductor" &&
          !busyConductorIds.has(a.personId.toString())
      )
      .map((a) => ({
        _id: a.personId,
        name: a.name,
        batch_no: a.batch_no,
        shiftAssignmentId: a._id,
      }));

    const drivers = shiftAssignments
      .filter(
        (a) =>
          a.personType === "Driver" &&
          !busyDriverIds.has(a.personId.toString())
      )
      .map((a) => ({
        _id: a.personId,
        name: a.name,
        batch_no: a.batch_no,
        shiftAssignmentId: a._id,
      }));

    res.status(200).json({ conductors, drivers });
  } catch (error) {
    console.error("Error fetching available staff for shift:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ─────────────────────────────────────────────
// DELETE /api/shifts/:id
// Remove a person from a shift
// ─────────────────────────────────────────────
export const removeShiftAssignment = async (req, res) => {
  try {
    const { id } = req.params;

    const assignment = await ShiftAssignment.findById(id);

    if (!assignment) {
      return res
        .status(404)
        .json({ message: "Shift assignment not found" });
    }

    // Soft delete — preserve for audit trail / history
    assignment.isDeleted = true;
    await assignment.save();

    res
      .status(200)
      .json({ message: "Removed from shift successfully", data: assignment });
  } catch (error) {
    console.error("Error removing shift assignment:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ─────────────────────────────────────────────
// DELETE /api/shifts/reset/:shift
// Archive ALL assignments for a shift to history, then clear them
// This preserves a dated record before the admin starts fresh
// ─────────────────────────────────────────────
export const resetShift = async (req, res) => {
  try {
    const { shift } = req.params;

    if (!["Morning", "Evening", "General"].includes(shift)) {
      return res
        .status(400)
        .json({ message: "shift must be 'Morning', 'Evening', or 'General'" });
    }

    // 1. Read all active assignments for this shift
    const activeAssignments = await ShiftAssignment.find({ shift, isDeleted: { $ne: true } });

    if (activeAssignments.length === 0) {
      return res
        .status(400)
        .json({ message: `No active assignments found for ${shift} shift` });
    }

    const now = new Date();

    // Normalize date to midnight UTC for the date field (for easy daily querying)
    const dateOnly = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    );

    // 2. Build the history snapshot
    const historyDoc = new ShiftAssignmentHistory({
      date: dateOnly,
      shift,
      assignments: activeAssignments.map((a) => ({
        personId: a.personId,
        personType: a.personType,
        batch_no: a.batch_no,
        name: a.name,
        assignedAt: a.createdAt,
      })),
      totalCount: activeAssignments.length,
      resetAt: now,
    });

    // 3. Save history first — if this fails, do NOT delete active assignments
    await historyDoc.save();

    // 4. Soft-delete all active assignments for this shift (preserves history in DB)
    await ShiftAssignment.updateMany({ shift, isDeleted: { $ne: true } }, { $set: { isDeleted: true } });

    res.status(200).json({
      message: `${shift} shift archived and cleared successfully`,
      archived: activeAssignments.length,
      shift,
      date: dateOnly,
      historyId: historyDoc._id,
    });
  } catch (error) {
    console.error("Error resetting shift:", error);
    res.status(500).json({ message: "Server error" });
  }
};
