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

// Default delay of 3000ms for scraping operations (mimics human behavior)
const DEFAULT_SCRAPE_DELAY = 3000;

module.exports = { delay, DEFAULT_SCRAPE_DELAY };
