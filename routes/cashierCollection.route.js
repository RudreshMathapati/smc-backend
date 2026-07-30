import express from "express";
import {
  getCashierSummary,
  recordCollection,
  setPersonalAmount,
  getAllCollectionsForDate,
  getActiveConductorSummaries,
  getPendingBalanceByDate,
  getOffDutySummary,
  getOffDutyConductors,
} from "../controllers/cashierCollection.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

// GET /api/cashier-collections/active-summaries
// Returns all active daily conductor summaries and balances
router.get("/active-summaries", getActiveConductorSummaries);

// GET /api/cashier-collections/offduty-summaries
// Returns all off-duty conductors who have pending balances
router.get("/offduty-summaries", getOffDutyConductors);

// GET /api/cashier-collections/summary?batch_no=X
// Returns conductor cash summary for today (auto date server-side)
router.get("/summary", getCashierSummary);

// GET /api/cashier-collections/pending-by-date?batch_no=X
// Returns per-date pending balance breakdown for a conductor (all-time, only pending dates)
router.get("/pending-by-date", getPendingBalanceByDate);

// GET /api/cashier-collections/offduty-summary?batch_no=X
// Returns outstanding balance for any conductor regardless of today's bus assignment
router.get("/offduty-summary", getOffDutySummary);

// GET /api/cashier-collections/all?date=YYYY-MM-DD
// Admin: get all collection transactions for a date
router.get("/all", getAllCollectionsForDate);

// POST /api/cashier-collections/collect
// Record a new cash handover from conductor
router.post("/collect", protect, recordCollection);

// PATCH /api/cashier-collections/personal-amount
// Update the conductor's personal starting amount (max Rs 50)
router.patch("/personal-amount", protect, setPersonalAmount);

export default router;
