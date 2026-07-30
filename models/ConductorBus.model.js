import mongoose from "mongoose";

const conductorBusSchema = new mongoose.Schema(
  {
    busId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bus",
      required: true,
    },
    assignedbusNumber: {
      type: String,
      required: true,
    },
    conductorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conductor",
      required: true,
    },
    batch_no: {
      type: String,
      required: true,
    },
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
      required: false,
    },
    driver_batch_no: {
      type: String,
      required: false,
    },
    assignedDate: {
      type: String,
      required: true,
    },
    shift: {
      type: String,
      enum: ["Morning", "Evening", "General"],
      required: true,
      default: "Morning",
    },
    personalAmount: {
      type: Number,
      default: 0,
      min: 0,
      max: 50,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { 
    timestamps: true,
    collection: "conductor_bus" // ⭐ THIS LINE IS IMPORTANT
  }
);

const ConductorBus =
  mongoose.models.ConductorBus ||
  mongoose.model("ConductorBus", conductorBusSchema);

export default ConductorBus;