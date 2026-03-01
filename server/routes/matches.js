/**
 * Matches Routes
 * Defines API endpoints for match-related operations
 */

const express = require("express");
const router = express.Router();
const matchesController = require("../controllers/matchesController");

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
