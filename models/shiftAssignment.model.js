import mongoose from "mongoose";

const shiftAssignmentSchema = new mongoose.Schema(
  {
    personId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "personType", // dynamic ref — resolves to "Conductor" or "Driver" model
    },
    personType: {
      type: String,
      enum: ["Conductor", "Driver"],
      required: true,
    },
    batch_no: {
      type: String,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    shift: {
      type: String,
      enum: ["Morning", "Evening", "General"],
      required: true,
    },
    // Soft delete — preserves shift history for audit trail
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    collection: "shiftassignments",
  }
);

// Compound unique index: one person can only be assigned to the same shift once
// (they CAN appear in Morning, Evening, AND General — that's allowed)
shiftAssignmentSchema.index(
  { personId: 1, shift: 1 },
  { 
    unique: true, 
    partialFilterExpression: { isDeleted: false } 
  }
);

const ShiftAssignment = mongoose.model("ShiftAssignment", shiftAssignmentSchema);

export default ShiftAssignment;
