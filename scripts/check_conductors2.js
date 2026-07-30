import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();
await mongoose.connect(process.env.MONGO_URI);
const db = mongoose.connection.db;

const all = await db.collection("Conductor").find({}).toArray();
console.log("Total in Conductor collection:", all.length);
all.forEach(c => console.log("  name:", c.name, "| isDeleted:", c.isDeleted, "| type:", typeof c.isDeleted));

// shiftassignments - conductors only
const sa = await db.collection("shiftassignments").find({ personType: "Conductor", isDeleted: false }).toArray();
console.log("\nActive conductors in shiftassignments:", sa.length);
sa.forEach(s => console.log("  name:", s.name, "| shift:", s.shift, "| batch_no:", s.batch_no));
await mongoose.disconnect();
