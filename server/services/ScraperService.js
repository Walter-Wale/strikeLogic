/**
 * Scraper Service
 * Handles web scraping of FlashScore.com using Puppeteer with stealth plugin
 */

const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const fs = require("fs");
const path = require("path");
const selectors = require("../../shared/selectors");
const DataCleaner = require("../utils/DataCleaner");
const DatabaseService = require("./DatabaseService");
const { emitLog } = require("../utils/socketLogger");
const { delay, DEFAULT_SCRAPE_DELAY } = require("../utils/delay");
const { ensureMinimumMatches } = require("../utils/expandMatches");

// Apply stealth plugin to avoid detection
puppeteer.use(StealthPlugin());

class ScraperService {
  /**
   * @param {SocketIO.Server} io - Socket.io instance for emitting logs
   */
  constructor(io) {
    this.io = io;
    this.dbService = new DatabaseService();
    this._ensureErrorLogDirectory();
  }

  /**
   * Ensure logs/errors directory exists for screenshot storage
   * @private
   */
  _ensureErrorLogDirectory() {
    const errorLogDir = path.join(__dirname, "..", "logs", "errors");
    if (!fs.existsSync(errorLogDir)) {
      fs.mkdirSync(errorLogDir, { recursive: true });
    }
  }

  /**
   * Scrape matches for a specific date with optional league filtering
   *
   * AUTOMATED EXECUTION CHAIN:
   * 1. Scrape fixture list from FlashScore for selected date
   * 2. Save to matches table with is_synced=FALSE
   * 3. Automatically loop through each match by flashscore_id
   * 4. Navigate to H2H page and scrape all 3 sections (HOME_FORM, AWAY_FORM, DIRECT_H2H)
   * 5. Save H2H data to h2h_history table (team names converted to IDs)
   * 6. Update is_synced=TRUE once H2H scrape completes for that match
   * 7. Continue to next match with 3-second delay to prevent IP ban
   *
   * Implements idempotency - checks DB first before scraping
   * @param {string} date - Date in YYYY-MM-DD format
   * @param {Array<string>} leagues - Optional array of league names to filter
   * @param {boolean} autoChainH2H - If true, automatically scrape H2H for all matches
   * @returns {Promise<Array>} Array of match objects
   */
  async scrapeMatchesByDate(date, leagues = [], autoChainH2H = true) {
    try {
      emitLog(
        this.io,
        `🔍 Checking database for matches on ${date}...`,
        "info",
      );

      // Check if matches already exist in DB (idempotency)
      const existingMatches = await this.dbService.getMatchesByDate(date);

      if (existingMatches && existingMatches.length > 0) {
        emitLog(
          this.io,
          `✓ Found ${existingMatches.length} matches in database for ${date}`,
          "success",
        );

        // AUTOMATED CHAIN: Check if H2H scraping is needed
        if (autoChainH2H) {
          await this._autoChainH2HScraping(existingMatches);
        }

        return existingMatches;
      }

      emitLog(this.io, "No cached data found. Launching browser...", "info");

      // Launch browser with enhanced stealth settings
      const browser = await puppeteer.launch({
        headless: "new", // Use new headless mode
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-blink-features=AutomationControlled",
          "--disable-dev-shm-usage",
          "--disable-accelerated-2d-canvas",
          "--disable-gpu",
          "--window-size=1920,1080",
          "--disable-web-security",
          "--disable-features=IsolateOrigins,site-per-process",
        ],
      });

      const page = await browser.newPage();

      // Set realistic viewport and user agent
      await page.setViewport({ width: 1920, height: 1080 });
      await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      );

      // Set additional headers to appear more like a real browser
      await page.setExtraHTTPHeaders({
        "Accept-Language": "en-US,en;q=0.9",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
        Connection: "keep-alive",
        "Upgrade-Insecure-Requests": "1",
      });

      // Override permissions
      const context = browser.defaultBrowserContext();
      await context.overridePermissions("https://www.flashscore.com", [
        "geolocation",
        "notifications",
      ]);

      // Mask webdriver property
      await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, "webdriver", {
          get: () => false,
        });

        // Add chrome runtime
        window.chrome = {
          runtime: {},
        };

        // Mock plugins and languages
        Object.defineProperty(navigator, "plugins", {
          get: () => [1, 2, 3, 4, 5],
        });

        Object.defineProperty(navigator, "languages", {
          get: () => ["en-US", "en"],
        });
      });

      emitLog(this.io, `Navigating to FlashScore homepage first...`, "info");

      // First, visit the homepage to establish a session (more human-like)
      await page.goto("https://www.flashscore.com/", {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });

      await delay(2000); // Wait like a human would

      // Simulate human-like behavior: scroll a bit
      await page.evaluate(() => {
        window.scrollTo(0, 200);
      });

      await delay(1000);

      emitLog(this.io, `Navigating to FlashScore for date ${date}...`, "info");

      // FlashScore shows today's matches by default at the main football page
      // For different dates, we'll need to interact with the date picker
      const url = "https://www.flashscore.com/football/";
      const dateFormatted = date.replace(/-/g, ""); // Used for file naming

      emitLog(this.io, `URL: ${url}`, "info");

      await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });

      await delay(3000); // Give time for JS to load matches

      // Check if page loaded successfully
      const pageText = await page.evaluate(() => document.body.innerText);
      if (
        pageText.includes("requested page can't be displayed") ||
        pageText.includes("Error:")
      ) {
        emitLog(this.io, `❌ FlashScore returned error page`, "error");
        await browser.close();
        return [];
      }

      emitLog(this.io, `✓ Successfully loaded FlashScore`, "success");

      // TODO: Check if we need to select a different date
      // For now, we'll assume we're getting today's matches
      const today = new Date().toISOString().split("T")[0];
      if (date !== today) {
        emitLog(
          this.io,
          `⚠️ Date picker interaction not yet implemented. Showing today's matches instead of ${date}`,
          "warning",
        );
      }

      // Wait for matches to load
      await delay(DEFAULT_SCRAPE_DELAY);

      // DEBUG: Get page info
      const pageTitle = await page.title();
      emitLog(this.io, `Page Title: ${pageTitle}`, "info");

      // DEBUG: Check for cookie consent and try to accept
      try {
        const cookieSelectors = [
          "#onetrust-accept-btn-handler",
          ".fc-cta-consent",
          'button[mode="primary"]',
          'button:contains("Accept")',
          'button:contains("Consent")',
        ];

        for (const selector of cookieSelectors) {
          const cookieButton = await page.$(selector);
          if (cookieButton) {
            await cookieButton.click();
            emitLog(
              this.io,
              `✓ Clicked cookie consent button: ${selector}`,
              "info",
            );
            await delay(1000);
            break;
          }
        }
      } catch (err) {
        emitLog(this.io, `No cookie popup found (this is OK)`, "info");
      }

      // DEBUG: Save HTML content for inspection
      const htmlContent = await page.content();
      const htmlPath = path.join(
        __dirname,
        "..",
        "logs",
        "errors",
        `page_${dateFormatted}.html`,
      );
      fs.writeFileSync(htmlPath, htmlContent);
      emitLog(this.io, `📄 HTML saved: ${htmlPath}`, "info");

      // Take screenshot for debugging (will help verify page loaded correctly)
      const screenshotPath = path.join(
        __dirname,
        "..",
        "logs",
        "errors",
        `scrape_${dateFormatted}.png`,
      );
      await page.screenshot({ path: screenshotPath, fullPage: true });
      emitLog(this.io, `📸 Screenshot saved: ${screenshotPath}`, "info");

      emitLog(this.io, "Scraping match fixtures from FlashScore...", "info");

      // DEBUG: Check what selectors match
      const selectorDebug = await page.evaluate((sel) => {
        return {
          matchRowCount: document.querySelectorAll(sel.MATCH_ROW_SELECTOR)
            .length,
          scheduledMatchCount: document.querySelectorAll(
            ".event__match--scheduled",
          ).length,
          liveMatchCount: document.querySelectorAll(".event__match--live")
            .length,
          allMatchCount: document.querySelectorAll(".event__match").length,
          homeTeamCount: document.querySelectorAll(sel.HOME_TEAM_SELECTOR)
            .length,
          eventCount: document.querySelectorAll('[id^="g_1_"]').length,
        };
      }, selectors);

      emitLog(
        this.io,
        `DEBUG - Selector matches: ${JSON.stringify(selectorDebug)}`,
        "info",
      );

      // Extract match data from page using verified selectors
      const matches = await page.evaluate((sel) => {
        const matchElements = document.querySelectorAll(sel.MATCH_ROW_SELECTOR);
        const extractedMatches = [];

        matchElements.forEach((matchEl) => {
          try {
            const idAttr = matchEl.getAttribute(sel.MATCH_ID_ATTRIBUTE);
            // Extract clean ID from format "g_1_hOA1PhIN" → "hOA1PhIN"
            const flashscoreId = idAttr ? idAttr.split("_")[2] : null;

            const homeTeam = matchEl
              .querySelector(sel.HOME_TEAM_SELECTOR)
              ?.textContent?.trim();
            const awayTeam = matchEl
              .querySelector(sel.AWAY_TEAM_SELECTOR)
              ?.textContent?.trim();
            const matchTime = matchEl
              .querySelector(sel.MATCH_TIME_SELECTOR)
              ?.textContent?.trim();

            // Find league name by traversing backwards to find the nearest league header
            // Extract both country and league name to create "COUNTRY: League Name" format
            let leagueName = "Unknown";
            let currentElement = matchEl.previousElementSibling;
            while (currentElement) {
              // Look for the main league header container
              const leagueHeader = currentElement.querySelector(
                ".headerLeague__title",
              );
              if (leagueHeader) {
                // Extract country from headerLeague__category-text
                const countryElement = currentElement.querySelector(
                  ".headerLeague__category-text",
                );
                const country = countryElement?.textContent?.trim();
                const league = leagueHeader.textContent.trim();

                // Combine as "COUNTRY: League Name" or just league if country not found
                leagueName = country ? `${country}: ${league}` : league;
                break;
              }
              currentElement = currentElement.previousElementSibling;
            }

            // Extract full match URL path for H2H navigation
            // FlashScore rows contain <a href="/match/football/team1-Id/team2-Id/#summary">
            const matchLink = matchEl.querySelector(
              'a[href*="/match/football/"]',
            );
            const rawHref = matchLink ? matchLink.getAttribute("href") : null;
            // Strip hash fragment to get base path: /match/football/team1-Id/team2-Id/
            const matchUrl = rawHref
              ? rawHref.split("#")[0].replace(/\/?$/, "/")
              : null;

            if (flashscoreId && homeTeam && awayTeam) {
              extractedMatches.push({
                flashscoreId,
                homeTeam,
                awayTeam,
                matchTime: matchTime || "TBD",
                leagueName: leagueName,
                matchUrl,
              });
            }
          } catch (err) {
            console.error("Error extracting match:", err);
          }
        });

        return extractedMatches;
      }, selectors);

      if (matches.length === 0) {
        emitLog(this.io, `⚠️ No matches found for ${date}`, "warning");

        // Take screenshot for debugging when no matches found
        const dateFormatted = date.replace(/-/g, "");
        const errorScreenshotPath = path.join(
          __dirname,
          "..",
          "logs",
          "errors",
          `no_matches_${dateFormatted}_${Date.now()}.png`,
        );
        await page.screenshot({ path: errorScreenshotPath, fullPage: true });
        emitLog(
          this.io,
          `📸 Debug screenshot saved: ${errorScreenshotPath}`,
          "warning",
        );

        // Log page URL for verification
        const currentUrl = page.url();
        emitLog(this.io, `Current page URL: ${currentUrl}`, "info");

        await browser.close();
        return [];
      }

      await browser.close();

      emitLog(
        this.io,
        `Scraped ${matches.length} matches. Saving to database...`,
        "info",
      );

      // Add date and default status to each match
      const matchesWithMetadata = matches.map((match) => ({
        ...match,
        matchDate: date,
        status: "scheduled",
        h2hScraped: false,
      }));

      // Save to database
      const savedMatches =
        await this.dbService.saveMatches(matchesWithMetadata);

      emitLog(
        this.io,
        `✓ Successfully saved ${savedMatches.length} matches to database`,
        "success",
      );

      // AUTOMATED CHAIN: Automatically scrape H2H for all new matches
      if (autoChainH2H) {
        emitLog(
          this.io,
          `🔄 Starting automatic H2H scraping chain for ${savedMatches.length} matches...`,
          "info",
        );
        await this._autoChainH2HScraping(savedMatches);
      }

      return savedMatches;
    } catch (error) {
      emitLog(this.io, `Error scraping matches: ${error.message}`, "error");
      console.error("Scrape matches error:", error);
      throw error;
    }
  }

  /**
   * Scrape H2H and form data for a specific match
   * Surgically extracts three distinct sections: HOME_FORM, AWAY_FORM, DIRECT_H2H
   * Implements idempotency - checks h2hScraped flag first
   * @param {number} matchId - Database match ID
   * @param {string} flashscoreId - FlashScore match identifier
   * @returns {Promise<Object>} Grouped H2H data object
   */
  async scrapeH2HAndForm(matchId, flashscoreId) {
    let match; // Declare outside try block so it's accessible in catch
    let browser; // Declare here for proper cleanup in catch

    try {
      // Check if H2H already scraped (idempotency)
      match = await this.dbService.getMatchById(matchId);

      if (!match) {
        throw new Error(`Match with ID ${matchId} not found`);
      }

      if (match.h2hScraped) {
        emitLog(
          this.io,
          `✓ H2H already synced: ${match.homeTeam} vs ${match.awayTeam}`,
          "success",
        );
        return await this.dbService.getH2HData(matchId);
      }

      emitLog(
        this.io,
        `🌐 Launching browser for ${match.homeTeam} vs ${match.awayTeam}...`,
        "info",
      );

      // Launch browser with stealth settings
      browser = await puppeteer.launch({
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-blink-features=AutomationControlled",
        ],
      });

      const page = await browser.newPage();

      // Set viewport and user agent
      await page.setViewport({ width: 1920, height: 1080 });
      await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      );

      emitLog(
        this.io,
        `🔗 Navigating to H2H page: ${match.homeTeam} vs ${match.awayTeam}...`,
        "info",
      );

      // Build H2H URL using the stored match URL (captures all 3 sections on one page)
      // Stored URL may be absolute (https://...) or relative (/match/football/...)
      // Need just the pathname so we can append h2h/overall/
      let urlBase;
      if (match.flashscoreUrl) {
        let pathname = match.flashscoreUrl;
        if (pathname.startsWith("http")) {
          // Extract just the path from the full URL, drop any query string
          pathname = new URL(pathname).pathname;
        }
        // Ensure trailing slash before appending h2h segment
        pathname = pathname.replace(/\/?$/, "/");
        urlBase = `https://www.flashscore.com${pathname}h2h/overall/`;
      } else {
        // Fallback for rows saved before flashscoreUrl was captured
        urlBase = `https://www.flashscore.com/match/${flashscoreId}/#/h2h/overall`;
      }

      emitLog(this.io, `🔗 H2H URL: ${urlBase}`, "info");
      await page.goto(urlBase, { waitUntil: "domcontentloaded", timeout: 60000 });

      // Wait for at least one H2H section to appear
      await page
        .waitForSelector(".h2h__section", { timeout: 15000 })
        .catch(() => null);

      const sectionCount = await page.$$eval(
        ".h2h__section",
        (els) => els.length,
      );
      emitLog(
        this.io,
        `✓ ${sectionCount}/3 H2H sections detected in DOM`,
        sectionCount === 3 ? "success" : "warning",
      );

      emitLog(
        this.io,
        `📊 Scanning H2H sections for ${match.homeTeam} vs ${match.awayTeam}...`,
        "info",
      );

      // DEBUG: Check what sections exist on the page
      const debugInfo = await page.evaluate((sel) => {
        const sections = document.querySelectorAll(sel);
        const sectionDetails = [];

        sections.forEach((section, index) => {
          // Get header text
          const headerSelectors = [
            ".wcl-headerSection_SGpOR span",
            '[data-testid="wcl-scores-overline-02"]',
            ".wcl-bold_NZXv6",
          ];

          let headerText = "";
          for (const hSel of headerSelectors) {
            const headerEl = section.querySelector(hSel);
            if (headerEl) {
              headerText = headerEl.textContent.trim();
              break;
            }
          }

          const rowCount = section.querySelectorAll(".h2h__row").length;

          sectionDetails.push({
            index,
            headerText,
            rowCount,
            hasRows: rowCount > 0,
          });
        });

        return {
          totalSections: sections.length,
          sections: sectionDetails,
        };
      }, selectors.H2H_SELECTORS.CONTAINERS);

      emitLog(
        this.io,
        `[DEBUG] Found ${debugInfo.totalSections} sections: ${JSON.stringify(debugInfo.sections)}`,
        "info",
      );

      // Validate selectors before extraction
      const validationResult = await this._validateH2HSelectors(page, match);

      if (validationResult.count === 0) {
        // Only fail if NO sections found at all
        await this._captureErrorScreenshot(
          page,
          match,
          "no_h2h_sections_found",
        );
        await browser.close();
        return { success: false, count: 0 };
      }

      // Proceed even if less than 3 sections (partial data is better than none)
      if (validationResult.count < 3) {
        await this._captureErrorScreenshot(page, match, "partial_h2h_sections");
      }

      // Scrape all three sections by index
      const allH2HData = await this._scrapeSectionsByIndex(
        page,
        matchId,
        match.homeTeam,
        match.awayTeam,
      );

      await browser.close();

      if (allH2HData.length === 0) {
        emitLog(
          this.io,
          `⚠️ No H2H data found for ${match.homeTeam} vs ${match.awayTeam}`,
          "warning",
        );
        return { success: false, count: 0 };
      }

      const homeCount = allH2HData.filter(
        (d) => d.sectionType === "HOME_FORM",
      ).length;
      const awayCount = allH2HData.filter(
        (d) => d.sectionType === "AWAY_FORM",
      ).length;
      const directCount = allH2HData.filter(
        (d) => d.sectionType === "DIRECT_H2H",
      ).length;

      emitLog(
        this.io,
        `💾 Saving ${allH2HData.length} H2H records (Home: ${homeCount}, Away: ${awayCount}, Direct: ${directCount})...`,
        "info",
      );

      // Save to database
      await this.dbService.saveH2HData(allH2HData);

      // Mark match as scraped
      await this.dbService.markH2HScraped(matchId);

      // Notify clients that this match's H2H is now synced
      if (this.io) {
        this.io.emit("h2h-synced", { matchId });
      }

      emitLog(
        this.io,
        `✓ H2H complete: ${match.homeTeam} vs ${match.awayTeam}`,
        "success",
      );

      // Return success result
      return { success: true, count: allH2HData.length };
    } catch (error) {
      // Close browser if it was opened
      if (browser) {
        try {
          await browser.close();
        } catch (closeError) {
          console.error("Error closing browser:", closeError);
        }
      }

      // Get match info safely (match declared outside try block)
      const matchInfo = match
        ? `${match.homeTeam} vs ${match.awayTeam}`
        : `matchId ${matchId}`;

      // Provide more specific error messages
      let errorType = "error";
      let errorMessage = error.message;

      if (error.message.includes("timeout")) {
        errorType = "warning";
        errorMessage = `Page load timeout (slow internet or site issues): ${error.message}`;
      } else if (error.message.includes("net::")) {
        errorType = "error";
        errorMessage = `Network error: ${error.message}`;
      }

      emitLog(
        this.io,
        `❌ Error scraping H2H for ${matchInfo}: ${errorMessage}`,
        errorType,
      );
      console.error("Scrape H2H error:", error);

      // Return failure result to allow automated chain to continue
      return { success: false, count: 0, error: error.message };
    }
  }

  /**
   * Validate H2H selectors on the page
   * Ensures exactly 3 containers are found before attempting extraction
   * @param {Page} page - Puppeteer page instance
   * @param {Object} match - Match object with team names for logging
   * @returns {Promise<{isValid: boolean, count: number}>}
   * @private
   */
  async _validateH2HSelectors(page, match) {
    try {
      const containerCount = await page.$$eval(
        selectors.H2H_SELECTORS.CONTAINERS,
        (sections) => sections.length,
      );

      if (containerCount === 3) {
        emitLog(
          this.io,
          `[Scraper]: Found all 3 H2H sections. Proceeding with full extraction...`,
          "success",
        );
        return { isValid: true, count: containerCount };
      } else if (containerCount > 0) {
        emitLog(
          this.io,
          `[Scraper]: Found ${containerCount}/3 H2H sections. Will scrape available data...`,
          "warning",
        );
        return { isValid: true, count: containerCount };
      } else {
        emitLog(
          this.io,
          `[Scraper]: ❌ Error - No H2H containers found for ${match.homeTeam} vs ${match.awayTeam}. Selectors may be outdated. Please update shared/selectors.js`,
          "error",
        );
        return { isValid: false, count: 0 };
      }
    } catch (error) {
      emitLog(
        this.io,
        `[Scraper]: ❌ Error validating selectors: ${error.message}`,
        "error",
      );
      return { isValid: false, count: 0 };
    }
  }

  /**
   * Capture error screenshot for debugging
   * Saves to server/logs/errors/ with timestamp and match info
   * @param {Page} page - Puppeteer page instance
   * @param {Object} match - Match object
   * @param {string} errorType - Type of error for filename
   * @private
   */
  async _captureErrorScreenshot(page, match, errorType) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename =
        `${errorType}_${match.homeTeam}_vs_${match.awayTeam}_${timestamp}.png`.replace(
          /[^a-z0-9_-]/gi,
          "_",
        );
      const screenshotPath = path.join(
        __dirname,
        "..",
        "logs",
        "errors",
        filename,
      );

      await page.screenshot({ path: screenshotPath, fullPage: true });

      emitLog(
        this.io,
        `📸 Screenshot captured: logs/errors/${filename}`,
        "info",
      );
    } catch (error) {
      console.error("Failed to capture screenshot:", error);
    }
  }

  /**
   * Scrape all H2H sections by dynamically identifying each section type from header text
   * FlashScore sections can appear in any order or be lazy-loaded
   * @param {Page} page - Puppeteer page instance
   * @param {number} parentMatchId - Parent match ID for foreign key
   * @param {string} homeTeam - Home team name for logging
   * @param {string} awayTeam - Away team name for logging
   * @returns {Promise<Array>} Combined array of all H2H data
   */
  async _scrapeSectionsByIndex(page, parentMatchId, homeTeam, awayTeam) {
    const allData = [];

    try {
      // Get all section containers (validation already done, this is for processing)
      const sectionCount = await page.$$eval(
        selectors.H2H_SELECTORS.CONTAINERS,
        (sections) => sections.length,
      );

      emitLog(this.io, `📋 Processing ${sectionCount} H2H sections...`, "info");

      // Iterate through each section and identify by header text
      for (let i = 0; i < sectionCount; i++) {
        // Dynamically determine section type by reading header text
        const sectionInfo = await page.evaluate(
          (containerSel, index, home, away) => {
            const sections = document.querySelectorAll(containerSel);
            if (index >= sections.length) return null;

            const section = sections[index];

            // Find header text - FlashScore uses various selectors
            const headerSelectors = [
              ".wcl-headerSection_SGpOR span",
              '[data-testid="wcl-scores-overline-02"]',
              ".wcl-bold_NZXv6",
              "span.wcl-scores-overline-02_bpqU7",
            ];

            let headerText = "";
            for (const sel of headerSelectors) {
              const headerEl = section.querySelector(sel);
              if (headerEl && headerEl.textContent.trim()) {
                headerText = headerEl.textContent.trim();
                break;
              }
            }

            // Determine section type from header text
            let sectionType = null;
            let label = "";

            if (
              headerText.toLowerCase().includes("head-to-head") ||
              headerText.toLowerCase().includes("head to head")
            ) {
              sectionType = "DIRECT_H2H";
              label = "Direct H2H";
            } else if (
              headerText.includes(home) ||
              (headerText.toLowerCase().includes("last matches") &&
                headerText.includes(home))
            ) {
              sectionType = "HOME_FORM";
              label = `${home} recent form`;
            } else if (
              headerText.includes(away) ||
              (headerText.toLowerCase().includes("last matches") &&
                headerText.includes(away))
            ) {
              sectionType = "AWAY_FORM";
              label = `${away} recent form`;
            }

            return { sectionType, label, headerText };
          },
          selectors.H2H_SELECTORS.CONTAINERS,
          i,
          homeTeam,
          awayTeam,
        );

        if (!sectionInfo || !sectionInfo.sectionType) {
          emitLog(
            this.io,
            `⚠️ Could not identify section ${i + 1} (header: "${sectionInfo?.headerText || "unknown"}") - skipping`,
            "warning",
          );
          continue;
        }

        const { sectionType, label } = sectionInfo;

        // Click "Show more" button (verified selector: button.wclButtonLink--h2h)
        // Uses Puppeteer's element handle so it auto-scrolls into view before clicking
        try {
          const showMoreBtn = await page.evaluateHandle(
            (containerSel, index) => {
              const sections = document.querySelectorAll(containerSel);
              if (index >= sections.length) return null;
              const section = sections[index];
              return section.querySelector("button.wclButtonLink--h2h") || null;
            },
            selectors.H2H_SELECTORS.CONTAINERS,
            i,
          );

          const btnElement = showMoreBtn.asElement();
          if (btnElement) {
            // Scroll into view so Puppeteer's click() lands correctly
            await btnElement.evaluate((el) =>
              el.scrollIntoView({ block: "center" }),
            );
            await new Promise((resolve) => setTimeout(resolve, 300));
            await btnElement.click();
            // Wait for new rows to render
            await new Promise((resolve) => setTimeout(resolve, 1200));
          }
        } catch (showMoreError) {
          // Non-fatal – section may not have a "show more" button
        }

        emitLog(this.io, `📊 Extracting ${label}...`, "info");

        // Extract data from this section
        const sectionData = await page.evaluate(
          (
            containerSel,
            rowSel,
            dateSel,
            participantSel,
            resultSel,
            eventSel,
            index,
            secType,
            parentId,
          ) => {
            const sections = document.querySelectorAll(containerSel);
            if (index >= sections.length) return [];

            const section = sections[index];
            const rows = section.querySelectorAll(rowSel);
            const extracted = [];

            rows.forEach((row) => {
              try {
                const dateText = row
                  .querySelector(dateSel)
                  ?.textContent?.trim();
                const participants = Array.from(
                  row.querySelectorAll(participantSel),
                );
                const homeTeam = participants[0]?.textContent?.trim();
                const awayTeam = participants[1]?.textContent?.trim();

                // Extract scores from individual span elements within .h2h__result
                // Structure: <span class="h2h__result"><span>0</span><span>1</span></span>
                const resultContainer = row.querySelector(resultSel);
                const scoreSpans =
                  resultContainer?.querySelectorAll("span") || [];
                const homeScore = scoreSpans[0]?.textContent?.trim();
                const awayScore = scoreSpans[1]?.textContent?.trim();
                // For backward compatibility with DataCleaner, combine as "homeScore awayScore"
                const scoreText =
                  homeScore && awayScore ? `${homeScore} ${awayScore}` : null;

                const competition = row
                  .querySelector(eventSel)
                  ?.textContent?.trim();

                if (homeTeam && awayTeam) {
                  extracted.push({
                    matchDate: dateText,
                    homeTeam,
                    awayTeam,
                    scoreText,
                    competition: competition || "Unknown",
                    sectionType: secType,
                    parentMatchId: parentId,
                  });
                }
              } catch (err) {
                console.error("Error extracting row:", err);
              }
            });

            return extracted.slice(0, 10); // Limit to 10 matches per section
          },
          selectors.H2H_SELECTORS.CONTAINERS,
          selectors.H2H_SELECTORS.ROW,
          selectors.H2H_SELECTORS.DATE,
          selectors.H2H_SELECTORS.PARTICIPANT,
          selectors.H2H_SELECTORS.RESULT,
          selectors.H2H_SELECTORS.EVENT,
          i,
          sectionType,
          parentMatchId,
        );

        // Parse scores and dates
        const cleanedData = sectionData.map((match) => {
          const { homeScore, awayScore } = DataCleaner.parseScore(
            match.scoreText,
          );
          const parsedDate = DataCleaner.parseDate(match.matchDate);

          return {
            parentMatchId: match.parentMatchId,
            sectionType: match.sectionType,
            matchDate: parsedDate || new Date().toISOString().split("T")[0],
            homeTeam: DataCleaner.cleanTeamName(match.homeTeam),
            awayTeam: DataCleaner.cleanTeamName(match.awayTeam),
            homeScore,
            awayScore,
            competition: match.competition,
          };
        });

        if (cleanedData.length === 0) {
          emitLog(
            this.io,
            `⚠️ No rows found in ${label} - check selectors.H2H_SELECTORS.ROW in shared/selectors.js`,
            "warning",
          );
        } else {
          emitLog(
            this.io,
            `✓ Extracted ${cleanedData.length} matches from ${label}`,
            "success",
          );
        }

        allData.push(...cleanedData);
      }

      return allData;
    } catch (error) {
      emitLog(
        this.io,
        `❌ Error scraping H2H sections: ${error.message}`,
        "error",
      );
      console.error("Scrape sections error:", error);
      return [];
    }
  }

  /**
   * DEPRECATED: Old method kept for reference
   * Use _scrapeSectionsByIndex instead
   */
  async _scrapeSection(
    page,
    containerSelector,
    sectionType,
    parentMatchId,
    maxRows = 10,
  ) {
    try {
      // Check if container exists
      const containerExists = await page.$(containerSelector);

      if (!containerExists) {
        // Try alternative selector
        const altSelector = `${containerSelector}_ALT`;
        if (selectors[altSelector]) {
          const altExists = await page.$(selectors[altSelector]);
          if (altExists) {
            containerSelector = selectors[altSelector];
          } else {
            console.log(`Container ${containerSelector} not found`);
            return [];
          }
        } else {
          return [];
        }
      }

      // Try to expand matches if "Show more" button exists
      await ensureMinimumMatches(
        page,
        containerSelector,
        selectors.SHOW_MORE_BUTTON,
        selectors.H2H_MATCH_ROW_SELECTOR,
        maxRows,
      );

      // Extract match data from the section
      const matches = await page.evaluate(
        (
          container,
          rowSel,
          dateSel,
          homeSel,
          awaySel,
          scoreSel,
          compSel,
          secType,
          parentId,
        ) => {
          const rows = document.querySelectorAll(`${container} ${rowSel}`);
          const extracted = [];

          rows.forEach((row, index) => {
            try {
              const dateText = row.querySelector(dateSel)?.textContent?.trim();
              const homeTeam = row.querySelector(homeSel)?.textContent?.trim();
              const awayTeam = row.querySelector(awaySel)?.textContent?.trim();
              const scoreText = row
                .querySelector(scoreSel)
                ?.textContent?.trim();
              const competition = row
                .querySelector(compSel)
                ?.textContent?.trim();

              if (homeTeam && awayTeam) {
                extracted.push({
                  matchDate: dateText,
                  homeTeam,
                  awayTeam,
                  scoreText,
                  competition: competition || "Unknown",
                  sectionType: secType,
                  parentMatchId: parentId,
                });
              }
            } catch (err) {
              console.error("Error extracting row:", err);
            }
          });

          return extracted.slice(0, 10); // Limit to 10 matches
        },
        containerSelector,
        selectors.H2H_MATCH_ROW_SELECTOR,
        selectors.H2H_MATCH_DATE_SELECTOR,
        selectors.H2H_HOME_TEAM_SELECTOR,
        selectors.H2H_AWAY_TEAM_SELECTOR,
        selectors.H2H_SCORE_SELECTOR,
        selectors.H2H_COMPETITION_SELECTOR,
        sectionType,
        parentMatchId,
      );

      // Parse scores and dates using DataCleaner
      const cleanedMatches = matches.map((match) => {
        const { homeScore, awayScore } = DataCleaner.parseScore(
          match.scoreText,
        );
        const parsedDate = DataCleaner.parseDate(match.matchDate);

        return {
          parentMatchId: match.parentMatchId,
          sectionType: match.sectionType,
          matchDate: parsedDate || new Date().toISOString().split("T")[0],
          homeTeam: DataCleaner.cleanTeamName(match.homeTeam),
          awayTeam: DataCleaner.cleanTeamName(match.awayTeam),
          homeScore,
          awayScore,
          competition: match.competition,
        };
      });

      return cleanedMatches;
    } catch (error) {
      console.error(`Error scraping section ${sectionType}:`, error);
      return [];
    }
  }

  /**
   * AUTOMATED WORKFLOW: Loop through matches and scrape H2H for those not yet scraped
   * This creates the chained scraping workflow
   * @param {Array} matches - Array of match objects
   * @returns {Promise<void>}
   */
  async _autoChainH2HScraping(matches) {
    try {
      // Filter matches that haven't been scraped yet
      const unscrapedMatches = matches.filter((match) => !match.h2hScraped);

      if (unscrapedMatches.length === 0) {
        emitLog(
          this.io,
          `✓ All ${matches.length} matches already have H2H data synced`,
          "success",
        );
        return;
      }

      emitLog(
        this.io,
        `📊 Processing H2H data for ${unscrapedMatches.length} of ${matches.length} matches...`,
        "info",
      );

      // Process each match sequentially to avoid overwhelming the site
      for (let i = 0; i < unscrapedMatches.length; i++) {
        const match = unscrapedMatches[i];
        const matchNumber = i + 1;
        const totalMatches = unscrapedMatches.length;

        try {
          emitLog(
            this.io,
            `⚽ Scraping Match ${matchNumber} of ${totalMatches}: ${match.homeTeam} vs ${match.awayTeam}...`,
            "info",
          );

          // Scrape H2H data for this match
          const result = await this.scrapeH2HAndForm(
            match.id,
            match.flashscoreId,
          );

          if (result.success) {
            emitLog(
              this.io,
              `✓ H2H Synced to MySQL: ${match.homeTeam} vs ${match.awayTeam} (${result.count} records)`,
              "success",
            );
          } else {
            emitLog(
              this.io,
              `⚠️ H2H scraping incomplete for ${match.homeTeam} vs ${match.awayTeam}`,
              "warning",
            );
          }

          // Delay between matches to prevent IP bans
          if (i < unscrapedMatches.length - 1) {
            await delay(3000); // 3 second delay between matches
          }
        } catch (error) {
          emitLog(
            this.io,
            `✗ Failed to scrape H2H for ${match.homeTeam} vs ${match.awayTeam}: ${error.message}`,
            "error",
          );
          // Continue with next match even if one fails
          continue;
        }
      }

      emitLog(
        this.io,
        `🎉 Automated H2H chain complete! Processed ${unscrapedMatches.length} matches.`,
        "success",
      );
    } catch (error) {
      emitLog(
        this.io,
        `✗ Error in automated H2H chain: ${error.message}`,
        "error",
      );
      console.error("Auto-chain H2H error:", error);
    }
  }
}

module.exports = ScraperService;
