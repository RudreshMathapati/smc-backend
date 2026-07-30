import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

await mongoose.connect(process.env.MONGO_URI);
const db = mongoose.connection.db;

const nowIST = new Date(new Date().getTime() + 5.5 * 60 * 60 * 1000);
const todayIST = nowIST.toISOString().split("T")[0];

const [y, m, d] = todayIST.split("-").map(Number);
const todayStartUTC = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0) - 5.5 * 60 * 60 * 1000);

console.log("Today IST:", todayIST, "| Past cutoff (UTC):", todayStartUTC.toISOString());

const conductors = await db.collection("Conductor").find({ isDeleted: false }).toArray();
console.log("\nActive Conductors:");

let grandTotalPastPending = 0;
let conductorsWithPastPendingCount = 0;

for (const c of conductors) {
  const tickets = await db.collection("Ticket").find({
    batch_no: c.batch_no,
    paymentMode: "Cash",
    dateTime: { $lt: todayStartUTC }
  }).toArray();
  const pastSales = tickets.reduce((s, t) => s + Number(t.price || 0), 0);

  const cols = await db.collection("cashier_collections").find({
    batch_no: c.batch_no,
    collectionDate: { $lt: todayIST }
  }).toArray();
  const pastCollected = cols.reduce((s, col) => s + col.collectedAmount, 0);

  const pending = Math.max(0, pastSales - pastCollected);
  if (pending > 0) {
    conductorsWithPastPendingCount++;
    grandTotalPastPending += pending;
  }

  console.log(`  - Conductor: ${c.name} (${c.batch_no}) | Past Cash Sales: ?${pastSales} | Past Collected: ?${pastCollected} | Past Pending: ?${pending}`);
}

console.log(`\nGrand Total Past Pending: ?${grandTotalPastPending}`);
console.log(`Conductors with Past Pending: ${conductorsWithPastPendingCount}`);

await mongoose.disconnect();
