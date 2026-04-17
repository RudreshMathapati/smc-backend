import mongoose from "mongoose";

const routeSchema = new mongoose.Schema(
  {
    source: {
      type: String,
      required: true,
    },
    destination: {
      type: String,
      required: true,
    },
    via: {
      type: String,
    },
    distance: {
      type: Number,
    },
    estimatedDuration: {
      type: Number,
    },
    routeId: {   // ✅ NEW FIELD
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },

    trips: [
      {
        sourceTime: {
          type: String,
          required: true,
        },
        destinationTime: {
          type: String,
          required: true,
        },

        stops: [
          {
            name: {
              type: String,
              required: true,
            },
            timingOffset: {
              type: String,
              required: true,
            },
            latitude: {
              type: String,
            },
            longitude: {
              type: String,
            },

            // ✅ NEW FIELD (IMPORTANT)
            stage: {
              type: Number,
              required: true,
            },

            sequence: {
              type: Number,
              required: true,
            },
          },
        ],
      },
    ],
  },
  {
    timestamps: true,
  }
);

const Route = mongoose.model("Route", routeSchema);

export default Route;