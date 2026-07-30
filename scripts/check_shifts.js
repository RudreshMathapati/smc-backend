import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

await mongoose.connect(process.env.MONGO_URI);
const db = mongoose.connection.db;

const nowIST = new Date(new Date().getTime() + 5.5 * 60 * 60 * 1000);
const todayIST = nowIST.toISOString().split("T")[0];
console.log("Today (IST):", todayIST);

// ShiftAssignment collection
const shiftAgg = await db.collection("shiftassignments").aggregate([
  { $match: { isDeleted: false } },
  { $group: { _id: { shift: "$shift", personType: "$personType" }, count: { $sum: 1 } } },
  { $sort: { "_id.personType": 1, "_id.shift": 1 } }
]).toArray();
console.log("\nShiftAssignments (all active, by shift+personType):");
shiftAgg.forEach(r => console.log("  shift:", r._id.shift, "| personType:", r._id.personType, "| count:", r.count));

// Sample a few shift assignments
const sampleSA = await db.collection("shiftassignments").find({ isDeleted: false }).limit(3).toArray();
console.log("\nSample shiftassignments docs:");
sampleSA.forEach(s => console.log("  personType:", s.personType, "| shift:", s.shift, "| name:", s.name, "| batch_no:", s.batch_no));

// ConductorBus for today
const cbToday = await db.collection("conductor_bus").aggregate([
  { $match: { assignedDate: todayIST } },
  { $group: { _id: "$shift", count: { $sum: 1 } } }
]).toArray();
console.log("\nConductorBus (today) by shift:");
if (cbToday.length === 0) console.log("  (no records for today)");
else cbToday.forEach(r => console.log("  shift:", r._id, "| count:", r.count));

// How many active conductors
const totalConductors = await db.collection("conductors").countDocuments({ isDeleted: false });
console.log("\nTotal active conductors:", totalConductors);

await mongoose.disconnect();
