// path = version2Admin/Backend/routes/route.route.js
import express from "express";
import {
  getAllRoutes,
  createRoute,
  deleteRoute,
  updateRoute,
  getRouteById,
} from "../controllers/route.controller.js";

const router = express.Router();

router.get("/", getAllRoutes);
router.post("/", createRoute);
router.delete("/:id", deleteRoute);
router.put("/:id", updateRoute);
router.get("/:id", getRouteById);

export default router;
