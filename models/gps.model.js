// models/GPS.js
import mongoose from "mongoose";

const gpsSchema = new mongoose.Schema(
  {
    deviceId: {
      type: String,
      required: true,
      index: true, // helps to quickly query by deviceId
    },
    latitude: {
      type: Number,
      required: true,
    },
    longitude: {
      type: Number,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now, // in case device doesn’t send timestamp
      required: true,
    },
  },
  {
    collection: "gps", // ensures it maps to your `gps` collection
    timestamps: false, // don’t auto-add createdAt/updatedAt since you already have timestamp
  }
);

const GPS = mongoose.model("GPS", gpsSchema);

export default GPS;
