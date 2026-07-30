import mongoose from "mongoose";

const busBreakdownSchema = new mongoose.Schema(
  {
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
    busId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bus",
      required: true,
    },
    busNumber: {
      type: String,
      required: true,
    },
    breakdownDate: {
      type: String, // "YYYY-MM-DD"
      required: true,
    },
    startTime: {
      type: Date,
      required: true,
      default: Date.now,
    },
    endTime: {
      type: Date,
      default: null,
    },
    durationMinutes: {
      type: Number,
      default: 0,
    },
    breakdownType: {
      type: String,
      required: true,
      default: "Other Breakdown",
    },
    isEmergency: {
      type: Boolean,
      default: false,
    },
    issueDescription: {
      type: String,
      required: false,
      default: "",
    },
    status: {
      type: String,
      enum: ["Open", "Resolved"],
      default: "Open",
    },
    adminNote: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
    collection: "bus_breakdowns",
  }
);

const BusBreakdown = mongoose.model("BusBreakdown", busBreakdownSchema);
export default BusBreakdown;
