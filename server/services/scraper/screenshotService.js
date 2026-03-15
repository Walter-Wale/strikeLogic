const fs = require("fs");
const path = require("path");
const { emitLog } = require("../../utils/socketLogger");

/**
 * Ensure logs/errors directory exists for screenshot storage
 */
function ensureErrorLogDirectory() {
  const errorLogDir = path.join(__dirname, "../..", "logs", "errors");
  if (!fs.existsSync(errorLogDir)) {
    fs.mkdirSync(errorLogDir, { recursive: true });
  }
}

/**
 * Capture error screenshot for debugging
 * Saves to server/logs/errors/ with timestamp and match info
 * @param {Page} page - Puppeteer page instance
 * @param {Object} match - Match object
 * @param {string} errorType - Type of error for filename
 * @param {SocketIO.Server} io - Socket.io instance for emitting logs
 */
async function captureErrorScreenshot(page, match, errorType, io) {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename =
      `${errorType}_${match.homeTeam}_vs_${match.awayTeam}_${timestamp}.png`.replace(
        /[^a-z0-9_-]/gi,
        "_",
      );
    const screenshotPath = path.join(
      __dirname,
      "../..",
      "logs",
      "errors",
      filename,
    );

    await page.screenshot({ path: screenshotPath, fullPage: true });

    emitLog(io, `📸 Screenshot captured: logs/errors/${filename}`, "info");
  } catch (error) {
    console.error("Failed to capture screenshot:", error);
  }
}

module.exports = { ensureErrorLogDirectory, captureErrorScreenshot };
