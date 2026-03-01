/**
 * H2H Controller
 * Handles head-to-head and form data requests
 */

const ScraperService = require("../services/ScraperService");

/**
 * Get H2H and form data for a specific match
 * Returns data grouped by section type: HOME_FORM, AWAY_FORM, DIRECT_H2H
 * @route GET /h2h/:matchId/:flashscoreId
 */
async function getH2HData(req, res) {
  try {
    const { matchId, flashscoreId } = req.params;

    if (!matchId || !flashscoreId) {
      return res.status(400).json({
        success: false,
        error: "Both matchId and flashscoreId are required",
      });
    }

    // Validate matchId is a number
    const matchIdNum = parseInt(matchId, 10);
    if (isNaN(matchIdNum)) {
      return res.status(400).json({
        success: false,
        error: "Invalid matchId format",
      });
    }

    // Get Socket.io instance from app
    const io = req.app.get("io");

    // Initialize scraper service
    const scraperService = new ScraperService(io);

    // Scrape or fetch from database
    const h2hData = await scraperService.scrapeH2HAndForm(
      matchIdNum,
      flashscoreId,
    );

    return res.json({
      success: true,
      data: h2hData,
    });
  } catch (error) {
    console.error("Error in getH2HData:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch H2H data",
      message: error.message,
    });
  }
}

module.exports = {
  getH2HData,
};
