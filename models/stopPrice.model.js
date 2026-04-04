import mongoose from "mongoose";

const BusSchema = new mongoose.Schema(
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
  },
  { timestamps: true },
  { collection: "stopPrices" }
);

const stopPrice = mongoose.model("StopPrice", BusSchema);

export default stopPrice;
