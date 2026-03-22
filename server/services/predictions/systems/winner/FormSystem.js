const {
  calculateFormBasedScore,
  getFormConfidence,
} = require("../../algorithms/winner/formAlgorithm");

/**
 * Form winner system.
 * Accepts (match, h2hData, config) — config unused but kept for interface consistency.
 * Returns { winnerQualified, score, confidence, homeFormScore, awayFormScore, formDelta }
 */
function run(match, h2hData, config) {
  const { HOME_FORM = [], AWAY_FORM = [], DIRECT_H2H = [] } = h2hData;
  const homeTeam = match.homeTeam;
  const awayTeam = match.awayTeam;

  const formResult = calculateFormBasedScore({
    HOME_FORM,
    AWAY_FORM,
    DIRECT_H2H,
    homeTeam,
    awayTeam,
  });

  if (!formResult.rejected && formResult.score >= 8) {
    return {
      winnerQualified: true,
      score: formResult.score,
      confidence: getFormConfidence(formResult.score),
      homeFormScore: Number(formResult.homeFormScore.toFixed(2)),
      awayFormScore: Number(formResult.awayFormScore.toFixed(2)),
      formDelta: Number(formResult.formDelta.toFixed(2)),
    };
  }

  return {
    winnerQualified: false,
    score: null,
    confidence: null,
    homeFormScore: null,
    awayFormScore: null,
    formDelta: null,
  };
}

module.exports = { run };
