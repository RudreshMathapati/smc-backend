import mongoose from "mongoose";

const conductorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    batch_no: { type: String, required: true, unique: true },
    password: { type: String, required: true },

    // New dropdown field
    type: {
      type: String,
      enum: ["Permanent", "Temporary"], // dropdown options
      required: true,
      default: "Temporary", // default if not selected
    },
  },
  { collection: "Conductor" }
);

const Conductor = mongoose.model("Conductor", conductorSchema);

export default Conductor;
