const selectors = require("../../../shared/selectors");
const { launchH2HQueueBrowser, setupH2HPage } = require("./browser");
const {
  validateH2HSelectors,
  scrapeSectionsByIndex,
} = require("./h2hExtractor");
const { captureErrorScreenshot } = require("./screenshotService");
const { emitLog } = require("../../utils/socketLogger");
const scrapingConfig = require("../../config/config.json").scraping;
const { fetchH2HFeed } = require("./feed/h2hFeedFetcher");
const { parseH2HFeed } = require("./feed/h2hFeedParser");

/**
 * Scrape H2H and form data for a specific match
 * Surgically extracts three distinct sections: HOME_FORM, AWAY_FORM, DIRECT_H2H
 * Implements idempotency - checks h2hScraped flag first
 * @param {number} matchId - Database match ID
 * @param {string} flashscoreId - FlashScore match identifier
 * @param {SocketIO.Server} io - Socket.io instance for emitting logs
 * @param {DatabaseService} dbService
 * @returns {Promise<Object>} Grouped H2H data object
 */
async function scrapeH2HAndForm(matchId, flashscoreId, io, dbService) {
  let match; // Declare outside try block so it's accessible in catch
  let browser; // Declare here for proper cleanup in catch

  try {
    // Check if H2H already scraped (idempotency)
    match = await dbService.getMatchById(matchId);

    if (!match) {
      throw new Error(`Match with ID ${matchId} not found`);
    }

    if (match.h2hScraped) {
      emitLog(
        io,
        `✓ H2H already synced: ${match.homeTeam} vs ${match.awayTeam}`,
        "success",
      );
      return await dbService.getH2HData(matchId);
    }

    emitLog(
      io,
      `🌐 Launching browser for ${match.homeTeam} vs ${match.awayTeam}...`,
      "info",
    );

    // Launch browser and create a resource-optimised page
    browser = await launchH2HQueueBrowser();
    const page = await setupH2HPage(browser);

    emitLog(
      io,
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

    emitLog(io, `🔗 H2H URL: ${urlBase}`, "info");
    await page.goto(urlBase, {
      waitUntil: "domcontentloaded",
      timeout: scrapingConfig.navTimeout || 60000,
    });

    // Wait for H2H sections to render after JS execution
    await page
      .waitForSelector(".h2h__section", { timeout: 15000 })
      .catch(() => null);

    const sectionCount = await page.$$eval(
      ".h2h__section",
      (els) => els.length,
    );
    emitLog(
      io,
      `✓ ${sectionCount}/3 H2H sections detected in DOM`,
      sectionCount === 3 ? "success" : "warning",
    );

    emitLog(
      io,
      `📊 Scanning H2H sections for ${match.homeTeam} vs ${match.awayTeam}...`,
      "info",
    );

    if (process.env.DEBUG_SCRAPER === "true") {
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
        io,
        `[DEBUG] Found ${debugInfo.totalSections} sections: ${JSON.stringify(debugInfo.sections)}`,
        "info",
      );
    }

    // Validate selectors before extraction
    const validationResult = await validateH2HSelectors(page, match, io);

    if (validationResult.count === 0) {
      // Only fail if NO sections found at all
      await captureErrorScreenshot(page, match, "no_h2h_sections_found", io);
      await browser.close();
      return { success: false, count: 0 };
    }

    // Proceed even if less than 3 sections (partial data is better than none)
    if (validationResult.count < 3) {
      await captureErrorScreenshot(page, match, "partial_h2h_sections", io);
    }

    // Scrape all three sections by index
    const allH2HData = await scrapeSectionsByIndex(
      page,
      matchId,
      match.homeTeam,
      match.awayTeam,
      io,
    );

    await browser.close();

    if (allH2HData.length === 0) {
      emitLog(
        io,
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
      io,
      `💾 Saving ${allH2HData.length} H2H records (Home: ${homeCount}, Away: ${awayCount}, Direct: ${directCount})...`,
      "info",
    );

    // Save to database
    await dbService.saveH2HData(allH2HData);

    // Mark match as scraped
    await dbService.markH2HScraped(matchId);

    // Notify clients that this match's H2H is now synced
    if (io) {
      io.emit("h2h-synced", { matchId });
    }

    emitLog(
      io,
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
      io,
      `❌ Error scraping H2H for ${matchInfo}: ${errorMessage}`,
      errorType,
    );
    console.error("Scrape H2H error:", error);

    // Return failure result to allow automated chain to continue
    return { success: false, count: 0, error: error.message };
  }
}

/**
 * Scrape H2H data via the FlashScore feed API (fast, no browser needed).
 * Classifies each parsed record into HOME_FORM, AWAY_FORM or DIRECT_H2H
 * based on team name matching against the parent match.
 * @param {Object} match - Match object from the database
 * @param {SocketIO.Server} io
 * @param {DatabaseService} dbService
 * @returns {Promise<Object>} { success, count }
 */
async function scrapeH2HViaFeed(match, io, dbService) {
  try {
    if (match.h2hScraped) {
      emitLog(
        io,
        `✓ H2H already synced: ${match.homeTeam} vs ${match.awayTeam}`,
        "success",
      );
      return { success: true, count: 0, skipped: true };
    }

    emitLog(
      io,
      `⚡ Feed fetch: ${match.homeTeam} vs ${match.awayTeam}...`,
      "info",
    );

    const rawText = await fetchH2HFeed(match.flashscoreId);
    const parsed = parseH2HFeed(rawText);

    if (parsed.length === 0) {
      emitLog(
        io,
        `⚠️ Feed returned no H2H data for ${match.homeTeam} vs ${match.awayTeam}`,
        "warning",
      );
      return { success: false, count: 0 };
    }

    // Classify each record into a section based on team name presence
    const homeLower = match.homeTeam.toLowerCase();
    const awayLower = match.awayTeam.toLowerCase();

    // Word-boundary-aware name match: prevents "van" matching inside "yerevan" etc.
    const teamNameMatches = (dbName, feedName) => {
      if (dbName === feedName) return true;
      const escDb = dbName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const escFeed = feedName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return (
        new RegExp(`\\b${escDb}\\b`).test(feedName) ||
        new RegExp(`\\b${escFeed}\\b`).test(dbName)
      );
    };

    const allH2HData = parsed.map((entry) => {
      const hLower = entry.homeTeam.toLowerCase();
      const aLower = entry.awayTeam.toLowerCase();

      const hasHome =
        teamNameMatches(homeLower, hLower) ||
        teamNameMatches(homeLower, aLower);

      const hasAway =
        teamNameMatches(awayLower, hLower) ||
        teamNameMatches(awayLower, aLower);

      let sectionType;
      if (hasHome && hasAway) {
        sectionType = "DIRECT_H2H";
      } else if (hasHome) {
        sectionType = "HOME_FORM";
      } else if (hasAway) {
        sectionType = "AWAY_FORM";
      } else {
        return null; // discard records that don't match either team
      }

      // Convert Unix timestamp to YYYY-MM-DD
      let matchDate = null;
      if (entry.timestamp) {
        const ts = parseInt(entry.timestamp, 10);
        if (!isNaN(ts)) {
          matchDate = new Date(ts * 1000).toISOString().split("T")[0];
        }
      }

      return {
        parentMatchId: match.id,
        sectionType,
        matchDate,
        homeTeam: entry.homeTeam,
        awayTeam: entry.awayTeam,
        homeScore: entry.homeGoals,
        awayScore: entry.awayGoals,
        competition: entry.competition,
      };
    });

    // Remove discarded records (neither team matched)
    const validH2HData = allH2HData.filter(Boolean);

    // Limit each section to 10 records
    const limitedH2HData = [
      ...validH2HData.filter((d) => d.sectionType === "HOME_FORM").slice(0, 10),
      ...validH2HData.filter((d) => d.sectionType === "AWAY_FORM").slice(0, 10),
      ...validH2HData
        .filter((d) => d.sectionType === "DIRECT_H2H")
        .slice(0, 10),
    ];

    const homeCount = limitedH2HData.filter(
      (d) => d.sectionType === "HOME_FORM",
    ).length;
    const awayCount = limitedH2HData.filter(
      (d) => d.sectionType === "AWAY_FORM",
    ).length;
    const directCount = limitedH2HData.filter(
      (d) => d.sectionType === "DIRECT_H2H",
    ).length;

    emitLog(
      io,
      `💾 Feed: Saving ${limitedH2HData.length} records (Home: ${homeCount}, Away: ${awayCount}, Direct: ${directCount})...`,
      "info",
    );

    await dbService.saveH2HData(limitedH2HData);
    await dbService.markH2HScraped(match.id);

    if (io) {
      io.emit("h2h-synced", { matchId: match.id });
    }

    emitLog(
      io,
      `✓ H2H Synced (feed): ${match.homeTeam} vs ${match.awayTeam} (${limitedH2HData.length} records)`,
      "success",
    );

    return { success: true, count: limitedH2HData.length };
  } catch (error) {
    emitLog(
      io,
      `⚠️ Feed scrape failed for ${match.homeTeam} vs ${match.awayTeam}: ${error.message}`,
      "warning",
    );
    return { success: false, count: 0, error: error.message };
  }
}

/**
 * Scrape H2H with selectable mode.
 * @param {Object} match - Match object from the database
 * @param {SocketIO.Server} io
 * @param {DatabaseService} dbService
 * @param {"feed"|"puppeteer"|"auto"} mode
 * @returns {Promise<Object>} { success, count }
 */
async function scrapeH2H(match, io, dbService, mode = "auto") {
  if (mode === "feed") {
    return scrapeH2HViaFeed(match, io, dbService);
  }

  if (mode === "puppeteer") {
    return scrapeH2HAndForm(match.id, match.flashscoreId, io, dbService);
  }

  // auto: try feed first, fall back to Puppeteer
  const feedResult = await scrapeH2HViaFeed(match, io, dbService);
  if (feedResult.success) return feedResult;

  emitLog(
    io,
    `🔁 Feed failed, falling back to Puppeteer for ${match.homeTeam} vs ${match.awayTeam}...`,
    "info",
  );
  return scrapeH2HAndForm(match.id, match.flashscoreId, io, dbService);
}

module.exports = { scrapeH2HAndForm, scrapeH2HViaFeed, scrapeH2H };
