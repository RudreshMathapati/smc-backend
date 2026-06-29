import express from "express";
import {
  createRouteMaster,
  getAllRouteMasters,
  updateRouteMaster,
  deleteRouteMaster,
} from "../controllers/routeMaster.controller.js";

const router = express.Router();

router.post("/", createRouteMaster);
router.get("/", getAllRouteMasters);
router.put("/:id", updateRouteMaster);
router.delete("/:id", deleteRouteMaster);

export default router;
