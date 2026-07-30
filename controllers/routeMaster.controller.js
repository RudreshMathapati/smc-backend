import RouteMaster from "../models/routeMaster.model.js";

// Create a new route master entry
export const createRouteMaster = async (req, res) => {
  try {
    const { source, destination, routeId } = req.body;

    if (!source?.trim() || !destination?.trim() || !routeId?.trim()) {
      return res.status(400).json({ message: "Source, Destination, and Route ID are required" });
    }

    // Check for duplicate routeId
    const existing = await RouteMaster.findOne({ routeId: routeId.trim() });
    if (existing) {
      return res.status(400).json({ message: "Route ID already exists" });
    }

    const newEntry = new RouteMaster({
      source: source.trim(),
      destination: destination.trim(),
      routeId: routeId.trim(),
    });
    await newEntry.save();

    res.status(201).json({ message: "Route master entry created", data: newEntry });
  } catch (error) {
    console.error("Error creating route master entry:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get all route master entries
export const getAllRouteMasters = async (req, res) => {
  try {
    const entries = await RouteMaster.find({ isDeleted: { $ne: true } }).sort({ createdAt: -1 });
    res.status(200).json(entries);
  } catch (error) {
    console.error("Error fetching route master entries:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Update a route master entry
export const updateRouteMaster = async (req, res) => {
  try {
    const { id } = req.params;
    const { source, destination, routeId } = req.body;

    if (!source?.trim() || !destination?.trim() || !routeId?.trim()) {
      return res.status(400).json({ message: "Source, Destination, and Route ID are required" });
    }

    // Check for duplicate routeId (exclude current record)
    const duplicate = await RouteMaster.findOne({ routeId: routeId.trim(), _id: { $ne: id } });
    if (duplicate) {
      return res.status(400).json({ message: "Route ID already exists" });
    }

    const updated = await RouteMaster.findByIdAndUpdate(
      id,
      { source: source.trim(), destination: destination.trim(), routeId: routeId.trim() },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Route master entry not found" });
    }

    res.status(200).json({ message: "Route master entry updated", data: updated });
  } catch (error) {
    console.error("Error updating route master entry:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Delete a route master entry
export const deleteRouteMaster = async (req, res) => {
  try {
    const { id } = req.params;
    const entry = await RouteMaster.findById(id);

    if (!entry) {
      return res.status(404).json({ message: "Route master entry not found" });
    }

    if (entry.isDeleted) {
      return res.status(400).json({ message: "Route master entry is already deleted" });
    }

    entry.isDeleted = true;
    entry.routeId = `${entry.routeId}_deleted_${Date.now()}`;
    await entry.save();

    res.status(200).json({ message: "Route master entry deleted", data: entry });
  } catch (error) {
    console.error("Error deleting route master entry:", error);
    res.status(500).json({ message: "Server error" });
  }
};
