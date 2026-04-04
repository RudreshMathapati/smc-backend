import GPS from "../models/gps.model.js";

// Save GPS data (devices can call this)
export const saveGpsData = async (req, res) => {
  try {
    const { deviceId, latitude, longitude, timestamp } = req.body;
    if (!deviceId || latitude == null || longitude == null) {
      return res.status(400).json({ message: "deviceId, latitude and longitude are required" });
    }

    const gps = new GPS({ deviceId, latitude, longitude, timestamp: timestamp ? new Date(timestamp) : new Date() });
    await gps.save();

    res.status(201).json({ success: true, data: gps });
  } catch (error) {
    console.error("Error saving GPS:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get latest GPS for all devices (one document per device)
export const getAllGpsData = async (req, res) => {
  try {
    // aggregate to get latest per device
    const latestPerDevice = await GPS.aggregate([
      { $sort: { deviceId: 1, timestamp: -1 } },
      {
        $group: {
          _id: "$deviceId",
          deviceId: { $first: "$deviceId" },
          latitude: { $first: "$latitude" },
          longitude: { $first: "$longitude" },
          timestamp: { $first: "$timestamp" },
          id: { $first: "$_id" },
        },
      },
    ]);

    res.status(200).json({ success: true, data: latestPerDevice });
  } catch (error) {
    console.error("Error fetching all GPS data:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getLatestGpsByDevice = async (req, res) => {
  try {
    const latestData = await GPS.findOne({ deviceId: req.params.deviceId }).sort({ timestamp: -1 }).limit(1);
    if (!latestData) {
      return res.status(404).json({ success: false, message: "No GPS data found for this device" });
    }

    res.status(200).json({ success: true, data: latestData });
  } catch (error) {
    console.error("Error fetching GPS by device:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getGpsHistoryByDevice = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || "100", 10);
    const history = await GPS.find({ deviceId: req.params.deviceId }).sort({ timestamp: -1 }).limit(limit);
    res.status(200).json({ success: true, data: history });
  } catch (error) {
    console.error("Error fetching GPS history:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
