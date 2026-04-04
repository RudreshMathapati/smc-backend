import stopPrice from "../models/stopPrice.model.js";

// ✅ Create a new stop/price entry
export const createStopPrice = async (req, res) => {
  try {
    const stop = new stopPrice(req.body);
    await stop.save();
    res.status(201).json(stop);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// ✅ Get all stops with prices
export const getAllStopPrices = async (req, res) => {
  try {
    const stops = await stopPrice.find();
    res.status(200).json(stops);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✅ Get stop/price by ID
export const getStopPriceById = async (req, res) => {
  try {
    const stop = await stopPrice.findById(req.params.id);
    if (!stop) return res.status(404).json({ message: "Stop not found" });
    res.status(200).json(stop);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✅ Update stop/price by ID
export const updateStopPrice = async (req, res) => {
  try {
    const stop = await stopPrice.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!stop) return res.status(404).json({ message: "Stop not found" });
    res.status(200).json(stop);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// ✅ Delete stop/price by ID
export const deleteStopPrice = async (req, res) => {
  try {
    const stop = await stopPrice.findByIdAndDelete(req.params.id);
    if (!stop) return res.status(404).json({ message: "Stop not found" });
    res.status(200).json({ message: "Stop deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
