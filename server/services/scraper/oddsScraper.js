const fs = require("fs");
const path = require("path");
const selectors = require("../../../shared/selectors");
const { emitLog } = require("../../utils/socketLogger");
const { delayWithJitter } = require("../../utils/delay");
const scrapingConfig = require("../../config/config.json").scraping;

/**
 * Scrape 1X2 odds from the FlashScore ODDS tab.
 * Re-uses the already-open Puppeteer page used for fixture scraping.
 *
 * SELECTOR NOTE: On first run this method saves an HTML snapshot to
 * server/logs/errors/odds_tab_<date>.html so you can open it in a browser
 * and use DevTools to verify / correct the selectors in shared/selectors.js.
 *
 * @param {Page} page - Open Puppeteer page already on the football fixtures page
 * @param {string} date - Date string (YYYY-MM-DD) used only for the debug filename
 * @param {SocketIO.Server} io - Socket.io instance for emitting logs
 * @returns {Promise<Map<string, {oddsHome: number|null, oddsDraw: number|null, oddsAway: number|null}>>}
 *   A Map keyed by flashscoreId
 */
async function scrapeOddsFromPage(page, date, io) {
  const oddsMap = new Map();

  try {
    emitLog(io, `🎯 Clicking ODDS tab to load 1X2 odds...`, "info");

    // Primary selector confirmed from DOM inspection (data-analytics-alias="odds")
    // Fallback: find any clickable element whose visible text is "Odds"
    let oddsTabClicked = false;

    try {
      const el = await page.$(selectors.ODDS_SELECTORS.ODDS_TAB);
      if (el) {
        await el.click();
        oddsTabClicked = true;
        emitLog(io, `✓ ODDS tab clicked`, "success");
      }
    } catch (_e) {
      /* try fallback */
    }

    // Fallback: any div/a/button whose text content is "Odds" or "ODDS"
    if (!oddsTabClicked) {
      try {
        oddsTabClicked = await page.evaluate(() => {
          const els = Array.from(document.querySelectorAll("div, a, button"));
          const oddsEl = els.find(
            (el) => el.textContent.trim().toUpperCase() === "ODDS",
          );
          if (oddsEl) {
            oddsEl.click();
            return true;
          }
          return false;
        });
        if (oddsTabClicked) {
          emitLog(io, `✓ ODDS tab clicked via text fallback`, "success");
        }
      } catch (_e) {
        /* non-fatal */
      }
    }

    if (!oddsTabClicked) {
      emitLog(
        io,
        `⚠️ ODDS tab not found — skipping odds scrape. Check the HTML snapshot to update ODDS_SELECTORS.`,
        "warning",
      );
    } else {
      // Wait for odds values to render
      await delayWithJitter(
        scrapingConfig.delays.oddsTabWait,
        scrapingConfig.delays.jitterMax,
      );
    }

    // Save HTML snapshot only when DEBUG_SCRAPER=true (used to verify/update selectors)
    if (process.env.DEBUG_SCRAPER === "true") {
      const dateFormatted = date.replace(/-/g, "");
      const oddsHtmlPath = path.join(
        __dirname,
        "../..",
        "logs",
        "errors",
        `odds_tab_${dateFormatted}.html`,
      );
      const oddsHtml = await page.content();
      fs.writeFileSync(oddsHtmlPath, oddsHtml);
      emitLog(io, `📄 ODDS tab HTML saved: ${oddsHtmlPath}`, "info");
    }

    if (!oddsTabClicked) {
      return oddsMap;
    }

    // Wait for odds cells to appear in the DOM before extracting.
    // The delayWithJitter above was never the real wait — page.content() was
    // inadvertently providing ~300ms of extra delay before it was gated behind
    // DEBUG_SCRAPER. waitForSelector exits the instant the first cell renders.
    await page
      .waitForSelector(".event__odd--odd1", { timeout: 8000 })
      .catch(() => null);

    // Extract odds for every match row, matching by flashscoreId
    // Verified DOM structure (2026-03-12):
    //   <div class="odds__odd event__odd--odd1"><svg/><span class="up">3.15</span></div>
    //   <div class="odds__odd event__odd--odd2"><svg/><span class="down">3.05</span></div>
    //   <div class="odds__odd event__odd--odd3"><svg/><span>2.47</span></div>
    const extracted = await page.evaluate(() => {
      const rows = document.querySelectorAll(".event__match");
      const results = [];

      const parseOdds = (text) => {
        const val = parseFloat((text || "").trim());
        return isNaN(val) ? null : val;
      };

      rows.forEach((row) => {
        const idAttr = row.getAttribute("id"); // e.g. "g_1_hOA1PhIN"
        const flashscoreId = idAttr ? idAttr.split("_")[2] : null;
        if (!flashscoreId) return;

        // Each odds div contains a nested <span> with the numeric value
        const odd1 = row.querySelector(".event__odd--odd1 span");
        const odd2 = row.querySelector(".event__odd--odd2 span");
        const odd3 = row.querySelector(".event__odd--odd3 span");

        results.push({
          flashscoreId,
          oddsHome: odd1 ? parseOdds(odd1.textContent) : null,
          oddsDraw: odd2 ? parseOdds(odd2.textContent) : null,
          oddsAway: odd3 ? parseOdds(odd3.textContent) : null,
        });
      });

      return results;
    });

    let oddsFoundCount = 0;
    for (const item of extracted) {
      oddsMap.set(item.flashscoreId, {
        oddsHome: item.oddsHome,
        oddsDraw: item.oddsDraw,
        oddsAway: item.oddsAway,
      });
      if (
        item.oddsHome !== null ||
        item.oddsDraw !== null ||
        item.oddsAway !== null
      ) {
        oddsFoundCount++;
      }
    }

    if (oddsFoundCount > 0) {
      emitLog(
        io,
        `✓ Captured 1X2 odds for ${oddsFoundCount}/${extracted.length} matches`,
        "success",
      );
    } else {
      emitLog(
        io,
        `⚠️ Odds tab loaded but no odds values extracted. Re-run with DEBUG_SCRAPER=true to save an HTML snapshot and update ODDS_SELECTORS in shared/selectors.js`,
        "warning",
      );
    }
  } catch (error) {
    emitLog(
      io,
      `⚠️ Odds scraping failed (non-fatal): ${error.message}`,
      "warning",
    );
  }

  return oddsMap;
}

module.exports = { scrapeOddsFromPage };
