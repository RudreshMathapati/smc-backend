import mongoose from "mongoose";

const cashierCollectionSchema = new mongoose.Schema(
  {
    // Conductor Info
    conductorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conductor",
      required: true,
    },
    conductorName: {
      type: String,
      required: true,
      trim: true,
    },
    batch_no: {
      type: String,
      required: true,
      trim: true,
    },

    // Collection Details
    collectedAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    // Date of collection (YYYY-MM-DD) — the calendar date the cashier records this
    collectionDate: {
      type: String,
      required: true,
    },

    // The admin/cashier who recorded this collection
    collectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    collectedByName: {
      type: String,
      default: "Admin",
    },

    // Optional notes
    notes: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
    collection: "cashier_collections",
  }
);

const CashierCollection = mongoose.model(
  "CashierCollection",
  cashierCollectionSchema
);

export default CashierCollection;
