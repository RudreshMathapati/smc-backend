import mongoose from "mongoose";

const routeMasterSchema = new mongoose.Schema(
  {
    source: { type: String, required: true, trim: true },
    destination: { type: String, required: true, trim: true },
    routeId: { type: String, required: true, unique: true, trim: true },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { collection: "RouteMaster", timestamps: true }
);

const RouteMaster = mongoose.model("RouteMaster", routeMasterSchema);

export default RouteMaster;
