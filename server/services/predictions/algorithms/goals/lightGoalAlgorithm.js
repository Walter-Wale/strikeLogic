function getAvgGoals(records) {
  const valid = records.filter(
    (record) => record.homeScore !== null && record.awayScore !== null,
  );

  if (valid.length === 0) return 0;

  const total = valid.reduce(
    (sum, record) => sum + record.homeScore + record.awayScore,
    0,
  );
  return total / valid.length;
}

function calculateGoalScore({ HOME_FORM, AWAY_FORM, DIRECT_H2H }) {
  let score = 0;

  const homeAvg = getAvgGoals(HOME_FORM);
  const awayAvg = getAvgGoals(AWAY_FORM);
  const h2hAvg = getAvgGoals(DIRECT_H2H);
  const combinedAvg = (homeAvg + awayAvg + h2hAvg) / 3;
  const validH2H = DIRECT_H2H.filter(
    (record) => record.homeScore !== null && record.awayScore !== null,
  );

  // --- BASELINE (very strict) ---
  if (combinedAvg >= 3.5) score += 8;
  else if (combinedAvg >= 3.0) score += 6;
  else if (combinedAvg >= 2.5) score += 3;
  else score -= 6;

  // --- CONSISTENCY (must repeat, not one-off) ---
  const highScoringMatches = validH2H.filter(
    (record) => record.homeScore + record.awayScore >= 3,
  ).length;

  if (highScoringMatches >= 4) score += 6;
  else if (highScoringMatches >= 3) score += 4;
  else if (highScoringMatches >= 2) score += 2;
  else score -= 4;

  // --- LOW SCORE PENALTY (very strong) ---
  const lowScoringMatches = validH2H.filter(
    (record) => record.homeScore + record.awayScore <= 1,
  ).length;

  if (lowScoringMatches >= 2) score -= 7;

  // --- ATTACK SIGNAL ---
  if (homeAvg >= 1.6) score += 3;
  if (awayAvg >= 1.3) score += 3;

  return score;
}

module.exports = { calculateGoalScore };
