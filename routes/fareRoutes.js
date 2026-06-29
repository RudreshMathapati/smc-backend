// fareRoutes.js - Handles fare calculation based on route and stops
import express from "express";
import Route from "../models/route.model.js";
import mongoose from "mongoose";

const router = express.Router();

// =======================
// GET FARE CHART
// =======================
router.get("/farechart", async (req, res) => {
  try {
    const db = mongoose.connection.db;

    const fareDoc = await db.collection("fareCharts").findOne({
      type: "fareChart",
    });

    res.json(fareDoc);
  } catch (err) {
    res.status(500).json({ message: "Error fetching fare chart" });
  }
});

// =======================
// GET FARE CHART HISTORY
// =======================
router.get("/farechart/history", async (req, res) => {
  try {
    const db = mongoose.connection.db;

    const history = await db
      .collection("fareCharts")
      .find({ type: "fareChartHistory" })
      .sort({ archivedAt: -1 })
      .toArray();

    res.json(history);
  } catch (err) {
    res.status(500).json({ message: "Error fetching fare chart history" });
  }
});


// =======================
// UPDATE FARE CHART
// =======================
router.put("/farechart", async (req, res) => {
  try {
    const { fares } = req.body;

    const db = mongoose.connection.db;

    // Archive current active fare chart as history before updating
    const currentDoc = await db.collection("fareCharts").findOne({
      type: "fareChart",
    });

    let isChanged = false;
    if (currentDoc && currentDoc.fares) {
      const oldFares = currentDoc.fares;
      const oldKeys = Object.keys(oldFares);
      const newKeys = Object.keys(fares || {});
      if (oldKeys.length !== newKeys.length) {
        isChanged = true;
      } else {
        for (let key of oldKeys) {
          if (Number(oldFares[key]) !== Number(fares[key])) {
            isChanged = true;
            break;
          }
        }
      }
    } else {
      isChanged = true;
    }

    if (!isChanged) {
      return res.json({ message: "No changes detected. Fare chart remains unchanged." });
    }

    if (currentDoc && currentDoc.fares) {
      await db.collection("fareCharts").insertOne({
        type: "fareChartHistory",
        fares: currentDoc.fares,
        archivedAt: new Date(),
      });
    }

    await db.collection("fareCharts").updateOne(
      { type: "fareChart" },
      { $set: { fares: fares } },
      { upsert: true }
    );

    res.json({ message: "Fare chart updated successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error updating fare chart" });
  }
});

// POST /api/calculate-fare
router.post("/calculate-fare", async (req, res) => {
  try {
    const { routeId, from, to } = req.body;

    if (!routeId || !from || !to) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // ✅ Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(routeId)) {
      return res.status(400).json({ message: "Invalid route ID" });
    }

    // ✅ Get Route
    const route = await Route.findById(routeId);

    if (!route) {
      return res.status(404).json({ message: "Route not found" });
    }

    const stops = route.trips[0]?.stops || [];

    if (stops.length === 0) {
      return res.status(400).json({ message: "No stops found in route" });
    }

    // ✅ Find stages
    let fromStage = 0;
    let toStage = 0;

    // 🔹 SOURCE = stage 0
    if (from !== "SOURCE") {
      const fromStop = stops.find(
        (s) => s.name.toLowerCase() === from.toLowerCase()
      );

      if (!fromStop) {
        return res.status(404).json({ message: "From stop not found" });
      }

      fromStage = fromStop.stage;
    }

    const toStop = stops.find(
      (s) => s.name.toLowerCase() === to.toLowerCase()
    );

    if (!toStop) {
      return res.status(404).json({ message: "To stop not found" });
    }

    toStage = toStop.stage;

    // ✅ Calculate distance
    const distance = Math.abs(toStage - fromStage);

    // 🔥 FETCH FARE CHART FROM DB
    const db = mongoose.connection.db;

    const fareDoc = await db.collection("fareCharts").findOne({
      type: "fareChart",
    });

    if (!fareDoc) {
      return res.status(500).json({ message: "Fare chart not found" });
    }

    const fareChart = fareDoc.fares;

    // ✅ Get fare
    const fare = fareChart[distance] || 0;

    res.json({
      from,
      to,
      fromStage,
      toStage,
      distance,
      fare,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;