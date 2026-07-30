/**
 * dateUtils.js
 * 
 * Utility helpers to convert "YYYY-MM-DD" date strings into UTC Date objects
 * that represent the start and end of that calendar day in Indian Standard Time
 * (IST = UTC+5:30), regardless of where the server is hosted.
 *
 * Why this matters:
 *   - MongoDB stores all dates as UTC internally.
 *   - ETM tickets are generated on mobile devices in IST.
 *   - If the server is hosted in a cloud environment (UTC timezone), using
 *     JavaScript's setHours(0,0,0,0) sets hours in server-local time (UTC),
 *     causing boundary mismatches where early-morning or late-night IST tickets
 *     fall outside the queried range and disappear from daily reports.
 *
 * Usage:
 *   import { getISTDayBounds } from "../utils/dateUtils.js";
 *   const { start, end } = getISTDayBounds("2025-07-15");
 *   // start = 2025-07-14T18:30:00.000Z (midnight IST on Jul 15)
 *   // end   = 2025-07-15T18:29:59.999Z (23:59:59 IST on Jul 15)
 */

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // 5 hours 30 minutes in milliseconds

/**
 * Returns start and end UTC Date objects for a given date string in IST.
 * @param {string} dateStr - "YYYY-MM-DD" date string
 * @returns {{ start: Date, end: Date }}
 */
export const getISTDayBounds = (dateStr) => {
  // Parse the date string as a UTC date (midnight UTC)
  const [year, month, day] = dateStr.split("-").map(Number);

  // IST midnight = UTC midnight minus 5h30m (i.e., 18:30 UTC the previous day)
  const startUTC = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0) - IST_OFFSET_MS);
  const endUTC   = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999) - IST_OFFSET_MS);

  return { start: startUTC, end: endUTC };
};
