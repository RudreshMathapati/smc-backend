import Bus from "../models/bus.model.js";

// @access  Admin

// Add bus
export const addBus = async (req, res) => {
  try {
    const { busNumber, type, capacity, registrationNumber, status } = req.body;

    // Validate input
    if (!busNumber || !type || !capacity || !registrationNumber || !status) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const newBus = new Bus({
      busNumber,
      type,
      capacity,
      registrationNumber,
      status,
    });

    await newBus.save();
    res.status(201).json({ message: "Bus added successfully", bus: newBus });
  } catch (error) {
    console.error("Error adding bus:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get all buses
export const getAllBuses = async (req, res) => {
  try {
    const allBuses = await Bus.find();
    res.status(200).json(allBuses);
  } catch (error) {
    console.error("Error fetching buses:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

// Delete a bus
export const deleteBus = async (req, res) => {
  try {
    const bus = await Bus.findById(req.params.id);
    if (!bus) {
      return res.status(404).json({ message: "Bus not found" });
    }

    await bus.deleteOne();
    res.status(200).json({ message: "Bus deleted successfully" });
  } catch (error) {
    console.error("Error deleting bus:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Optional: Update a bus
export const updateBus = async (req, res) => {
  try {
    const { busNumber, type, capacity, registrationNumber, status } = req.body;

    const updatedBus = await Bus.findByIdAndUpdate(
      req.params.id,
      { busNumber, type, capacity, registrationNumber, status },
      { new: true }
    );

    if (!updatedBus) {
      return res.status(404).json({ message: "Bus not found" });
    }

    res
      .status(200)
      .json({ message: "Bus updated successfully", bus: updatedBus });
  } catch (error) {
    console.error("Error updating bus:", error);
    res.status(500).json({ message: "Server error" });
  }
};
