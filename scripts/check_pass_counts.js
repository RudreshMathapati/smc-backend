import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

await mongoose.connect(process.env.MONGO_URI);
const db = mongoose.connection.db;

const nowIST = new Date(new Date().getTime() + 5.5 * 60 * 60 * 1000);
const monthStart = new Date(Date.UTC(nowIST.getUTCFullYear(), nowIST.getUTCMonth(), 1) - 5.5 * 60 * 60 * 1000);

// Sample tickets that have passCounts
const tickets = await db.collection("Ticket").find({ dateTime: { $gte: monthStart } }).toArray();
console.log("Total tickets this month:", tickets.length);

// Aggregate passCounts manually
const breakdown = {};
let totalPassRiders = 0;
tickets.forEach(t => {
  if (t.passCounts && typeof t.passCounts === "object") {
    Object.entries(t.passCounts).forEach(([passName, count]) => {
      const cnt = Number(count || 0);
      if (cnt > 0) {
        breakdown[passName] = (breakdown[passName] || 0) + cnt;
        totalPassRiders += cnt;
      }
    });
  }
});

console.log("\nPass breakdown (this month):");
if (Object.keys(breakdown).length === 0) console.log("  (none)");
else Object.entries(breakdown).forEach(([k,v]) => console.log("  ", k, ":", v));
console.log("Total pass riders:", totalPassRiders);

// Show a raw sample with passCounts
const sample = await db.collection("Ticket").find({ dateTime: { $gte: monthStart }, "passCounts.Student Pass": { $exists: true } }).limit(3).toArray();
console.log("\nSample tickets with passCounts:");
sample.forEach(t => console.log("  passCounts:", JSON.stringify(t.passCounts), "| paymentMode:", t.paymentMode));

await mongoose.disconnect();
