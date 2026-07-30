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
      enum: ["Petrol", "EV", "Diesel", "Hybrid"],
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
    chassisNumber: {
      type: String,
    },
    makersName: {
      type: String,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true, collection: "buses" }
);
const Bus = mongoose.model("Bus", busSchema);
export default Bus;
