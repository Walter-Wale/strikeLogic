const {
  calculateScore,
  getScoreConfidence,
} = require("../../algorithms/winner/scoreAlgorithm");
const { teamWon, teamLost } = require("../../utils/matchHelpers");

/**
 * Score winner system.
 * Accepts (match, h2hData, config) — config must include { threshold }.
 * Returns { winnerQualified, score, confidence }
 */
function run(match, h2hData, config) {
  const { threshold } = config;
  const { HOME_FORM = [], AWAY_FORM = [], DIRECT_H2H = [] } = h2hData;
  const homeTeam = match.homeTeam;

  const formRecords = HOME_FORM.filter(
    (r) => r.homeScore !== null && r.awayScore !== null,
  );
  const formWins = formRecords.filter((r) => teamWon(r, homeTeam)).length;
  const formLosses = formRecords.filter((r) => teamLost(r, homeTeam)).length;

  const h2hRecords = DIRECT_H2H.filter(
    (r) => r.homeScore !== null && r.awayScore !== null,
  );
  const h2hTotalLosses = h2hRecords.filter((r) => teamLost(r, homeTeam)).length;
  const h2hHomeWins = h2hRecords.filter(
    (r) => r.homeTeam === homeTeam && r.homeScore > r.awayScore,
  ).length;

  const score = calculateScore({
    formWins,
    formLosses,
    h2hHomeWins,
    h2hTotalLosses,
  });
  const confidence = getScoreConfidence(score);
  const winnerQualified = score >= threshold;

  return { winnerQualified, score, confidence };
}

module.exports = { run };
