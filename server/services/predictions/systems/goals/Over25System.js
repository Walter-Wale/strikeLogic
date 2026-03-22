const {
  calculateGoalScore,
} = require("../../algorithms/goals/lightGoalAlgorithm");
const {
  calculateGoalScoreStrict,
} = require("../../algorithms/goals/strictGoalAlgorithm");

/**
 * Over-2.5 goals system.
 * Accepts (match, h2hData, config) — config must include { goalMode, over25Threshold }.
 * Returns { goalScore, over25 }
 *
 * NOTE: The over25 boolean here reflects basic threshold logic only.
 * In strict goalMode the PredictionService delegates to strictGoalSelector
 * which overwrites over15 / over25 across all predictions.
 */
function run(match, h2hData, config) {
  const { HOME_FORM = [], AWAY_FORM = [], DIRECT_H2H = [] } = h2hData;
  const { goalMode, over25Threshold } = config;

  const goalScore =
    goalMode === "strict"
      ? calculateGoalScoreStrict({ HOME_FORM, AWAY_FORM, DIRECT_H2H })
      : calculateGoalScore({ HOME_FORM, AWAY_FORM, DIRECT_H2H });

  const over25 = goalScore > over25Threshold;

  return { goalScore, over25 };
}

module.exports = { run };
