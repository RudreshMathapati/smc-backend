import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

async function checkBreakdowns() {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;

  const breakdowns = await db.collection("bus_breakdowns").find({}).toArray();
  console.log("\n=== ALL BREAKDOWNS IN DB ===");
  console.log(JSON.stringify(breakdowns, null, 2));

  const assignments = await db.collection("conductor_bus").find({ assignedDate: "2026-07-21" }).toArray();
  console.log("\n=== ASSIGNMENTS FOR 2026-07-21 ===");
  console.log(JSON.stringify(assignments, null, 2));

  process.exit(0);
}

checkBreakdowns().catch(console.error);
