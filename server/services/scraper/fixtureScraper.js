const fs = require("fs");
const path = require("path");
const selectors = require("../../../shared/selectors");
const { emitLog } = require("../../utils/socketLogger");
const { delayWithJitter } = require("../../utils/delay");
const scrapingConfig = require("../../config/config.json").scraping;
const { launchFixtureBrowser, setupFixturePage } = require("./browser");
const { scrapeOddsFromPage } = require("./oddsScraper");
const { autoChainH2HScraping } = require("./h2hQueue");

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
 * @param {SocketIO.Server} io - Socket.io instance for emitting logs
 * @param {DatabaseService} dbService
 * @returns {Promise<Array>} Array of match objects
 */
async function scrapeMatchesByDate(
  date,
  leagues = [],
  autoChainH2H = true,
  io,
  dbService,
) {
  try {
    emitLog(io, `🔍 Checking database for matches on ${date}...`, "info");

    // Check if matches already exist in DB (idempotency)
    const existingMatches = await dbService.getMatchesByDate(date);

    if (existingMatches && existingMatches.length > 0) {
      emitLog(
        io,
        `✓ Found ${existingMatches.length} matches in database for ${date}`,
        "success",
      );

      // AUTOMATED CHAIN: Check if H2H scraping is needed
      if (autoChainH2H) {
        await autoChainH2HScraping(existingMatches, io, dbService);
      }

      return existingMatches;
    }

    emitLog(io, "No cached data found. Launching browser...", "info");

    // Launch browser with enhanced stealth settings
    const browser = await launchFixtureBrowser();
    const page = await setupFixturePage(browser);

    emitLog(io, `Navigating to FlashScore homepage first...`, "info");

    // First, visit the homepage to establish a session (more human-like)
    await page.goto("https://www.flashscore.com/", {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    await delayWithJitter(600, scrapingConfig.delays.jitterMax); // Wait like a human would

    // Simulate human-like behavior: scroll a bit
    await page.evaluate(() => {
      window.scrollTo(0, 200);
    });

    await delayWithJitter(300, 200);

    emitLog(io, `Navigating to FlashScore for date ${date}...`, "info");

    // FlashScore shows today's matches by default at the main football page
    // For different dates, we'll need to interact with the date picker
    const url = "https://www.flashscore.com/football/";
    const dateFormatted = date.replace(/-/g, ""); // Used for file naming

    emitLog(io, `URL: ${url}`, "info");

    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    await delayWithJitter(
      scrapingConfig.delays.fixturePageLoad,
      scrapingConfig.delays.jitterMax,
    ); // Give time for JS to load matches

    // Check if page loaded successfully
    const pageText = await page.evaluate(() => document.body.innerText);
    if (
      pageText.includes("requested page can't be displayed") ||
      pageText.includes("Error:")
    ) {
      emitLog(io, `❌ FlashScore returned error page`, "error");
      await browser.close();
      return [];
    }

    emitLog(io, `✓ Successfully loaded FlashScore`, "success");

    // TODO: Check if we need to select a different date
    // For now, we'll assume we're getting today's matches
    const today = new Date().toISOString().split("T")[0];
    if (date !== today) {
      emitLog(
        io,
        `⚠️ Date picker interaction not yet implemented. Showing today's matches instead of ${date}`,
        "warning",
      );
    }

    // Wait for matches to load
    await delayWithJitter(
      scrapingConfig.delays.fixturePageLoad,
      scrapingConfig.delays.jitterMax,
    );

    // DEBUG: Get page info
    const pageTitle = await page.title();
    emitLog(io, `Page Title: ${pageTitle}`, "info");

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
          emitLog(io, `✓ Clicked cookie consent button: ${selector}`, "info");
          await delayWithJitter(400, 200);
          break;
        }
      }
    } catch (err) {
      emitLog(io, `No cookie popup found (this is OK)`, "info");
    }

    // DEBUG: Save HTML content for inspection
    const htmlContent = await page.content();
    const htmlPath = path.join(
      __dirname,
      "../..",
      "logs",
      "errors",
      `page_${dateFormatted}.html`,
    );
    fs.writeFileSync(htmlPath, htmlContent);
    emitLog(io, `📄 HTML saved: ${htmlPath}`, "info");

    // Take screenshot for debugging (will help verify page loaded correctly)
    const screenshotPath = path.join(
      __dirname,
      "../..",
      "logs",
      "errors",
      `scrape_${dateFormatted}.png`,
    );
    await page.screenshot({ path: screenshotPath, fullPage: true });
    emitLog(io, `📸 Screenshot saved: ${screenshotPath}`, "info");

    emitLog(io, "Scraping match fixtures from FlashScore...", "info");

    // DEBUG: Check what selectors match
    const selectorDebug = await page.evaluate((sel) => {
      return {
        matchRowCount: document.querySelectorAll(sel.MATCH_ROW_SELECTOR).length,
        scheduledMatchCount: document.querySelectorAll(
          ".event__match--scheduled",
        ).length,
        liveMatchCount: document.querySelectorAll(".event__match--live").length,
        allMatchCount: document.querySelectorAll(".event__match").length,
        homeTeamCount: document.querySelectorAll(sel.HOME_TEAM_SELECTOR).length,
        eventCount: document.querySelectorAll('[id^="g_1_"]').length,
      };
    }, selectors);

    emitLog(
      io,
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
      emitLog(io, `⚠️ No matches found for ${date}`, "warning");

      // Take screenshot for debugging when no matches found
      const errorScreenshotPath = path.join(
        __dirname,
        "../..",
        "logs",
        "errors",
        `no_matches_${dateFormatted}_${Date.now()}.png`,
      );
      await page.screenshot({ path: errorScreenshotPath, fullPage: true });
      emitLog(
        io,
        `📸 Debug screenshot saved: ${errorScreenshotPath}`,
        "warning",
      );

      // Log page URL for verification
      const currentUrl = page.url();
      emitLog(io, `Current page URL: ${currentUrl}`, "info");

      await browser.close();
      return [];
    }

    emitLog(
      io,
      `Scraped ${matches.length} matches. Scraping odds from ODDS tab...`,
      "info",
    );

    // ODDS SCRAPING: re-use the same page to grab 1X2 odds before closing
    const oddsMap = await scrapeOddsFromPage(page, date, io);

    await browser.close();

    emitLog(io, `Saving ${matches.length} matches to database...`, "info");

    // Add date, default status, and merged odds to each match
    const matchesWithMetadata = matches.map((match) => ({
      ...match,
      matchDate: date,
      status: "scheduled",
      h2hScraped: false,
      ...(oddsMap.get(match.flashscoreId) || {}),
    }));

    // Save to database
    const savedMatches = await dbService.saveMatches(matchesWithMetadata);

    emitLog(
      io,
      `✓ Successfully saved ${savedMatches.length} matches to database`,
      "success",
    );

    // AUTOMATED CHAIN: Automatically scrape H2H for all new matches
    if (autoChainH2H) {
      emitLog(
        io,
        `🔄 Starting automatic H2H scraping chain for ${savedMatches.length} matches...`,
        "info",
      );
      await autoChainH2HScraping(savedMatches, io, dbService);
    }

    return savedMatches;
  } catch (error) {
    emitLog(io, `Error scraping matches: ${error.message}`, "error");
    console.error("Scrape matches error:", error);
    throw error;
  }
}

module.exports = { scrapeMatchesByDate };
