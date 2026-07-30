import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import "../models/conductors.model.js";
import "../models/drivers.model.js";
import "../models/bus.model.js";
import "../models/route.model.js";
import "../models/busRouteMapping.model.js";
import "../models/busBreakdown.model.js";
import "../models/ConductorBus.model.js";

import { getDailyReport } from "../controllers/dailyReport.controller.js";

async function test() {
  await mongoose.connect(process.env.MONGO_URI);
  
  const req = { query: { date: "2026-07-21" } };
  const res = {
    status: (code) => ({
      json: (data) => {
        console.log("\n=== DAILY REPORT FOR 2026-07-21 ===");
        console.log(JSON.stringify(data, null, 2));
      }
    })
  };

  await getDailyReport(req, res);
  process.exit(0);
}

test().catch(console.error);
