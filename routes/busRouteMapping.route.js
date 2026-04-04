import express from "express";
import {
  createBusRoute,
  getAllBusRoutes,
  getBusRouteById,
  updateBusRoute,
  deleteBusRoute,
  searchBusRoutes,
} from "../controllers/busRouteMapping.controller.js"

const router = express.Router();

router.get("/", getAllBusRoutes);
router.post("/", createBusRoute);
router.get("/:id", getBusRouteById);
router.put("/:id", updateBusRoute);
router.delete("/:id", deleteBusRoute);
router.get("/search", searchBusRoutes);

export default router;
