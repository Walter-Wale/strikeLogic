/**
 * Matches Controller
 * Handles match-related requests
 */

const ScraperService = require("../services/ScraperService");
const DatabaseService = require("../services/DatabaseService");

/**
 * Get only synced (H2H-ready) matches for a date — no scraping triggered.
 * @route GET /matches/synced?date=YYYY-MM-DD
 */
async function getSyncedMatches(req, res) {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        error: "Date parameter is required (format: YYYY-MM-DD)",
      });
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return res.status(400).json({
        success: false,
        error: "Invalid date format. Use YYYY-MM-DD",
      });
    }

    const dbService = new DatabaseService();
    const matches = await dbService.getSyncedMatchesByDate(date);

    return res.json({
      success: true,
      data: matches,
      count: matches.length,
    });
  } catch (error) {
    console.error("Error fetching synced matches:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch synced matches",
    });
  }
}

/**
 * Get matches by date with optional league filtering
 * @route GET /matches?date=YYYY-MM-DD&leagues[]=LeagueName
 */
async function getMatchesByDate(req, res) {
  try {
    const { date, leagues } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        error: "Date parameter is required (format: YYYY-MM-DD)",
      });
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return res.status(400).json({
        success: false,
        error: "Invalid date format. Use YYYY-MM-DD",
      });
    }

    // Get Socket.io instance from app
    const io = req.app.get("io");

    // Initialize scraper service
    const scraperService = new ScraperService(io);

    // Parse leagues array (can be string or array)
    const leaguesArray = Array.isArray(leagues)
      ? leagues
      : leagues
        ? [leagues]
        : [];

    // Scrape or fetch from database (WITHOUT auto H2H scraping)
    const matches = await scraperService.scrapeMatchesByDate(
      date,
      leaguesArray,
      false, // autoChainH2H = false
    );

    // Filter by leagues if specified
    let filteredMatches = matches;
    if (leaguesArray.length > 0) {
      // Log unique league names for debugging
      const uniqueLeagues = [
        ...new Set(matches.map((m) => m.leagueName).filter(Boolean)),
      ];
      console.log(
        `[DEBUG] Available leagues (${uniqueLeagues.length}):`,
        uniqueLeagues.slice(0, 20),
      );
      console.log(`[DEBUG] Filtering for:`, leaguesArray);

      filteredMatches = matches.filter((match) => {
        const leagueName = match.leagueName || "";
        // Match if the full league name contains the search term
        return leaguesArray.some((league) =>
          leagueName.toLowerCase().includes(league.toLowerCase()),
        );
      });

      console.log(
        `[DEBUG] Filtered ${filteredMatches.length} matches from ${matches.length} total`,
      );
    }

    return res.json({
      success: true,
      data: filteredMatches,
      count: filteredMatches.length,
    });
  } catch (error) {
    console.error("Error in getMatchesByDate:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch matches",
      message: error.message,
    });
  }
}

/**
 * Get a single match by ID
 * @route GET /matches/:id
 */
async function getMatchById(req, res) {
  try {
    const { id } = req.params;

    const dbService = new DatabaseService();
    const match = await dbService.getMatchById(id);

    if (!match) {
      return res.status(404).json({
        success: false,
        error: "Match not found",
      });
    }

    return res.json({
      success: true,
      data: match,
    });
  } catch (error) {
    console.error("Error in getMatchById:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch match",
      message: error.message,
    });
  }
}

/**
 * Trigger H2H scraping for matches in specific leagues
 * @route POST /matches/scrape-h2h
 * @body { date: "YYYY-MM-DD", leagues: ["Premier League", "La Liga"] }
 */
async function scrapeH2HByLeagues(req, res) {
  try {
    const { date, leagues, mode } = req.body;

    // Validate mode (whitelist to prevent injection)
    const validModes = ["feed", "puppeteer", "auto"];
    const scrapeMode = validModes.includes(mode) ? mode : "auto";

    if (!date) {
      return res.status(400).json({
        success: false,
        error: "Date parameter is required (format: YYYY-MM-DD)",
      });
    }

    if (!leagues || !Array.isArray(leagues) || leagues.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Leagues array is required",
      });
    }

    const io = req.app.get("io");
    const scraperService = new ScraperService(io);
    const dbService = new DatabaseService();

    // Get all matches for the date
    const allMatches = await dbService.getMatchesByDate(date);

    // Filter matches by selected leagues
    console.log(`[H2H] Filtering matches for leagues:`, leagues);
    const matchesToScrape = allMatches.filter((match) => {
      const leagueName = match.leagueName || match.league_name || "";
      // Exact match or match with "ENGLAND: Premier League" format
      return leagues.some((league) => {
        const exactMatch = leagueName.toLowerCase() === league.toLowerCase();
        const countryMatch = leagueName
          .toLowerCase()
          .includes(`england: ${league.toLowerCase()}`);
        return exactMatch || countryMatch;
      });
    });

    if (matchesToScrape.length === 0) {
      return res.json({
        success: true,
        message: `No matches found for selected leagues on ${date}`,
        scraped: 0,
      });
    }

    // Trigger H2H scraping for filtered matches
    scraperService._autoChainH2HScraping(matchesToScrape, scrapeMode);

    return res.json({
      success: true,
      message: `Started H2H scraping [${scrapeMode}] for ${matchesToScrape.length} matches in ${leagues.join(", ")}`,
      matchCount: matchesToScrape.length,
      leagues: leagues,
      mode: scrapeMode,
    });
  } catch (error) {
    console.error("Error in scrapeH2HByLeagues:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to start H2H scraping",
      message: error.message,
    });
  }
}

module.exports = {
  getMatchesByDate,
  getMatchById,
  scrapeH2HByLeagues,
  getSyncedMatches,
};
