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
    assignedDate: {
      type: String,
      required: true,
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