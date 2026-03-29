function calculateGoalScoreSuper({ HOME_FORM, AWAY_FORM, DIRECT_H2H }) {
  const allMatches = [...HOME_FORM, ...AWAY_FORM, ...DIRECT_H2H].filter(
    (record) => record.homeScore !== null && record.awayScore !== null,
  );
  const validHomeForm = HOME_FORM.filter(
    (record) => record.homeScore !== null && record.awayScore !== null,
  );
  const validAwayForm = AWAY_FORM.filter(
    (record) => record.homeScore !== null && record.awayScore !== null,
  );

  if (allMatches.length < 6) return -5;

  const totalMatches = allMatches.length;
  const totalGoals = allMatches.reduce(
    (sum, record) => sum + record.homeScore + record.awayScore,
    0,
  );
  const combinedAvg = totalGoals / totalMatches;

  const highScoring = allMatches.filter(
    (record) => record.homeScore + record.awayScore >= 3,
  ).length;
  const lowScoring = allMatches.filter(
    (record) => record.homeScore + record.awayScore <= 1,
  ).length;
  const exactlyTwoGoals = allMatches.filter(
    (record) => record.homeScore + record.awayScore === 2,
  ).length;
  const bigScores = allMatches.filter(
    (record) => record.homeScore + record.awayScore >= 4,
  ).length;

  const highRate = highScoring / totalMatches;
  const lowRate = lowScoring / totalMatches;
  const twoGoalRate = exactlyTwoGoals / totalMatches;
  const bigRate = bigScores / totalMatches;
  const homeScoresRate =
    validHomeForm.filter((match) => match.homeScore >= 2).length /
    (validHomeForm.length || 1);
  const awayScoresRate =
    validAwayForm.filter((match) => match.awayScore >= 1).length /
    (validAwayForm.length || 1);
  const bttsRate =
    allMatches.filter((match) => match.homeScore >= 1 && match.awayScore >= 1)
      .length / totalMatches;
  const oneSidedRate =
    allMatches.filter(
      (match) =>
        (match.homeScore >= 3 && match.awayScore === 0) ||
        (match.awayScore >= 3 && match.homeScore === 0),
    ).length / totalMatches;
  const eliteRate =
    allMatches.filter((match) => match.homeScore + match.awayScore >= 5)
      .length / totalMatches;

  if (lowRate > 0.25) return -5;
  if (highRate < 0.6) return -5;
  if (combinedAvg < 2.8) return -5;
  if (twoGoalRate > 0.3) return -5;
  if (bigRate < 0.25) return -5;
  if (homeScoresRate < 0.7) return -5;
  if (awayScoresRate < 0.65) return -5;
  if (bttsRate < 0.65) return -5;
  if (oneSidedRate > 0.3) return -5;
  if (eliteRate < 0.1) return -5;

  const validH2H = DIRECT_H2H.filter(
    (record) => record.homeScore !== null && record.awayScore !== null,
  );

  if (validH2H.length >= 3) {
    const h2hHighRate =
      validH2H.filter((record) => record.homeScore + record.awayScore >= 3)
        .length / validH2H.length;

    if (h2hHighRate < 0.5) return -5;
  }

  let score = 0;

  if (combinedAvg >= 3.2) score += 4;
  if (combinedAvg >= 3.6) score += 6;

  if (highRate >= 0.6) score += 4;
  if (highRate >= 0.7) score += 6;

  if (bigRate >= 0.2) score += 3;

  if (lowRate <= 0.2) score += 2;
  if (bttsRate >= 0.6) score += 3;
  if (homeScoresRate >= 0.7) score += 2;
  if (awayScoresRate >= 0.7) score += 2;

  return Math.min(score, 15);
}

module.exports = { calculateGoalScoreSuper };
