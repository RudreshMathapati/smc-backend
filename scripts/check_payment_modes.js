import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

await mongoose.connect(process.env.MONGO_URI);
const db = mongoose.connection.db;

const modes = await db.collection("Ticket").distinct("paymentMode");
console.log("\n All distinct paymentMode values in DB:");
modes.forEach((m) => console.log("   -", JSON.stringify(m)));

const nowIST = new Date(new Date().getTime() + 5.5 * 60 * 60 * 1000);
const monthStart = new Date(
  Date.UTC(nowIST.getUTCFullYear(), nowIST.getUTCMonth(), 1) - 5.5 * 60 * 60 * 1000
);
console.log("\n Month start (UTC):", monthStart.toISOString());

const agg = await db.collection("Ticket").aggregate([
  { $match: { dateTime: { $gte: monthStart } } },
  { $group: { _id: "$paymentMode", total: { $sum: { $toDouble: "$price" } }, count: { $sum: 1 } } },
  { $sort: { total: -1 } }
]).toArray();

console.log("\n This month breakdown by paymentMode:");
if (agg.length === 0) { console.log("   (no tickets found this month)"); }
else { agg.forEach((r) => console.log("   paymentMode:", JSON.stringify(r._id), "| count:", r.count, "| total: Rs", r.total.toFixed(2))); }

const sample = await db.collection("Ticket").find({ dateTime: { $gte: monthStart } }).sort({ dateTime: -1 }).limit(5).toArray();
console.log("\n Last 5 tickets this month:");
sample.forEach((t) => console.log("   paymentMode:", JSON.stringify(t.paymentMode), "| price:", t.price, "| dateTime:", t.dateTime));

await mongoose.disconnect();
