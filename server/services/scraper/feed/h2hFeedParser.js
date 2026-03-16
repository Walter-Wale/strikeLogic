/**
 * Parse raw FlashScore H2H feed text into structured match objects.
 *
 * Feed format:
 *   Field separator:     ¬
 *   Key/value separator: ÷
 *   Match block marker:  ~KC
 *
 * Parsed fields:
 *   KC → timestamp   KF → competition   KJ → home team
 *   KK → away team   KL → score         KU → home goals   KT → away goals
 *
 * @param {string} rawText - Raw feed response text
 * @returns {Array<Object>} Parsed match objects
 */
function parseH2HFeed(rawText) {
  if (!rawText || typeof rawText !== "string") return [];

  // Split on ~KC to get individual match blocks (first chunk is header/noise)
  const blocks = rawText.split("~KC");
  const results = [];

  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i];
    // Prepend the KC key back so every field follows the same "KEY÷VALUE" pattern
    const fields = ("KC" + block).split("¬");
    const map = {};

    for (const field of fields) {
      const sepIdx = field.indexOf("÷");
      if (sepIdx === -1) continue;
      const key = field.substring(0, sepIdx);
      const value = field.substring(sepIdx + 1);
      map[key] = value;
    }

    // Skip blocks that lack essential data
    if (!map.KJ || !map.KK) continue;

    // Remove leading "*" from team names (FlashScore uses it to mark the "home" side)
    const homeTeam = map.KJ.replace(/^\*/, "");
    const awayTeam = map.KK.replace(/^\*/, "");

    // Parse score components
    const homeGoals = map.KU !== undefined ? parseInt(map.KU, 10) : null;
    const awayGoals = map.KT !== undefined ? parseInt(map.KT, 10) : null;

    results.push({
      timestamp: map.KC || null,
      competition: map.KF || null,
      homeTeam,
      awayTeam,
      score: map.KL || null,
      homeGoals: Number.isNaN(homeGoals) ? null : homeGoals,
      awayGoals: Number.isNaN(awayGoals) ? null : awayGoals,
    });
  }

  return results;
}

module.exports = { parseH2HFeed };
