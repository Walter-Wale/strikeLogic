function calculateGoalScoreStrict({ HOME_FORM, AWAY_FORM, DIRECT_H2H }) {
  const allMatches = [...HOME_FORM, ...AWAY_FORM, ...DIRECT_H2H].filter(
    (r) => r.homeScore !== null && r.awayScore !== null,
  );

  // ❌ Not enough data → reject
  if (allMatches.length < 6) return -5;

  const totalMatches = allMatches.length;

  const totalGoals = allMatches.reduce(
    (sum, r) => sum + r.homeScore + r.awayScore,
    0,
  );

  const combinedAvg = totalGoals / totalMatches;

  const highScoring = allMatches.filter(
    (r) => r.homeScore + r.awayScore >= 3,
  ).length;

  const lowScoring = allMatches.filter(
    (r) => r.homeScore + r.awayScore <= 1,
  ).length;

  const highRate = highScoring / totalMatches;
  const lowRate = lowScoring / totalMatches;

  // 🔥 HARD FILTERS (THIS IS THE KEY FIX)

  // Too many low scoring games → reject
  if (lowRate > 0.25) return -5;

  // Not enough high scoring consistency → reject
  if (highRate < 0.55) return -5;

  // Average too low → reject
  if (combinedAvg < 2.8) return -5;

  // 🔥 H2H VALIDATION (extra strictness)
  const h2hMatches = DIRECT_H2H.filter(
    (r) => r.homeScore !== null && r.awayScore !== null,
  );

  if (h2hMatches.length >= 3) {
    const h2hHighRate =
      h2hMatches.filter((r) => r.homeScore + r.awayScore >= 3).length /
      h2hMatches.length;

    if (h2hHighRate < 0.5) return -5;
  }

  // ✅ SCORING (simple, no inflation)
  let score = 0;

  // Average strength
  if (combinedAvg >= 3.2) score += 4;
  if (combinedAvg >= 3.6) score += 6;

  // Frequency strength
  if (highRate >= 0.6) score += 4;
  if (highRate >= 0.7) score += 6;

  // Low-risk bonus
  if (lowRate <= 0.2) score += 2;

  return Math.min(score, 15);
}

module.exports = { calculateGoalScoreStrict };
