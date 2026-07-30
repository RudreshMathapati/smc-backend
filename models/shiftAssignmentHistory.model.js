import mongoose from "mongoose";

const shiftAssignmentHistorySchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
    },
    shift: {
      type: String,
      enum: ["Morning", "Evening", "General"],
      required: true,
    },
    assignments: [
      {
        personId: {
          type: mongoose.Schema.Types.ObjectId,
          required: true,
        },
        personType: {
          type: String,
          enum: ["Conductor", "Driver"],
          required: true,
        },
        batch_no: {
          type: String,
          required: true,
        },
        name: {
          type: String,
          required: true,
        },
        assignedAt: {
          type: Date, // original createdAt from ShiftAssignment
        },
      },
    ],
    totalCount: {
      type: Number,
      required: true,
    },
    resetAt: {
      type: Date,
      required: true,
    },
  },
  {
    collection: "shiftassignmenthistory",
    timestamps: false, // we handle our own timestamps (resetAt, date)
  }
);

// Index to quickly query history by date + shift
shiftAssignmentHistorySchema.index({ shift: 1, date: -1 });

const ShiftAssignmentHistory = mongoose.model(
  "ShiftAssignmentHistory",
  shiftAssignmentHistorySchema
);

export default ShiftAssignmentHistory;
