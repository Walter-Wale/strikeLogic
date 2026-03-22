const { teamWon, teamLost } = require("../../utils/matchHelpers");

function calculateFormScore(matches, teamName) {
  const last7 = matches.slice(0, 7);
  let points = 0;
  let totalWeight = 0;

  last7.forEach((m, index) => {
    if (m.homeScore == null || m.awayScore == null) return;
    const weight = index === 0 ? 1.5 : 1.0;
    let matchPoints = 0;
    if (teamWon(m, teamName)) matchPoints = 3;
    else if (!teamWon(m, teamName) && !teamLost(m, teamName)) matchPoints = 1;
    points += matchPoints * weight;
    totalWeight += 3 * weight;
  });

  if (totalWeight === 0) return 0;
  return (points / totalWeight) * 10;
}

function calculateH2HScore(matches, homeTeam, awayTeam) {
  const last5 = matches.slice(0, 5);

  let generalPoints = 0;
  let generalWeight = 0;

  let homeContextPoints = 0;
  let homeContextWeight = 0;

  last5.forEach((m, index) => {
    if (m.homeScore == null || m.awayScore == null) return;

    const weight = index === 0 ? 1.5 : 1.0;

    let matchPoints = 0;

    if (teamWon(m, homeTeam)) matchPoints = 3;
    else if (!teamWon(m, homeTeam) && !teamLost(m, homeTeam)) matchPoints = 1;

    // GENERAL H2H
    generalPoints += matchPoints * weight;
    generalWeight += 3 * weight;

    // 🏟️ HOME CONTEXT (when home team was actually home)
    if (m.homeTeam === homeTeam) {
      const boostedWeight = weight + 0.5;
      homeContextPoints += matchPoints * boostedWeight;
      homeContextWeight += 3 * boostedWeight;
    }
  });

  const generalScore =
    generalWeight === 0 ? 0 : (generalPoints / generalWeight) * 10;

  const homeScore =
    homeContextWeight === 0
      ? generalScore
      : (homeContextPoints / homeContextWeight) * 10;

  // ⚖️ Combine both (balanced)
  return generalScore * 0.6 + homeScore * 0.4;
}

function calculateFormBasedScore({
  HOME_FORM,
  AWAY_FORM,
  DIRECT_H2H,
  homeTeam,
  awayTeam,
}) {
  // ✅ FORM SCORES (unchanged logic)
  const homeFormScore = calculateFormScore(HOME_FORM, homeTeam);
  const awayFormScore = calculateFormScore(AWAY_FORM, awayTeam);
  const formDelta = homeFormScore - awayFormScore;

  // ✅ NEW H2H SCORES (balanced + contextual)
  const homeH2HScore = calculateH2HScore(DIRECT_H2H, homeTeam, awayTeam);
  const awayH2HScore = calculateH2HScore(DIRECT_H2H, awayTeam, homeTeam);
  const h2hDelta = homeH2HScore - awayH2HScore;

  // 🚫 HARD REJECTION (strong negative signals)
  if (formDelta < -2 || h2hDelta < -2) {
    return { rejected: true };
  }

  let score = 0;

  // ⚖️ EQUAL IMPORTANCE
  score += formDelta * 1.5;
  score += h2hDelta * 1.5;

  // 🔥 STRONG AGREEMENT BOOST
  if (formDelta > 2 && h2hDelta > 2) {
    score += 4;
  }

  // ⚠️ CONFLICT PENALTY
  if ((formDelta > 2 && h2hDelta < 0) || (h2hDelta > 2 && formDelta < 0)) {
    score -= 3;
  }

  return {
    score,
    homeFormScore,
    awayFormScore,
    formDelta,
    rejected: false,
  };
}

function getFormConfidence(score) {
  if (score >= 12) return "HIGH";
  if (score >= 8) return "MEDIUM";
  return "LOW";
}

module.exports = { calculateFormBasedScore, getFormConfidence };
