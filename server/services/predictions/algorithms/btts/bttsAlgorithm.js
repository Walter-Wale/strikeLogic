function calculateBTTSScore({ HOME_FORM, AWAY_FORM, DIRECT_H2H }) {
  const allMatches = [...HOME_FORM, ...AWAY_FORM, ...DIRECT_H2H].filter(
    (m) => m.homeScore !== null && m.awayScore !== null,
  );

  if (allMatches.length < 6) return -5;

  let score = 0;

  // SCORING FREQUENCY
  const homeScores =
    HOME_FORM.filter((m) => m.homeScore >= 1).length / (HOME_FORM.length || 1);
  const awayScores =
    AWAY_FORM.filter((m) => m.awayScore >= 1).length / (AWAY_FORM.length || 1);

  if (homeScores >= 0.7) score += 3;
  if (awayScores >= 0.7) score += 3;

  // CONCEDING
  const homeConcedes =
    HOME_FORM.filter((m) => m.awayScore >= 1).length / (HOME_FORM.length || 1);
  const awayConcedes =
    AWAY_FORM.filter((m) => m.homeScore >= 1).length / (AWAY_FORM.length || 1);

  if (homeConcedes >= 0.6) score += 2;
  if (awayConcedes >= 0.6) score += 2;

  // H2H BTTS RATE
  const h2hValid = DIRECT_H2H.filter(
    (m) => m.homeScore !== null && m.awayScore !== null,
  );
  const h2hBTTS =
    h2hValid.filter((m) => m.homeScore >= 1 && m.awayScore >= 1).length /
    (h2hValid.length || 1);

  if (h2hBTTS >= 0.6) score += 4;
  else if (h2hBTTS < 0.3) score -= 4;

  // LOW SCORE PENALTY
  const lowScoreRate =
    allMatches.filter((m) => m.homeScore + m.awayScore <= 1).length /
    allMatches.length;

  if (lowScoreRate > 0.3) score -= 5;

  return score;
}

module.exports = { calculateBTTSScore };
