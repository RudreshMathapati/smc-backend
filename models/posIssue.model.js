import mongoose from "mongoose";

const posIssueSchema = new mongoose.Schema(
  {
    // Conductor Info (auto-filled from token)
    conductorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conductor",
      required: true,
    },
    conductorName: {
      type: String,
      required: true,
    },
    batch_no: {
      type: String,
      required: true,
    },

    // Bus Info (auto-resolved from ConductorBus mapping)
    busId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bus",
      required: true,
    },
    busNumber: {
      type: String,
      required: true,
    },

    // POS Machine Info (auto-resolved from BusPOS mapping)
    posMachineId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PosMachine",
      required: true,
    },
    posName: {
      type: String,
      required: false,  // Not required — some devices may have posName missing in DB
      default: "Unknown POS",
    },

    // Issue Details
    issueType: {
      type: String,
      enum: [
        "POS Not Turning On",
        "Battery Issue",
        "Printer Problem",
        "Network Issue",
        "Other Issue",
      ],
      required: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },

    // Status Tracking
    status: {
      type: String,
      enum: ["Open", "In Progress", "Resolved"],
      default: "Open",
    },
    adminNote: {
      type: String,
      default: "",
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: "pos_issues",
  }
);

const PosIssue = mongoose.model("PosIssue", posIssueSchema);
export default PosIssue;
