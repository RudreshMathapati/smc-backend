import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

await mongoose.connect(process.env.MONGO_URI);
const db = mongoose.connection.db;

const nowIST = new Date(new Date().getTime() + 5.5 * 60 * 60 * 1000);
const todayIST = nowIST.toISOString().split("T")[0];

const [y, m, d] = todayIST.split("-").map(Number);
const todayStartUTC = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0) - 5.5 * 60 * 60 * 1000);

const activeConductors = await db.collection("Conductor").find({ isDeleted: false }).project({ batch_no: 1, name: 1 }).toArray();

const pastSalesAgg = await db.collection("Ticket").aggregate([
  {
    $match: {
      paymentMode: "Cash",
      dateTime: { $lt: todayStartUTC }
    }
  },
  {
    $group: {
      _id: "$batch_no",
      totalSales: { $sum: { $toDouble: "$price" } }
    }
  }
]).toArray();

const pastColsAgg = await db.collection("cashier_collections").aggregate([
  {
    $match: {
      collectionDate: { $lt: todayIST }
    }
  },
  {
    $group: {
      _id: "$batch_no",
      totalCollected: { $sum: "$collectedAmount" }
    }
  }
]).toArray();

const salesMap = {};
pastSalesAgg.forEach(r => { salesMap[r._id] = r.totalSales; });

const colsMap = {};
pastColsAgg.forEach(r => { colsMap[r._id] = r.totalCollected; });

let grandTotalPastPending = 0;
let conductorsWithPastPendingCount = 0;

activeConductors.forEach(c => {
  const sales = salesMap[c.batch_no] || 0;
  const collected = colsMap[c.batch_no] || 0;
  const pending = Math.max(0, sales - collected);
  if (pending > 0) {
    grandTotalPastPending += pending;
    conductorsWithPastPendingCount++;
    console.log(`  Pending for ${c.name} (${c.batch_no}): ?${pending}`);
  }
});

console.log(`\nTotal Past Pending Amount: ?${grandTotalPastPending}`);
console.log(`Conductors with Past Pending: ${conductorsWithPastPendingCount}`);

await mongoose.disconnect();
