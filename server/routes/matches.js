/**
 * Matches Routes
 * Defines API endpoints for match-related operations
 */

const express = require("express");
const router = express.Router();
const matchesController = require("../controllers/matchesController");

// Get only synced (H2H-ready) matches — no scraping, instant DB load
// MUST be before /matches/:id to avoid the :id wildcard swallowing "synced"
// Example: GET /matches/synced?date=2026-03-14
router.get("/matches/synced", matchesController.getSyncedMatches);

// Get matches by date with optional league filtering
// Example: GET /matches?date=2026-02-28&leagues[]=Premier League
router.get("/matches", matchesController.getMatchesByDate);

// Get single match by ID
// Example: GET /matches/123
router.get("/matches/:id", matchesController.getMatchById);

// Trigger H2H scraping for specific leagues
// Example: POST /matches/scrape-h2h { date: "2026-02-28", leagues: ["Premier League"] }
router.post("/matches/scrape-h2h", matchesController.scrapeH2HByLeagues);

module.exports = router;
