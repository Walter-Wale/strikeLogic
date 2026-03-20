import { selectTopPercentage } from "../utils/ticketSelection";
import { buildTicketPredictions } from "../utils/ticketBuilder";

export function buildTicketPool({
  winnerPredictions,
  over15Predictions,
  over25Predictions,
  highConfidenceWinnersOnly,
  topOver15Only,
  topOver15Percentage,
  topOver25Only,
  topOver25Percentage,
  includeOver15,
  includeOver25,
}) {
  const highConfidenceWinnerPredictions = winnerPredictions.filter(
    (prediction) => prediction.confidence === "HIGH",
  );
  const filteredWinnerPredictions = highConfidenceWinnersOnly
    ? highConfidenceWinnerPredictions
    : winnerPredictions;
  const filteredOver15Predictions = topOver15Only
    ? selectTopPercentage(over15Predictions, topOver15Percentage)
    : over15Predictions;
  const filteredOver25Predictions = topOver25Only
    ? selectTopPercentage(over25Predictions, topOver25Percentage)
    : over25Predictions;

  const ticketPredictions = buildTicketPredictions({
    winnerPredictions: filteredWinnerPredictions,
    over15Predictions: filteredOver15Predictions,
    over25Predictions: filteredOver25Predictions,
    includeOver15,
    includeOver25,
  });

  return {
    ticketPredictions,
    filteredWinnerPredictions,
    filteredOver15Predictions,
    filteredOver25Predictions,
    highConfidenceWinnerPredictions,
  };
}
