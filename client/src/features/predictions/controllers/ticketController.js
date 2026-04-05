import { selectTopPercentage } from "../utils/ticketSelection";
import { buildTicketPredictions } from "../utils/ticketBuilder";

function getWinnerOdds(prediction) {
  if (prediction.predictedWinner === prediction.homeTeam)
    return prediction.oddsHome;
  if (prediction.predictedWinner === prediction.awayTeam)
    return prediction.oddsAway;
  return null;
}

function makeMatchKey(p) {
  return `${p.homeTeam}|${p.awayTeam}`;
}

export function buildTicketPool({
  winnerPredictions,
  over15Predictions,
  over25Predictions,
  bttsPredictions,
  playedMatchKeys,
  highConfidenceWinnersOnly,
  overOddsWinnersOnly,
  minOddsThreshold = 1.3,
  topOver15Only,
  topOver15Percentage,
  topOver25Only,
  topOver25Percentage,
  topBTTSOnly,
  topBTTSPercentage,
  includeWinners,
  includeOver15,
  includeOver25,
  includeBTTS,
}) {
  // Exclude matches that have already been saved as played
  if (playedMatchKeys && playedMatchKeys.size > 0) {
    winnerPredictions = winnerPredictions.filter(
      (p) => !playedMatchKeys.has(makeMatchKey(p)),
    );
    over15Predictions = over15Predictions.filter(
      (p) => !playedMatchKeys.has(makeMatchKey(p)),
    );
    over25Predictions = over25Predictions.filter(
      (p) => !playedMatchKeys.has(makeMatchKey(p)),
    );
    bttsPredictions = bttsPredictions.filter(
      (p) => !playedMatchKeys.has(makeMatchKey(p)),
    );
  }

  const highConfidenceWinnerPredictions = winnerPredictions.filter(
    (prediction) => prediction.confidence === "HIGH",
  );
  const overOddsWinnerPredictions = winnerPredictions.filter((prediction) => {
    const odds = getWinnerOdds(prediction);
    return typeof odds === "number" && odds > minOddsThreshold;
  });
  let filteredWinnerPredictions;
  if (highConfidenceWinnersOnly && overOddsWinnersOnly) {
    // Intersection: must be HIGH confidence AND have odds > minOddsThreshold
    filteredWinnerPredictions = highConfidenceWinnerPredictions.filter((p) => {
      const odds = getWinnerOdds(p);
      return typeof odds === "number" && odds > minOddsThreshold;
    });
  } else if (highConfidenceWinnersOnly) {
    filteredWinnerPredictions = highConfidenceWinnerPredictions;
  } else if (overOddsWinnersOnly) {
    filteredWinnerPredictions = overOddsWinnerPredictions;
  } else {
    filteredWinnerPredictions = winnerPredictions;
  }
  const filteredOver15Predictions = topOver15Only
    ? selectTopPercentage(over15Predictions, topOver15Percentage)
    : over15Predictions;
  const filteredOver25Predictions = topOver25Only
    ? selectTopPercentage(over25Predictions, topOver25Percentage)
    : over25Predictions;
  const filteredBTTSPredictions = topBTTSOnly
    ? selectTopPercentage(bttsPredictions, topBTTSPercentage)
    : bttsPredictions;

  const ticketPredictions = buildTicketPredictions({
    winnerPredictions: filteredWinnerPredictions,
    over15Predictions: filteredOver15Predictions,
    over25Predictions: filteredOver25Predictions,
    bttsPredictions: filteredBTTSPredictions,
    includeWinners,
    includeOver15,
    includeOver25,
    includeBTTS,
  });

  return {
    ticketPredictions,
    filteredWinnerPredictions,
    filteredOver15Predictions,
    filteredOver25Predictions,
    filteredBTTSPredictions,
    highConfidenceWinnerPredictions,
    overOddsWinnerPredictions,
  };
}
