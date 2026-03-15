const { launchH2HQueueBrowser, setupH2HPage } = require("./browser");
const { navigateH2HPage, processH2HPage } = require("./h2hNavigator");
const { emitLog } = require("../../utils/socketLogger");
const { delayWithJitter } = require("../../utils/delay");
const scrapingConfig = require("../../config/config.json").scraping;

// Single global queue — all leagues share one sequential worker
const _h2hQueue = [];
let _queueRunning = false;

/**
 * AUTOMATED WORKFLOW: Add matches to the global H2H queue.
 * All leagues share one sequential worker so only one browser/tab accesses
 * the network at a time — safe for slow connections.
 * New matches are deduplicated against what is already queued.
 * If the worker is already running, matches are simply appended and will be
 * picked up automatically.
 * @param {Array} matches - Array of match objects
 * @param {SocketIO.Server} io
 * @param {DatabaseService} dbService
 * @returns {Promise<void>}
 */
async function autoChainH2HScraping(matches, io, dbService) {
  try {
    const unscrapedMatches = matches.filter((m) => !m.h2hScraped);

    if (unscrapedMatches.length === 0) {
      emitLog(
        io,
        `✓ All ${matches.length} matches already have H2H data synced`,
        "success",
      );
      return;
    }

    // Deduplicate against existing queue so re-selecting a league doesn't re-queue
    const existingIds = new Set(_h2hQueue.map((m) => m.id));
    const newMatches = unscrapedMatches.filter((m) => !existingIds.has(m.id));

    if (newMatches.length === 0) {
      emitLog(
        io,
        `ℹ️ All ${unscrapedMatches.length} matches already queued for H2H scraping`,
        "info",
      );
      return;
    }

    _h2hQueue.push(...newMatches);
    emitLog(
      io,
      `📥 Added ${newMatches.length} match(es) to H2H queue (total queued: ${_h2hQueue.length})`,
      "info",
    );

    // Worker already running — it will drain the queue automatically
    if (_queueRunning) {
      emitLog(
        io,
        `⏳ H2H worker already running — new matches will be processed in order`,
        "info",
      );
      return;
    }

    // Set flag SYNCHRONOUSLY before first await so no second league request
    // can slip through and launch a second parallel worker.
    _queueRunning = true;
    runH2HQueue(io, dbService).catch((err) => {
      console.error("H2H queue worker crashed:", err);
      _queueRunning = false;
    });
  } catch (error) {
    emitLog(io, `✗ Error queuing H2H chain: ${error.message}`, "error");
  }
}

/**
 * Single-page sequential queue worker.
 *
 * One browser and one page are reused for the entire queue — the page is
 * navigated to each match's H2H URL in turn using page.goto(), which avoids
 * the overhead of opening and closing new tabs.  Resource interception
 * (images / CSS / fonts / media) is set up in setupH2HPage() so only the
 * lightweight HTML + JS required for extraction is downloaded.
 *
 * After the queue drains the browser is closed.  If new items arrive while
 * the worker is running they are appended and will be picked up automatically
 * by the running loop.
 * @param {SocketIO.Server} io
 * @param {DatabaseService} dbService
 */
async function runH2HQueue(io, dbService) {
  // Flag already set synchronously in autoChainH2HScraping before this was called
  let browser;

  try {
    emitLog(
      io,
      `🚀 Starting H2H queue worker (${_h2hQueue.length} match(es) queued)...`,
      "info",
    );

    browser = await launchH2HQueueBrowser();

    let processed = 0;

    while (_h2hQueue.length > 0) {
      const match = _h2hQueue.shift();
      if (!match) break;

      const matchNum = ++processed;
      emitLog(
        io,
        `⚽ Processing match ${matchNum}: ${match.homeTeam} vs ${match.awayTeam}...`,
        "info",
      );

      // Fresh page per match — eliminates all request-interception state
      // corruption and renderer crash propagation between matches.
      const page = await setupH2HPage(browser);
      try {
        const navOk = await navigateH2HPage(page, match, io);
        if (navOk) {
          await processH2HPage(page, match, io, dbService);
        } else {
          emitLog(
            io,
            `⚠️ Skipped ${match.homeTeam} vs ${match.awayTeam} (navigation failed)`,
            "warning",
          );
        }
      } catch (err) {
        emitLog(
          io,
          `⚠️ Failed processing ${match.homeTeam} vs ${match.awayTeam}: ${err.message}`,
          "warning",
        );
      } finally {
        await page.close().catch(() => {});
      }

      // Short politeness delay between matches
      if (_h2hQueue.length > 0) {
        await delayWithJitter(
          scrapingConfig.delays.h2hBetweenMatch,
          scrapingConfig.delays.jitterMax,
        );
      }
    }

    emitLog(
      io,
      `🎉 H2H queue complete! Processed ${processed} match(es).`,
      "success",
    );
  } catch (error) {
    emitLog(io, `✗ H2H queue worker error: ${error.message}`, "error");
    console.error("H2H queue worker error:", error);
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
    _queueRunning = false;

    // If new matches arrived while we were running, restart immediately
    if (_h2hQueue.length > 0) {
      emitLog(
        io,
        `📥 ${_h2hQueue.length} match(es) arrived during processing — restarting worker...`,
        "info",
      );
      _queueRunning = true;
      runH2HQueue(io, dbService).catch((err) => {
        console.error("H2H queue worker restart failed:", err);
        _queueRunning = false;
      });
    }
  }
}

module.exports = { autoChainH2HScraping, runH2HQueue };
