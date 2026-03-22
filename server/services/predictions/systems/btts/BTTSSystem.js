const { calculateBTTSScore } = require("../../algorithms/btts/bttsAlgorithm");

/**
 * BTTS (Both Teams To Score) system.
 * Accepts (match, h2hData, config) — config must include { bttsThreshold }.
 * Returns { bttsScore, btts }
 */
function run(match, h2hData, config) {
  const { HOME_FORM = [], AWAY_FORM = [], DIRECT_H2H = [] } = h2hData;
  const { bttsThreshold } = config;

  const bttsScore = calculateBTTSScore({ HOME_FORM, AWAY_FORM, DIRECT_H2H });
  const btts = bttsScore > bttsThreshold;

  return { bttsScore, btts };
}

module.exports = { run };
