const {
  calculateGoalScoreSuper,
} = require("../../algorithms/goals/superGoalAlgorithm");

/**
 * Super over-2.5 goals system.
 * Accepts (match, h2hData, config) — config must include { over25Threshold }.
 * Returns { goalScore, over25 }
 */
function run(match, h2hData, config) {
  const { HOME_FORM = [], AWAY_FORM = [], DIRECT_H2H = [] } = h2hData;

  const goalScore = calculateGoalScoreSuper({
    HOME_FORM,
    AWAY_FORM,
    DIRECT_H2H,
  });

  return {
    goalScore,
    over25: goalScore > config.over25Threshold,
  };
}

module.exports = { run };
