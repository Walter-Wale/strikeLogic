function calculateScore({ formWins, formLosses, h2hHomeWins, h2hTotalLosses }) {
  let score = 0;

  // FORM
  if (formWins >= 4) {
    score += 6 + (formWins - 4) * 1.5;
  } else {
    score -= (4 - formWins) * 3;
  }

  if (formLosses > 4) {
    score -= (formLosses - 4) * 3;
  }

  // H2H
  if (h2hHomeWins >= 2) {
    score += 5 + (h2hHomeWins - 2) * 1.5;
  } else {
    score -= (2 - h2hHomeWins) * 4;
  }

  if (h2hTotalLosses > 3) {
    score -= (h2hTotalLosses - 3) * 3;
  }

  return score;
}

function getScoreConfidence(score) {
  if (score >= 15) return "HIGH";
  if (score >= 10) return "MEDIUM";
  return "LOW";
}

module.exports = { calculateScore, getScoreConfidence };
