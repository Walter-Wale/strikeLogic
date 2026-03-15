const { launchH2HQueueBrowser, setupPage } = require("./browser");
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
 * Multi-tab concurrent queue worker.
 *
 * One browser is launched for the entire queue with N tabs (configurable via
 * scraping.h2hConcurrency in config.json, default 3).  Each tab runs as an
 * independent worker: navigate → extract → save → grab next item from the
 * shared queue.  Workers drain the queue concurrently so total time scales
 * roughly as total_matches / concurrency instead of linearly.
 *
 * After the queue drains the browser is closed.  If new items arrive while
 * the worker is running they are appended and will restart automatically.
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

    const concurrency = scrapingConfig.h2hConcurrency || 2;

    // Create N pages up-front — each will run as an independent worker
    const pages = await Promise.all(
      Array.from({ length: concurrency }, async () => {
        const p = await browser.newPage();
        await setupPage(p);
        return p;
      }),
    );

    let processed = 0;

    // Each worker loops: grab next match → navigate → extract+save → repeat
    // JS is single-threaded so queue.shift() calls are inherently sequential (no race)
    const runWorker = async (page) => {
      while (_h2hQueue.length > 0) {
        const match = _h2hQueue.shift();
        if (!match) break;

        const matchNum = ++processed;
        emitLog(
          io,
          `⚽ Processing match ${matchNum}: ${match.homeTeam} vs ${match.awayTeam}...`,
          "info",
        );

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

        // Politeness delay between requests on this worker
        if (_h2hQueue.length > 0) {
          await delayWithJitter(
            scrapingConfig.delays.h2hBetweenMatch,
            scrapingConfig.delays.jitterMax,
          );
        }
      }
    };

    // Run all workers concurrently — they drain from the shared queue
    await Promise.all(pages.map((page) => runWorker(page)));

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

    // If leagues were added while we were running, restart immediately
    if (_h2hQueue.length > 0) {
      emitLog(
        io,
        `📥 ${_h2hQueue.length} match(es) arrived during processing — restarting worker...`,
        "info",
      );
      runH2HQueue(io, dbService).catch((err) => {
        console.error("H2H queue worker restart failed:", err);
        _queueRunning = false;
      });
    }
  }
}

module.exports = { autoChainH2HScraping, runH2HQueue };
