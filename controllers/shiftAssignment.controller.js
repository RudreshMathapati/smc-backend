import ShiftAssignment from "../models/shiftAssignment.model.js";
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

    if (!["Morning", "Evening"].includes(shift)) {
      return res
        .status(400)
        .json({ message: "shift must be 'Morning' or 'Evening'" });
    }

    // Verify the person exists in the DB
    let person;
    if (personType === "Conductor") {
      person = await Conductor.findById(personId).select("name batch_no");
    } else {
      person = await Driver.findById(personId).select("name batch_no");
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

    if (!shift || !["Morning", "Evening"].includes(shift)) {
      return res.status(400).json({ message: "Valid shift (Morning or Evening) is required" });
    }

    if (conductorIds.length === 0 && driverIds.length === 0) {
      return res.status(400).json({ message: "Select at least one conductor or driver" });
    }

    // Fetch all selected conductors and drivers in parallel
    const [selectedConductors, selectedDrivers] = await Promise.all([
      conductorIds.length > 0
        ? Conductor.find({ _id: { $in: conductorIds } }).select("name batch_no")
        : Promise.resolve([]),
      driverIds.length > 0
        ? Driver.find({ _id: { $in: driverIds } }).select("name batch_no")
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
    const filter = shift ? { shift } : {};

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

    if (!shift || !["Morning", "Evening"].includes(shift)) {
      return res
        .status(400)
        .json({ message: "Query param 'shift' must be 'Morning' or 'Evening'" });
    }

    // 1. All people assigned to this shift
    const shiftAssignments = await ShiftAssignment.find({ shift });

    // 2. All currently active bus assignments (conductor_bus where isActive=true)
    const activeBusAssignments = await ConductorBus.find({ isActive: true });

    // Build sets of IDs that are already busy
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

    // 3. Filter: in the shift AND not currently assigned to a bus
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

    const deleted = await ShiftAssignment.findByIdAndDelete(id);

    if (!deleted) {
      return res
        .status(404)
        .json({ message: "Shift assignment not found" });
    }

    res
      .status(200)
      .json({ message: "Removed from shift successfully", data: deleted });
  } catch (error) {
    console.error("Error removing shift assignment:", error);
    res.status(500).json({ message: "Server error" });
  }
};
