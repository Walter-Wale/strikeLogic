const { compareStrictGoalCandidates } = require("../utils/sorting");

/**
 * Applies strict-mode ranking to over15 / over25 flags across all predictions.
 * Mutates the predictions array in-place.
 *
 * Logic (preserved exactly from original controller):
 *  1. Build the over-1.5 pool: all predictions with goalScore > over15Threshold
 *  2. The top 30 % of that pool (by goalScore, then matchTime, then matchId)
 *     become over-2.5 predictions; the rest stay over-1.5.
 */
function applyStrictGoalSelector(predictions, { over15Threshold }) {
  const over15Pool = predictions.filter(
    (prediction) => prediction.goalScore > over15Threshold,
  );
  const over25Count =
    over15Pool.length > 0 ? Math.ceil(over15Pool.length * 0.3) : 0;
  const over25Ids = new Set(
    [...over15Pool]
      .sort(compareStrictGoalCandidates)
      .slice(0, over25Count)
      .map((prediction) => prediction.matchId),
  );

  predictions.forEach((prediction) => {
    const qualifiesForGoalPool = prediction.goalScore > over15Threshold;
    prediction.over25 = over25Ids.has(prediction.matchId);
    prediction.over15 = qualifiesForGoalPool && !prediction.over25;
  });
}

module.exports = { applyStrictGoalSelector };
