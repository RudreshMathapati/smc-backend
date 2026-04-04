import express from "express";
import {
  createStopPrice,
  getAllStopPrices,
  getStopPriceById,
  updateStopPrice,
  deleteStopPrice,
} from "../controllers/stopPrice.controller.js";

const router = express.Router();

// ✅ Create a new stop/price entry
router.post("/", createStopPrice);

// ✅ Get all stops
router.get("/", getAllStopPrices);

// ✅ Get stop by ID
router.get("/:id", getStopPriceById);

// ✅ Update stop by ID
router.put("/:id", updateStopPrice);

// ✅ Delete stop by ID
router.delete("/:id", deleteStopPrice);

export default router;
