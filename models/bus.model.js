import mongoose from "mongoose";

const busSchema = new mongoose.Schema(
  {
    busNumber: {
      type: String,
      required: true,
      unique: true,
    },
    type: {
      type: String,
      enum: ["Petrol", "EV"],
      required: true,
    },
    capacity: {
      type: Number,
      required: true,
    },
    registrationNumber: {
      type: String,
      required: true,
      unique: true,
    },
    status: {
      type: String,
      enum: ["Active", "Under Maintenance", "Offline"],
      default: "Active",
    },
  },
  { timestamps: true }
);
const Bus = mongoose.model("Bus", busSchema);
export default Bus;
