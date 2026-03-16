/**
 * Parse raw FlashScore H2H feed text into structured match objects.
 *
 * Feed format:
 *   Field separator:     ¬
 *   Key/value separator: ÷
 *   Match block marker:  ~KC÷
 *   Section marker:      any ~XX÷ where XX ≠ KC  (e.g. ~ZA÷, ~SA÷)
 *
 * The feed always delivers three ordered sections:
 *   1st group of ~KC÷ blocks → DIRECT_H2H
 *   2nd group of ~KC÷ blocks → HOME_FORM
 *   3rd group of ~KC÷ blocks → AWAY_FORM
 *
 * Section boundaries are detected by watching for non-KC markers that appear
 * AFTER a run of KC match records — no team-name guessing needed.
 *
 * Parsed fields:
 *   KC → timestamp   KF → competition   KJ → home team
 *   KK → away team   KL → score         KU → home goals   KT → away goals
 *
 * @param {string} rawText - Raw feed response text
 * @returns {Array<Object>} Parsed match objects (each includes a sectionType field)
 */
function parseH2HFeed(rawText) {
  if (!rawText || typeof rawText !== "string") return [];

  const sectionTypes = ["HOME_FORM", "AWAY_FORM", "DIRECT_H2H"];
  const results = [];

  // Scan every ~XX÷...  token in document order.
  // A transition from KC→non-KC signals the start of the next section.
  const markerRegex = /~([A-Z]{2,})÷([^~]*)/g;
  let sectionIdx = 0;
  let prevWasKC = false;
  let m;

  while ((m = markerRegex.exec(rawText)) !== null) {
    const type = m[1]; // "KC", "ZA", "SA", …
    const content = m[2]; // everything up to the next ~

    if (type === "KC") {
      prevWasKC = true;

      // Beyond the three known sections — ignore (shouldn't happen for df_hh_1)
      if (sectionIdx >= sectionTypes.length) continue;

      // Parse key÷value fields separated by ¬
      const fields = ("KC÷" + content).split("¬");
      const map = {};
      for (const field of fields) {
        const sep = field.indexOf("÷");
        if (sep === -1) continue;
        map[field.slice(0, sep)] = field.slice(sep + 1);
      }

      if (!map.KJ || !map.KK) continue;

      const homeGoals = map.KU !== undefined ? parseInt(map.KU, 10) : null;
      const awayGoals = map.KT !== undefined ? parseInt(map.KT, 10) : null;

      results.push({
        timestamp: map.KC || null,
        competition: map.KF || null,
        homeTeam: map.KJ.replace(/^\*/, ""),
        awayTeam: map.KK.replace(/^\*/, ""),
        score: map.KL || null,
        homeGoals: Number.isNaN(homeGoals) ? null : homeGoals,
        awayGoals: Number.isNaN(awayGoals) ? null : awayGoals,
        sectionType: sectionTypes[sectionIdx],
      });
    } else {
      // Non-KC marker.  If the previous token was a KC record we have crossed a
      // section boundary — advance the section index exactly once.
      if (prevWasKC) {
        sectionIdx++;
      }
      prevWasKC = false;
    }
  }

  return results;
}

module.exports = { parseH2HFeed };
