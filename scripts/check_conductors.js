import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();
await mongoose.connect(process.env.MONGO_URI);
const db = mongoose.connection.db;

// Check what collections exist with conductor data
const colls = await db.listCollections().toArray();
console.log("All collections:", colls.map(c => c.name).join(", "));

// Count in each likely collection
for (const name of ["Conductor", "conductor", "conductors"]) {
  try {
    const count = await db.collection(name).countDocuments();
    const sample = await db.collection(name).findOne();
    console.log(`\nCollection "${name}": ${count} docs`);
    if (sample) console.log("  Sample fields:", Object.keys(sample).join(", "));
  } catch(e) {}
}
await mongoose.disconnect();
