import mongoose from "mongoose";

const posMachineSchema = new mongoose.Schema(
  {
    posName: {
      type: String,
      required: true,
      unique: true, // SMT-ETM-012 must be unique
    },
    deviceId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    model: {
      type: String,
      required: true,
      trim: true,
    },
    vendor: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const PosMachine = mongoose.model("PosMachine", posMachineSchema);

export default PosMachine;