import StopMaster from "../models/stopMaster.model.js";

// Create a new stop master entry
export const createStop = async (req, res) => {
  try {
    const { name, latitude, longitude } = req.body;

    if (!name?.trim() || !latitude?.trim() || !longitude?.trim()) {
      return res.status(400).json({ message: "Stop name, latitude, and longitude are required" });
    }

    // Check for duplicate name
    const existing = await StopMaster.findOne({ name: name.trim() });
    if (existing) {
      return res.status(400).json({ message: "Stop name already exists" });
    }

    const newStop = new StopMaster({
      name: name.trim(),
      latitude: latitude.trim(),
      longitude: longitude.trim(),
    });
    await newStop.save();

    res.status(201).json({ message: "Stop created", data: newStop });
  } catch (error) {
    console.error("Error creating stop:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get all stops
export const getAllStops = async (req, res) => {
  try {
    const stops = await StopMaster.find().sort({ name: 1 });
    res.status(200).json(stops);
  } catch (error) {
    console.error("Error fetching stops:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Update a stop
export const updateStop = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, latitude, longitude } = req.body;

    if (!name?.trim() || !latitude?.trim() || !longitude?.trim()) {
      return res.status(400).json({ message: "Stop name, latitude, and longitude are required" });
    }

    // Check for duplicate name (exclude current record)
    const duplicate = await StopMaster.findOne({ name: name.trim(), _id: { $ne: id } });
    if (duplicate) {
      return res.status(400).json({ message: "Stop name already exists" });
    }

    const updated = await StopMaster.findByIdAndUpdate(
      id,
      { name: name.trim(), latitude: latitude.trim(), longitude: longitude.trim() },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Stop not found" });
    }

    res.status(200).json({ message: "Stop updated", data: updated });
  } catch (error) {
    console.error("Error updating stop:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Delete a stop
export const deleteStop = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await StopMaster.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ message: "Stop not found" });
    }

    res.status(200).json({ message: "Stop deleted", data: deleted });
  } catch (error) {
    console.error("Error deleting stop:", error);
    res.status(500).json({ message: "Server error" });
  }
};
