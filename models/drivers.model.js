import mongoose from "mongoose";

const driverSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    batch_no: { type: String, required: true, unique: true },
    type: {
      type: String,
      enum: ["Permanent", "Temporary"],
      required: true,
      default: "Temporary",
    },
    phone_no: { type: String },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { collection: "Drivers", timestamps: true }
);

const Driver = mongoose.model("Driver", driverSchema);

export default Driver;
