import mongoose from "mongoose";

const passSchema = new mongoose.Schema(
  {
    passName: {
      type: String,
      required: true,
      enum: ["Student Pass", "Citizen Pass", "Company Pass", "Half Ticket"], // acts like dropdown restriction
    },
    concession: {
      type: Number, // now always a number
      required: true,
      min: 0,
      max: 100, // concession is a percentage (0–100)
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true }
);

const Pass = mongoose.model("Pass", passSchema);

export default Pass;
