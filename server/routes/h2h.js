/**
 * H2H Routes
 * Defines API endpoints for head-to-head and form data operations
 */

const express = require("express");
const router = express.Router();
const h2hController = require("../controllers/h2hController");

// Get H2H and form data for a specific match
// Returns data grouped by section: HOME_FORM, AWAY_FORM, DIRECT_H2H
// Example: GET /h2h/123/8QPNvIdp
router.get("/h2h/:matchId/:flashscoreId", h2hController.getH2HData);

module.exports = router;
