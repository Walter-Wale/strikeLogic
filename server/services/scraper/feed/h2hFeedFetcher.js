const https = require("https");

/**
 * Fetch raw H2H feed data from the FlashScore internal API.
 * Uses Node.js built-in https module — no external dependencies.
 * @param {string} matchId - FlashScore match identifier (e.g. "CbbieTof")
 * @returns {Promise<string>} Raw feed response text
 */
function fetchH2HFeed(matchId) {
  const url = `https://global.flashscore.ninja/2/x/feed/df_hh_1_${matchId}`;

  const options = {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      Referer: "https://www.flashscore.com/",
      Origin: "https://www.flashscore.com",
      Accept: "*/*",
      "Accept-Language": "en-US,en;q=0.9",
      // Static token required by FlashScore's ninja feed API (embedded in their JS bundle)
      "x-fsign": "SW9D1eZo",
    },
  };

  return new Promise((resolve, reject) => {
    const req = https.get(url, options, (res) => {
      if (res.statusCode < 200 || res.statusCode >= 300) {
        // Consume response to free socket
        res.resume();
        return reject(
          new Error(`Feed request failed with status ${res.statusCode}`),
        );
      }

      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
    });

    req.on("error", (err) =>
      reject(new Error(`Feed request error: ${err.message}`)),
    );
    req.end();
  });
}

module.exports = { fetchH2HFeed };
