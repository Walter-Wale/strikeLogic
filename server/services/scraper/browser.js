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
 * Launch browser suitable for the H2H queue worker and single H2H scrapes.
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
 * Create and configure a page optimised for H2H scraping.
 * Blocks images, stylesheets, fonts and media to reduce bandwidth on slow
 * connections.  Applies stealth headers so the page appears human-like.
 * @param {Browser} browser
 * @returns {Promise<Page>}
 */
async function setupH2HPage(browser) {
  const page = await browser.newPage();

  await page.setViewport({ width: 1920, height: 1080 });
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  );
  await page.setExtraHTTPHeaders({ "Accept-Language": "en-US,en;q=0.9" });
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false });
    window.chrome = { runtime: {} };
  });

  // Block heavy resources — images, CSS, fonts, media and known analytics/ad
  // scripts are not needed for H2H extraction and waste bandwidth.
  //
  // IMPORTANT: The try/catch around every call is mandatory.
  // When page.goto() starts a new navigation, Puppeteer still fires the
  // "request" event for in-flight requests left over from the *previous*
  // navigation. Calling req.abort() / req.continue() on those already-resolved
  // requests throws "Request is already handled!". Without the catch, that
  // uncaught exception corrupts Puppeteer's internal interception queue and
  // causes the next page.goto() to hang forever.
  await page.setRequestInterception(true);
  page.on("request", (req) => {
    try {
      const url = req.url();
      const type = req.resourceType();
      if (
        type === "image" ||
        type === "stylesheet" ||
        type === "font" ||
        type === "media" ||
        url.includes("analytics") ||
        url.includes("googletag") ||
        url.includes("doubleclick")
      ) {
        req.abort();
      } else {
        req.continue();
      }
    } catch (_) {
      // Silently ignore "Request is already handled!" during navigation transitions
    }
  });

  return page;
}

module.exports = {
  launchFixtureBrowser,
  setupFixturePage,
  launchH2HQueueBrowser,
  setupH2HPage,
};
