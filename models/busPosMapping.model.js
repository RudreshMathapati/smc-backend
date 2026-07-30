import mongoose from "mongoose";

const busPOSSchema = new mongoose.Schema(
  {
    bus: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bus",
      required: true,
    },
    posMachine: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PosMachine",
      required: true,
    },
    assignedAt: {
      type: Date,
      default: Date.now,
    },
    // Soft delete — preserves bus-POS mapping history
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true, collection: "buspos" }
);

const BusPOS = mongoose.model("BusPOS", busPOSSchema);
export default BusPOS;
