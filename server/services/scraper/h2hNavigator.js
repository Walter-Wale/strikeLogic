const {
  validateH2HSelectors,
  scrapeSectionsByIndex,
} = require("./h2hExtractor");
const { captureErrorScreenshot } = require("./screenshotService");
const { emitLog } = require("../../utils/socketLogger");
const { delayWithJitter } = require("../../utils/delay");
const scrapingConfig = require("../../config/config.json").scraping;

/**
 * Navigate a page to the H2H URL for a match.
 * Returns true if the page loaded and at least one H2H section appeared.
 * Uses 120 s navigation timeout so slow connections don't time out.
 * @param {import('puppeteer').Page} page
 * @param {Object} match
 * @param {SocketIO.Server} io
 * @returns {Promise<boolean>}
 */
async function navigateH2HPage(page, match, io) {
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
    urlBase = `https://www.flashscore.com/match/${match.flashscoreId}/#/h2h/overall`;
  }

  emitLog(io, `🔗 H2H URL: ${urlBase}`, "info");

  const navTimeout = scrapingConfig.navTimeout || 60000;
  const maxAttempts = 2;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      if (attempt > 1) {
        emitLog(
          io,
          `🔄 Retry ${attempt}/${maxAttempts} for ${match.homeTeam} vs ${match.awayTeam} (waiting 8s...)`,
          "info",
        );
        await delayWithJitter(8000, 2000);
      }

      await page.goto(urlBase, {
        waitUntil: "domcontentloaded",
        timeout: navTimeout,
      });

      // Wait for H2H sections — fresh page so no interception deadlock risk.
      await page
        .waitForSelector(".h2h__section", { timeout: 8000 })
        .catch(() => null);

      return true;
    } catch (err) {
      const isLastAttempt = attempt === maxAttempts;
      emitLog(
        io,
        isLastAttempt
          ? `❌ Navigation failed for ${match.homeTeam} vs ${match.awayTeam}: ${err.message}`
          : `⚠️ Navigation attempt ${attempt} failed for ${match.homeTeam} vs ${match.awayTeam}: ${err.message}`,
        isLastAttempt ? "error" : "warning",
      );
      if (isLastAttempt) return false;
    }
  }

  return false;
}

/**
 * Extract, validate and persist H2H data from an already-loaded page.
 * Does not touch the browser — only works with the provided page.
 * @param {import('puppeteer').Page} page
 * @param {Object} match  - Full match object from the DB
 * @param {SocketIO.Server} io
 * @param {DatabaseService} dbService
 */
async function processH2HPage(page, match, io, dbService) {
  try {
    if (match.h2hScraped) {
      emitLog(
        io,
        `✓ H2H already synced: ${match.homeTeam} vs ${match.awayTeam}`,
        "success",
      );
      return;
    }

    const sectionCount = await page.$$eval(
      ".h2h__section",
      (els) => els.length,
    );
    emitLog(
      io,
      `✓ ${sectionCount}/3 H2H sections detected in DOM`,
      sectionCount === 3 ? "success" : "warning",
    );

    const validationResult = await validateH2HSelectors(page, match, io);
    if (validationResult.count === 0) {
      await captureErrorScreenshot(page, match, "no_h2h_sections_found", io);
      emitLog(
        io,
        `⚠️ H2H scraping incomplete for ${match.homeTeam} vs ${match.awayTeam}`,
        "warning",
      );
      return;
    }
    if (validationResult.count < 3) {
      await captureErrorScreenshot(page, match, "partial_h2h_sections", io);
    }

    const allH2HData = await scrapeSectionsByIndex(
      page,
      match.id,
      match.homeTeam,
      match.awayTeam,
      io,
    );

    if (allH2HData.length === 0) {
      emitLog(
        io,
        `⚠️ No H2H data found for ${match.homeTeam} vs ${match.awayTeam}`,
        "warning",
      );
      return;
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

    await dbService.saveH2HData(allH2HData);
    await dbService.markH2HScraped(match.id);

    if (io) {
      io.emit("h2h-synced", { matchId: match.id });
    }

    emitLog(
      io,
      `✓ H2H Synced to MySQL: ${match.homeTeam} vs ${match.awayTeam} (${allH2HData.length} records)`,
      "success",
    );
  } catch (error) {
    emitLog(
      io,
      `❌ Error processing H2H for ${match.homeTeam} vs ${match.awayTeam}: ${error.message}`,
      "error",
    );
  }
}

module.exports = { navigateH2HPage, processH2HPage };
