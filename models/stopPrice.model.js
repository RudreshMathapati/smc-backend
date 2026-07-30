import mongoose from "mongoose";

const stopPriceSchema = new mongoose.Schema(
  {
    boardingStop: {
      type: String,
      required: true,
      trim: true,
    },
    destinationStop: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    busNumber: {
      type: String,
      required: true,
      trim: true,
    },
    // Soft delete — preserves fare history when a stop-price entry is removed
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true, collection: "stopprices" }
);

const stopPrice = mongoose.model("StopPrice", stopPriceSchema);

export default stopPrice;
