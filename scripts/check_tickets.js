import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

async function verify() {
  const conn = await mongoose.connect(process.env.MONGO_URI);
  const db = conn.connection.db;

  const tickets = await db.collection("Ticket").find({ batch_no: "852030" }).toArray();

  console.log("\n=== All tickets for Darshan (852030) with shift field ===");
  tickets.forEach(t => {
    console.log(`  Ticket ${t.ticketNumber} | Bus: ${t.busNumber} | Shift: ${t.shift} | Price: ${t.price} | Time: ${t.dateTime}`);
  });

  const morningTickets = tickets.filter(t =>
    String(t.busNumber) === "72" && String(t.shift).toLowerCase() === "morning"
  );
  const eveningTickets = tickets.filter(t =>
    String(t.busNumber) === "70" && String(t.shift).toLowerCase() === "evening"
  );

  const morningRevenue = morningTickets.reduce((s, t) => s + (t.price || 0), 0);
  const eveningRevenue = eveningTickets.reduce((s, t) => s + (t.price || 0), 0);

  console.log(`\n=== Revenue Summary (2026-07-20) ===`);
  console.log(`  Morning Shift (Bus 72): ₹${morningRevenue}`);
  console.log(`  Evening Shift (Bus 70): ₹${eveningRevenue}`);
  console.log(`  Grand Total: ₹${morningRevenue + eveningRevenue}`);
  console.log(`  Expected: ₹1,181 (no duplication)`);

  process.exit(0);
}

verify().catch(console.error);
