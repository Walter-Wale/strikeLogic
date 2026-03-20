export function getConfidenceRank(confidence) {
  if (confidence === "HIGH") return 3;
  if (confidence === "MEDIUM") return 2;
  if (confidence === "LOW") return 1;
  return 0;
}

export function compareGoalPredictions(left, right) {
  const leftGoalScore = Number(left.goalScore) || 0;
  const rightGoalScore = Number(right.goalScore) || 0;
  if (rightGoalScore !== leftGoalScore) {
    return rightGoalScore - leftGoalScore;
  }

  const leftConfidence = getConfidenceRank(left.confidence);
  const rightConfidence = getConfidenceRank(right.confidence);
  if (rightConfidence !== leftConfidence) {
    return rightConfidence - leftConfidence;
  }

  const leftScore = Number(left.score) || 0;
  const rightScore = Number(right.score) || 0;
  if (rightScore !== leftScore) {
    return rightScore - leftScore;
  }

  const leftTime = left.matchTime || "";
  const rightTime = right.matchTime || "";
  const timeCompare = leftTime.localeCompare(rightTime);
  if (timeCompare !== 0) {
    return timeCompare;
  }

  return (left.matchId || 0) - (right.matchId || 0);
}
