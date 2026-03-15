/**
 * Delay Utility
 * Provides Promise-based delay for rate limiting and mimicking human behavior
 */

/**
 * Delays execution for the specified number of milliseconds
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise<void>}
 */
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Delay with random jitter to mimic human timing and reduce bot-detection risk.
 * Actual wait = base + random(0, jitter) ms.
 * @param {number} base - Minimum delay in ms
 * @param {number} [jitter=0] - Maximum extra random ms to add
 */
function delayWithJitter(base, jitter = 0) {
  const ms = base + Math.floor(Math.random() * jitter);
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Default delay of 3000ms for scraping operations (mimics human behavior)
const DEFAULT_SCRAPE_DELAY = 3000;

module.exports = { delay, DEFAULT_SCRAPE_DELAY, delayWithJitter };
