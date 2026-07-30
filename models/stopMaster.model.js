import mongoose from "mongoose";

const stopMasterSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    latitude: { type: String, required: true, trim: true },
    longitude: { type: String, required: true, trim: true },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { collection: "StopMaster", timestamps: true }
);

const StopMaster = mongoose.model("StopMaster", stopMasterSchema);

export default StopMaster;
