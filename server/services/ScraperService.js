/**
 * Scraper Service
 * Handles web scraping of FlashScore.com using Puppeteer with stealth plugin
 * Delegates to focused sub-modules in services/scraper/
 */

const DatabaseService = require("./DatabaseService");
const { ensureErrorLogDirectory } = require("./scraper/screenshotService");
const {
  scrapeMatchesByDate: _scrapeMatchesByDate,
} = require("./scraper/fixtureScraper");
const { scrapeH2HAndForm: _scrapeH2HAndForm } = require("./scraper/h2hScraper");
const { autoChainH2HScraping } = require("./scraper/h2hQueue");

class ScraperService {
  /**
   * @param {SocketIO.Server} io - Socket.io instance for emitting logs
   */
  constructor(io) {
    this.io = io;
    this.dbService = new DatabaseService();
    ensureErrorLogDirectory();
  }

  async scrapeMatchesByDate(date, leagues = [], autoChainH2H = true) {
    return _scrapeMatchesByDate(
      date,
      leagues,
      autoChainH2H,
      this.io,
      this.dbService,
    );
  }

  async scrapeH2HAndForm(matchId, flashscoreId) {
    return _scrapeH2HAndForm(matchId, flashscoreId, this.io, this.dbService);
  }

  async _autoChainH2HScraping(matches, mode = "auto") {
    return autoChainH2HScraping(matches, this.io, this.dbService, mode);
  }
}

module.exports = ScraperService;
