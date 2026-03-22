const {
  calculateGoalScore,
} = require("../../algorithms/goals/lightGoalAlgorithm");
const {
  calculateGoalScoreStrict,
} = require("../../algorithms/goals/strictGoalAlgorithm");

/**
 * Over-1.5 goals system.
 * Accepts (match, h2hData, config) — config must include { goalMode, over15Threshold }.
 * Returns { goalScore, over15 }
 *
 * NOTE: The over15 boolean here reflects basic threshold logic only.
 * In strict goalMode the PredictionService delegates to strictGoalSelector
 * which overwrites over15 / over25 across all predictions.
 */
function run(match, h2hData, config) {
  const { HOME_FORM = [], AWAY_FORM = [], DIRECT_H2H = [] } = h2hData;
  const { goalMode, over15Threshold } = config;

  const goalScore =
    goalMode === "strict"
      ? calculateGoalScoreStrict({ HOME_FORM, AWAY_FORM, DIRECT_H2H })
      : calculateGoalScore({ HOME_FORM, AWAY_FORM, DIRECT_H2H });

  const over15 = goalScore > over15Threshold;

  return { goalScore, over15 };
}

module.exports = { run };
