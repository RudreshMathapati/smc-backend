// import BusRoute from "../models/busRouteMapping.model.js";
// import Route from "../models/route.model.js";
// import Bus from "../models/bus.model.js";

// // Create a new bus-route mapping
// export const createBusRoute = async (req, res) => {
//   try {
//     const { bus, route, assignmentType, status, assignedBy, remarks } =
//       req.body;

//     // Validate Bus and Route
//     const busExists = await Bus.findById(bus);
//     const routeExists = await Route.findById(route);

//     if (!busExists || !routeExists) {
//       return res.status(404).json({ message: "Bus or Route not found" });
//     }

//     const newMapping = new BusRoute({
//       bus,
//       route,
//       assignmentType: assignmentType || "Daily",
//       status: status || "Active",
//       assignedBy: assignedBy || "System",
//       remarks: remarks || "",
//     });

//     await newMapping.save();
//     res
//       .status(201)
//       .json({ message: "Bus-Route mapping created", data: newMapping });
//   } catch (error) {
//     console.error("Error creating bus-route mapping:", error);
//     res.status(500).json({ message: "Internal server error" });
//   }
// };

// // Get all bus-route mappings
// export const getAllBusRoutes = async (req, res) => {
//   try {
//     const mappings = await BusRoute.find().populate("bus").populate("route");

//     res.status(200).json(mappings);
//   } catch (error) {
//     console.error("Error fetching bus route mappings:", error);
//     res.status(500).json({ message: "Failed to fetch mappings" });
//   }
// };

// // Get mapping by ID
// export const getBusRouteById = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const mapping = await BusRoute.findById(id)
//       .populate("bus")
//       .populate("route");

//     if (!mapping) {
//       return res.status(404).json({ message: "Mapping not found" });
//     }

//     res.status(200).json(mapping);
//   } catch (error) {
//     console.error("Error fetching mapping by ID:", error);
//     res.status(500).json({ message: "Internal server error" });
//   }
// };

// // Update mapping
// export const updateBusRoute = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { bus, route, assignmentType, status, assignedBy, remarks } =
//       req.body;

//     const updated = await BusRoute.findByIdAndUpdate(
//       id,
//       { bus, route, assignmentType, status, assignedBy, remarks },
//       { new: true }
//     );

//     if (!updated) {
//       return res.status(404).json({ message: "Mapping not found" });
//     }

//     res.status(200).json({ message: "Mapping updated", data: updated });
//   } catch (error) {
//     console.error("Error updating mapping:", error);
//     res.status(500).json({ message: "Internal server error" });
//   }
// };

// // Delete mapping
// export const deleteBusRoute = async (req, res) => {
//   try {
//     const { id } = req.params;

//     const deleted = await BusRoute.findByIdAndDelete(id);

//     if (!deleted) {
//       return res.status(404).json({ message: "Mapping not found" });
//     }

//     res.status(200).json({ message: "Mapping deleted" });
//   } catch (error) {
//     console.error("Error deleting mapping:", error);
//     res.status(500).json({ message: "Internal server error" });
//   }
// };

import BusRoute from "../models/busRouteMapping.model.js";
import Route from "../models/route.model.js";
import Bus from "../models/bus.model.js";
import mongoose from "mongoose";

// Create a new bus-route mapping
export const createBusRoute = async (req, res) => {
  try {
    const { bus, route, timings, status, assignedBy, remarks } = req.body;

    // Validate Bus and Route
    const busExists = await Bus.findById(bus);
    const routeExists = await Route.findById(route);

    if (!busExists || !routeExists) {
      return res.status(404).json({ message: "Bus or Route not found" });
    }

    // Validate timings
    if (!timings || !Array.isArray(timings) || timings.length === 0) {
      return res
        .status(400)
        .json({ message: "At least one timing is required" });
    }

    const newMapping = new BusRoute({
      bus,
      route,
      timings,
      status: status || "Active",
      assignedBy: assignedBy || "System",
      remarks: remarks || "",
    });

    await newMapping.save();
    res
      .status(201)
      .json({ message: "Bus-Route mapping created", data: newMapping });
  } catch (error) {
    console.error("Error creating bus-route mapping:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get all bus-route mappings
export const getAllBusRoutes = async (req, res) => {
  try {
    const mappings = await BusRoute.find().populate("bus").populate("route");
    res.status(200).json(mappings);
  } catch (error) {
    console.error("Error fetching bus route mappings:", error);
    res.status(500).json({ message: "Failed to fetch mappings" });
  }
};

// Get mapping by ID
export const getBusRouteById = async (req, res) => {
  try {
    const { id } = req.params;
    const busRouteId = new mongoose.Types.ObjectId(id);
    const mapping = await BusRoute.findOne({ _id: busRouteId })
      .populate("bus")
      .populate("route");

    // console.log(mapping, "asdfg");

    if (!mapping) {
      return res.status(404).json({ message: "Mapping not found" });
    }

    res
      .status(200)
      .json({ message: "Bus Route Data Sent Successfully", data: mapping });
  } catch (error) {
    console.error("Error fetching mapping by ID:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Update mapping
export const updateBusRoute = async (req, res) => {
  try {
    const { id } = req.params;
    const { bus, route, timings, status, assignedBy, remarks } = req.body;

    if (!timings || !Array.isArray(timings) || timings.length === 0) {
      return res
        .status(400)
        .json({ message: "At least one timing is required" });
    }

    const updated = await BusRoute.findByIdAndUpdate(
      id,
      { bus, route, timings, status, assignedBy, remarks },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Mapping not found" });
    }

    res.status(200).json({ message: "Mapping updated", data: updated });
  } catch (error) {
    console.error("Error updating mapping:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Delete mapping
export const deleteBusRoute = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await BusRoute.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ message: "Mapping not found" });
    }

    res.status(200).json({ message: "Mapping deleted" });
  } catch (error) {
    console.error("Error deleting mapping:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

//search mapping
export const searchBusRoutes = async (req, res) => {
  try {
    const { source, destination } = req.query;

    if (!source || !destination) {
      return res
        .status(400)
        .json({ message: "Source and destination are required" });
    }

    // Match case-insensitive directly in MongoDB
    const busRoutes = await BusRoute.find()
      .populate("bus")
      .populate({
        path: "route",
        match: {
          source: { $regex: new RegExp(`^${source}$`, "i") },
          destination: { $regex: new RegExp(`^${destination}$`, "i") },
        },
      });

    // Remove entries with no matched route
    const filtered = busRoutes.filter((br) => br.route);

    res.status(200).json(filtered);
  } catch (error) {
    console.error("Error searching bus routes:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
