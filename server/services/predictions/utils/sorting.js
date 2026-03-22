function compareStrictGoalCandidates(a, b) {
  if (b.goalScore !== a.goalScore) {
    return b.goalScore - a.goalScore;
  }

  const timeA = a.matchTime || "";
  const timeB = b.matchTime || "";
  const timeCompare = timeA.localeCompare(timeB);
  if (timeCompare !== 0) {
    return timeCompare;
  }

  return (a.matchId || 0) - (b.matchId || 0);
}

module.exports = { compareStrictGoalCandidates };
