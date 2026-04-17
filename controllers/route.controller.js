// path = version2Admin/Backend/controllers/route.controller.js
import Route from "../models/route.model.js";

// ✅ Get all routes
export const getAllRoutes = async (req, res) => {
  try {
    const routes = await Route.find().sort({ createdAt: -1 }); // Newest first
    res.status(200).json(routes);
  } catch (error) {
    console.error("Failed to fetch routes:", error);
    res.status(500).json({ message: "Failed to fetch routes" });
  }
};

// ✅ Create a new Route (structured trips)
export const createRoute = async (req, res) => {
  try {
   let { routeId, source, destination, via, distance, estimatedDuration, trips } = req.body;

    // Basic trims
    source = source?.trim();
    destination = destination?.trim();
    via = via?.trim() || "";

    if (!source || !destination) {
      return res
        .status(400)
        .json({ message: "Source and destination are required" });
    }
     if (!routeId?.trim()) {
  return res.status(400).json({ message: "Route ID is required" });
}
    // Validate trips array
    if (!Array.isArray(trips) || trips.length === 0) {
      return res.status(400).json({ message: "At least one trip is required" });
    }

    for (const trip of trips) {
      if (!trip.sourceTime || !trip.destinationTime) {
        return res.status(400).json({
          message: "Each trip must have sourceTime and destinationTime",
        });
      }
      if (!Array.isArray(trip.stops) || trip.stops.length === 0) {
        return res
          .status(400)
          .json({ message: "Each trip must have at least one stop" });
      }
      for (const stop of trip.stops) {
        if (
          !stop.name?.trim() ||
          !stop.timingOffset?.trim() ||
          !stop.latitude?.trim() ||
          !stop.longitude?.trim() ||
          stop.sequence === undefined
        ) {
          return res.status(400).json({
            message:
              "Each stop must have name, timingOffset, latitude, longitude, and sequence",
          });
        }
      }
    }

    // Check if route already exists
    const existing = await Route.findOne({ source, destination });
    if (existing) {
      return res.status(400).json({ message: "Route already exists" });
    }
     const existing = await Route.findOne({ routeId });
if (existing) {
  return res.status(400).json({ message: "Route ID already exists" });
}
    const newRoute = new Route({
      routeId,
      source,
      destination,
      via,
      distance,
      estimatedDuration,
      trips,
    });
    await newRoute.save();

    res.status(201).json({ message: "✅ Route created", route: newRoute });
  } catch (error) {
    console.error("Error creating route:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Delete a route by ID
export const deleteRoute = async (req, res) => {
  const { id } = req.params;
  try {
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: "Invalid route ID format" });
    }

    const route = await Route.findByIdAndDelete(id);
    if (!route) {
      return res.status(404).json({ message: "Route not found" });
    }

    res.status(200).json({ message: "✅ Route deleted", deletedRoute: route });
  } catch (error) {
    console.error("❌ Failed to delete route:", error.message);
    res.status(500).json({ message: "Failed to delete route" });
  }
};

// ✅ Get unique source and destination for dropdowns
export const getUniqueStops = async (req, res) => {
  try {
    const routes = await Route.find();
    const sources = [...new Set(routes.map((r) => r.source.trim()))];
    const destinations = [...new Set(routes.map((r) => r.destination.trim()))];
    res.status(200).json({ sources, destinations });
  } catch (err) {
    console.error("Error getting unique stops:", err);
    res.status(500).json({ message: "Failed to load stops" });
  }
};

// ✅ Update an existing route by ID (with stop editing support)
export const updateRoute = async (req, res) => {
  const { id } = req.params;
  try {
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: "Invalid route ID format" });
    }

    let {
      routeId,
      source,
      destination,
      via,
      distance,
      estimatedDuration,
      trips, // <-- optional now
      isActive,
    } = req.body;

    // Trim fields
    source = source?.trim();
    destination = destination?.trim();
    via = via?.trim() || "";
     
    if (!routeId?.trim()) {
  return res.status(400).json({ message: "Route ID is required" });
}

    if (!source || !destination) {
      return res
        .status(400)
        .json({ message: "Source and destination are required" });
    }

    const existingRoute = await Route.findById(id);
    if (!existingRoute) {
      return res.status(404).json({ message: "Route not found" });
    }

    // ✅ Update trips & stops only if provided
    let updatedTrips = existingRoute.trips;
    if (Array.isArray(trips)) {
      updatedTrips = trips.map((trip, i) => {
        if (!trip.sourceTime || !trip.destinationTime) {
          throw new Error(
            `Trip ${i + 1} is missing sourceTime/destinationTime`
          );
        }
        if (!Array.isArray(trip.stops) || trip.stops.length === 0) {
          throw new Error(`Trip ${i + 1} must have at least one stop`);
        }

        // Validate each stop
        trip.stops.forEach((stop, s) => {
          if (
            !stop.name?.trim() ||
            !stop.timingOffset?.trim() ||
            !stop.latitude?.trim() ||
            !stop.longitude?.trim() ||
            stop.sequence === undefined
          ) {
            throw new Error(
              `Trip ${i + 1}, Stop ${
                s + 1
              }: name, timingOffset, latitude, longitude, and sequence are required`
            );
          }
        });

        return trip;
      });
    }

    // ✅ Build update object
    const updateData = {
      routeId,
      source,
      destination,
      via,
      distance,
      estimatedDuration,
      trips: updatedTrips,
      isActive,
    };

    const updatedRoute = await Route.findByIdAndUpdate(id, updateData, {
      new: true,
    });

    res.status(200).json({
      message: "✅ Route updated with stops",
      route: updatedRoute,
    });
  } catch (error) {
    console.error("❌ Error updating route:", error.message);
    res
      .status(500)
      .json({ message: error.message || "Failed to update route" });
  }
};

// ✅ Get a single route by ID
export const getRouteById = async (req, res) => {
  const { id } = req.params;
  try {
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: "Invalid route ID format" });
    }

    const route = await Route.findById(id);
    if (!route) {
      return res.status(404).json({ message: "Route not found" });
    }

    res.status(200).json(route);
  } catch (error) {
    console.error("❌ Failed to fetch route:", error.message);
    res.status(500).json({ message: "Failed to fetch route" });
  }
};
