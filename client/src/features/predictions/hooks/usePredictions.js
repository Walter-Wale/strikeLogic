import { useState, useEffect } from "react";
import { fetchPredictions } from "../../../services/apiService";
import { formatDate } from "../../../utils/dateUtils";
import { allMatchesSynced } from "../../matches/utils/matchUtils";

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

  // Button is enabled when: the chain-complete log fired, OR all visible synced matches exist
  const h2hChainComplete = chainCompleteDetected || allMatchesSynced(matches);

  // Reset predictions and chain detection flag when the user picks a new date or changes leagues
  useEffect(() => {
    setChainCompleteDetected(false);
    setPredictions([]);
  }, [selectedDate, selectedLeagues]);

  // Handler: Run predictions
  const handleRunPredictions = async () => {
    setPredictionsLoading(true);
    try {
      const formattedDate = formatDate(selectedDate);
      const response = await fetchPredictions(formattedDate, selectedLeagues);
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
    chainCompleteDetected,
    setChainCompleteDetected,
    h2hChainComplete,
    handleRunPredictions,
  };
}

export default usePredictions;
