// import mongoose from "mongoose";

// const busRouteSchema = new mongoose.Schema(
//   {
//     bus: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Bus",
//       required: [true, "Bus reference is required"],
//     },
//     route: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Route",
//       required: [true, "Route reference is required"],
//     },
//     assignmentType: {
//       type: String,
//       enum: ["Daily", "Weekly", "One-time"],
//       default: "Daily",
//     },
//     status: {
//       type: String,
//       enum: ["Active", "Inactive", "Pending"],
//       default: "Active",
//     },
//     assignedBy: {
//       type: String,
//       default: "System", // Can be updated to store admin user ID or name
//     },
//     remarks: {
//       type: String,
//       trim: true,
//       default: "",
//     },
//     assignedAt: {
//       type: Date,
//       default: Date.now,
//     },
//   },
//   {
//     timestamps: true,
//   }
// );

// const BusRoute = mongoose.model("BusRoute", busRouteSchema);
// export default BusRoute;




import mongoose from "mongoose";

const busRouteSchema = new mongoose.Schema(
  {
    bus: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bus",
      required: [true, "Bus reference is required"],
    },
    route: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Route",
      required: [true, "Route reference is required"],
    },
    timings: {
      type: [String], // Example: ["08:00 AM", "11:00 AM", "05:30 PM"]
      required: [true, "At least one timing is required"],
      validate: {
        validator: function (value) {
          return value.length > 0;
        },
        message: "At least one timing must be provided",
      },
    },
    status: {
      type: String,
      enum: ["Active", "Inactive", "Pending"],
      default: "Active",
    },
    assignedBy: {
      type: String,
      default: "System", // Can be admin ID or name
    },
    remarks: {
      type: String,
      trim: true,
      default: "",
    },
    assignedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Optional: Prevent assigning the same bus to the same route multiple times
busRouteSchema.index({ bus: 1, route: 1 }, { unique: true });

const BusRoute = mongoose.model("BusRoute", busRouteSchema);
export default BusRoute;
