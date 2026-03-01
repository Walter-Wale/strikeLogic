/**
 * Expand Matches Utility
 * Handles clicking "Show more matches" button to retrieve deeper historical data
 */

const { delay } = require("./delay");

/**
 * Ensures minimum number of match rows are visible by clicking "Show more" button
 * @param {Page} page - Puppeteer page instance
 * @param {string} containerSelector - CSS selector for the container holding matches
 * @param {string} showMoreSelector - CSS selector for the "Show more" button
 * @param {string} matchRowSelector - CSS selector for individual match rows
 * @param {number} minRows - Minimum number of rows desired
 * @returns {Promise<number>} Final count of visible rows
 */
async function ensureMinimumMatches(
  page,
  containerSelector,
  showMoreSelector,
  matchRowSelector,
  minRows = 5,
) {
  const MAX_ATTEMPTS = 3;
  let attempts = 0;

  try {
    // Check if container exists
    const containerExists = await page.$(containerSelector);
    if (!containerExists) {
      console.log(`Container ${containerSelector} not found`);
      return 0;
    }

    while (attempts < MAX_ATTEMPTS) {
      // Count current visible rows within the container
      const currentCount = await page.$$eval(
        `${containerSelector} ${matchRowSelector}`,
        (rows) => rows.length,
      );

      console.log(
        `Attempt ${attempts + 1}: Found ${currentCount} rows (need ${minRows})`,
      );

      // If we have enough rows, we're done
      if (currentCount >= minRows) {
        return currentCount;
      }

      // Check if "Show more" button exists and is visible within the container
      const showMoreButton = await page.$(
        `${containerSelector} ${showMoreSelector}`,
      );

      if (!showMoreButton) {
        console.log("No 'Show more' button found, returning current count");
        return currentCount;
      }

      // Check if button is visible
      const isVisible = await showMoreButton.isIntersectingViewport();
      if (!isVisible) {
        // Scroll button into view
        await showMoreButton.evaluate((el) =>
          el.scrollIntoView({ behavior: "smooth" }),
        );
        await delay(500);
      }

      // Click the button
      console.log(`Clicking 'Show more' button (attempt ${attempts + 1})`);
      await showMoreButton.click();

      // Wait for content to load
      await delay(2000);

      attempts++;
    }

    // Return final count after all attempts
    const finalCount = await page.$$eval(
      `${containerSelector} ${matchRowSelector}`,
      (rows) => rows.length,
    );

    console.log(`Finished after ${attempts} attempts with ${finalCount} rows`);
    return finalCount;
  } catch (error) {
    console.error("Error in ensureMinimumMatches:", error.message);
    // Return current count even if error occurs
    try {
      const currentCount = await page.$$eval(
        `${containerSelector} ${matchRowSelector}`,
        (rows) => rows.length,
      );
      return currentCount;
    } catch {
      return 0;
    }
  }
}

module.exports = { ensureMinimumMatches };
