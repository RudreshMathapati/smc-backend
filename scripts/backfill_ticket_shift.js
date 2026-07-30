/**
 * backfill_ticket_shift.js
 *
 * One-time migration script:
 * Adds a `shift` field to all existing Ticket documents that are missing it.
 *
 * Logic:
 *   For each ticket missing a shift, look up the conductor_bus record for the
 *   same batch_no on the same date. If found, use that assignment's `shift`.
 *   If the conductor had TWO assignments on the same date (Morning + Evening),
 *   match by busNumber to pick the correct one.
 *
 * Run: node scripts/backfill_ticket_shift.js
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

async function backfill() {
  const conn = await mongoose.connect(process.env.MONGO_URI);
  const db = conn.connection.db;

  console.log("🚀 Starting ticket shift backfill...");

  // Fetch all tickets that are missing the shift field
  const tickets = await db
    .collection("Ticket")
    .find({ shift: { $exists: false } })
    .toArray();

  console.log(`📋 Found ${tickets.length} tickets without a shift field.`);

  if (tickets.length === 0) {
    console.log("✅ All tickets already have a shift field. Nothing to do.");
    process.exit(0);
  }

  // Pre-fetch all conductor_bus assignments (we'll do in-memory lookup)
  const allAssignments = await db
    .collection("conductor_bus")
    .find({ isActive: true })
    .toArray();

  console.log(`📦 Loaded ${allAssignments.length} conductor_bus assignments.`);

  let updated = 0;
  let skipped = 0;

  for (const ticket of tickets) {
    const { batch_no, busNumber, dateTime } = ticket;

    if (!batch_no || !dateTime) {
      skipped++;
      continue;
    }

    // Derive the YYYY-MM-DD date from the ticket's dateTime (in IST = UTC+5:30)
    const dt = new Date(dateTime);
    const istDate = new Date(dt.getTime() + 5.5 * 60 * 60 * 1000);
    const dateStr =
      `${istDate.getUTCFullYear()}-` +
      `${String(istDate.getUTCMonth() + 1).padStart(2, "0")}-` +
      `${String(istDate.getUTCDate()).padStart(2, "0")}`;

    // Find all conductor_bus assignments for this conductor on this date
    const dayAssignments = allAssignments.filter(
      (a) => a.batch_no === batch_no && a.assignedDate === dateStr
    );

    if (dayAssignments.length === 0) {
      // No active assignment found for this date — skip (can't determine shift)
      skipped++;
      continue;
    }

    let matchedShift = null;

    if (dayAssignments.length === 1) {
      // Only one assignment — use it directly
      matchedShift = dayAssignments[0].shift;
    } else {
      // Multiple assignments (conductor worked multiple shifts on same day)
      // Match by busNumber to pick the right shift
      const busMatch = dayAssignments.find(
        (a) =>
          String(a.assignedbusNumber).trim().toLowerCase() ===
          String(busNumber || "").trim().toLowerCase()
      );
      if (busMatch) {
        matchedShift = busMatch.shift;
      } else {
        // Bus number doesn't match any assignment — use the first one as fallback
        matchedShift = dayAssignments[0].shift;
        console.warn(
          `⚠️  Ticket ${ticket._id} bus "${busNumber}" not found in assignments for ${batch_no} on ${dateStr}. Used ${matchedShift} as fallback.`
        );
      }
    }

    if (matchedShift) {
      await db
        .collection("Ticket")
        .updateOne({ _id: ticket._id }, { $set: { shift: matchedShift } });
      updated++;
    } else {
      skipped++;
    }
  }

  console.log(`\n✅ Backfill complete!`);
  console.log(`   Updated : ${updated} tickets`);
  console.log(`   Skipped : ${skipped} tickets (no matching assignment found)`);
  process.exit(0);
}

backfill().catch((err) => {
  console.error("❌ Backfill failed:", err);
  process.exit(1);
});
