import { useState, useEffect } from "react";
import { fetchPredictions } from "../../../services/apiService";
import { formatDate } from "../../../utils/dateUtils";
import { allMatchesSynced } from "../../matches/utils/matchUtils";

const DEFAULT_PREDICTION_MODE = "gate";
const DEFAULT_SCORE_THRESHOLD = "10";
const DEFAULT_OVER15_THRESHOLD = "7";
const DEFAULT_OVER25_THRESHOLD = "11";

function normalizeThreshold(value, fallback = 10) {
  if (value === "" || value == null) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * Manages predictions state, the H2H chain-complete flag, and the run handler.
 * @param {import('dayjs').Dayjs} selectedDate
 * @param {string[]} selectedLeagues
 * @param {Array} matches - filtered matches list (used to derive allMatchesSynced)
 */
function usePredictions(selectedDate, selectedLeagues, matches) {
  const [chainCompleteDetected, setChainCompleteDetected] = useState(false);
  const [predictions, setPredictions] = useState([]);
  const [predictionsLoading, setPredictionsLoading] = useState(false);
  const [predictionMode, setPredictionMode] = useState(DEFAULT_PREDICTION_MODE);
  const [scoreThreshold, setScoreThreshold] = useState(DEFAULT_SCORE_THRESHOLD);
  const [over15Threshold, setOver15Threshold] = useState(
    DEFAULT_OVER15_THRESHOLD,
  );
  const [over25Threshold, setOver25Threshold] = useState(
    DEFAULT_OVER25_THRESHOLD,
  );

  // Button is enabled when: the chain-complete log fired, OR all visible synced matches exist
  const h2hChainComplete = chainCompleteDetected || allMatchesSynced(matches);

  // Reset chain detection when the user picks a new date or changes leagues.
  useEffect(() => {
    setChainCompleteDetected(false);
  }, [selectedDate, selectedLeagues]);

  // Clear stale prediction results whenever the inputs that affect them change.
  useEffect(() => {
    setPredictions([]);
  }, [
    selectedDate,
    selectedLeagues,
    predictionMode,
    scoreThreshold,
    over15Threshold,
    over25Threshold,
  ]);

  // Handler: Run predictions
  const handleRunPredictions = async () => {
    setPredictionsLoading(true);
    try {
      const formattedDate = formatDate(selectedDate);
      const response = await fetchPredictions(formattedDate, selectedLeagues, {
        mode: predictionMode,
        threshold: normalizeThreshold(scoreThreshold, 10),
        over15Threshold: normalizeThreshold(over15Threshold, 7),
        over25Threshold: normalizeThreshold(over25Threshold, 11),
      });
      if (response.success) {
        setPredictions(response.data || []);
      }
    } catch (err) {
      console.error("Error fetching predictions:", err);
    } finally {
      setPredictionsLoading(false);
    }
  };

  return {
    predictions,
    predictionsLoading,
    predictionMode,
    setPredictionMode,
    scoreThreshold,
    setScoreThreshold,
    over15Threshold,
    setOver15Threshold,
    over25Threshold,
    setOver25Threshold,
    chainCompleteDetected,
    setChainCompleteDetected,
    h2hChainComplete,
    handleRunPredictions,
  };
}

export default usePredictions;
