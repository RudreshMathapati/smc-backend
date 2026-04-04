import mongoose from "mongoose";

const busPOSSchema = new mongoose.Schema(
  {
    bus: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bus",
      required: true,
      unique: true, // One bus can have only one POS
    },
    posMachine: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PosMachine",
      required: true,
      unique: true, // One POS can be assigned to only one bus
    },
    assignedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const BusPOS =  mongoose.model("BusPOS", busPOSSchema);
export default BusPOS;
