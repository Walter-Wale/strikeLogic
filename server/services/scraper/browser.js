const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");

// Apply stealth plugin to avoid detection
puppeteer.use(StealthPlugin());

/**
 * Launch browser with enhanced stealth settings for fixture scraping
 * @returns {Promise<Browser>}
 */
async function launchFixtureBrowser() {
  return puppeteer.launch({
    headless: "new", // Use new headless mode
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-blink-features=AutomationControlled",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--disable-gpu",
      "--window-size=1920,1080",
      "--disable-web-security",
      "--disable-features=IsolateOrigins,site-per-process",
    ],
  });
}

/**
 * Create and configure a new page from the fixture browser with full stealth setup
 * @param {Browser} browser
 * @returns {Promise<Page>}
 */
async function setupFixturePage(browser) {
  const page = await browser.newPage();

  // Set realistic viewport and user agent
  await page.setViewport({ width: 1920, height: 1080 });
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  );

  // Set additional headers to appear more like a real browser
  await page.setExtraHTTPHeaders({
    "Accept-Language": "en-US,en;q=0.9",
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Encoding": "gzip, deflate, br",
    Connection: "keep-alive",
    "Upgrade-Insecure-Requests": "1",
  });

  // Override permissions
  const context = browser.defaultBrowserContext();
  await context.overridePermissions("https://www.flashscore.com", [
    "geolocation",
    "notifications",
  ]);

  // Mask webdriver property
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, "webdriver", {
      get: () => false,
    });

    // Add chrome runtime
    window.chrome = {
      runtime: {},
    };

    // Mock plugins and languages
    Object.defineProperty(navigator, "plugins", {
      get: () => [1, 2, 3, 4, 5],
    });

    Object.defineProperty(navigator, "languages", {
      get: () => ["en-US", "en"],
    });
  });

  return page;
}

/**
 * Launch browser suitable for the H2H queue worker (concurrent tabs)
 * @returns {Promise<Browser>}
 */
async function launchH2HQueueBrowser() {
  return puppeteer.launch({
    headless: true,
    protocolTimeout: 300000,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-blink-features=AutomationControlled",
      "--disable-dev-shm-usage",
    ],
  });
}

/**
 * Launch browser for single H2H scrape (scrapeH2HAndForm)
 * @returns {Promise<Browser>}
 */
async function launchH2HSingleBrowser() {
  return puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-blink-features=AutomationControlled",
    ],
  });
}

/**
 * Configure a Puppeteer page with stealth headers and viewport.
 * Used for H2H queue worker tabs.
 * @param {Page} page
 */
async function setupPage(page) {
  await page.setViewport({ width: 1920, height: 1080 });
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  );
  await page.setExtraHTTPHeaders({ "Accept-Language": "en-US,en;q=0.9" });
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false });
    window.chrome = { runtime: {} };
  });
}

module.exports = {
  launchFixtureBrowser,
  setupFixturePage,
  launchH2HQueueBrowser,
  launchH2HSingleBrowser,
  setupPage,
};
