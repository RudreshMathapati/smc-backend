import express from "express";
import { addBus, getAllBuses ,deleteBus ,updateBus} from "../controllers/bus.controller.js";

const router = express.Router();

router.post("/", addBus);
router.get("/",getAllBuses);
router.delete("/:id",deleteBus);
router.put("/:id",updateBus);

export default router;
