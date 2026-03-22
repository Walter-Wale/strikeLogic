import { useEffect, useMemo, useState } from "react";
import { fetchPredictions } from "../../../services/apiService";
import { formatDate } from "../../../utils/dateUtils";
import {
  FAVORITE_COUNTRIES_STORAGE_KEY,
  PREDICTION_SCOPE_OPTIONS,
  getAvailableCountries,
  getLeaguesForCountries,
  getLeagueName,
  getUniqueSyncedLeagues,
  isSyncedMatch,
  mergeUnique,
} from "../utils/predictionScopeUtils";

const DEFAULT_PREDICTION_MODE = "score";
const DEFAULT_GOAL_MODE = "strict";
const DEFAULT_SCORE_THRESHOLD = "10";
const DEFAULT_OVER15_THRESHOLD = "7";
const DEFAULT_OVER25_THRESHOLD = "11";
const DEFAULT_BTTS_THRESHOLD = "7";
const DEFAULT_PREDICTION_SCOPE = PREDICTION_SCOPE_OPTIONS.ALL_SYNCED;

function normalizeThreshold(value, fallback = 10) {
  if (value === "" || value == null) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function areStringArraysEqual(left, right) {
  if (left === right) return true;
  if (!Array.isArray(left) || !Array.isArray(right)) return false;
  if (left.length !== right.length) return false;

  return left.every((value, index) => value === right[index]);
}

function loadFavoriteCountries() {
  if (typeof window === "undefined") return [];

  try {
    const stored = window.localStorage.getItem(FAVORITE_COUNTRIES_STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch (error) {
    console.error("Failed to load favorite countries:", error);
    return [];
  }
}

/**
 * Manages predictions state, the H2H chain-complete flag, and the run handler.
 * @param {import('dayjs').Dayjs} selectedDate
 * @param {Array} allMatches - full match list for the selected date
 */
function usePredictions(selectedDate, allMatches) {
  const [chainCompleteDetected, setChainCompleteDetected] = useState(false);
  const [predictions, setPredictions] = useState([]);
  const [predictionsLoading, setPredictionsLoading] = useState(false);
  const [predictionMode, setPredictionMode] = useState(DEFAULT_PREDICTION_MODE);
  const [goalMode, setGoalMode] = useState(DEFAULT_GOAL_MODE);
  const [predictionScope, setPredictionScope] = useState(
    DEFAULT_PREDICTION_SCOPE,
  );
  const [favoriteCountries, setFavoriteCountries] = useState(
    loadFavoriteCountries,
  );
  const [additionalLeagues, setAdditionalLeagues] = useState([]);
  const [scoreThreshold, setScoreThreshold] = useState(DEFAULT_SCORE_THRESHOLD);
  const [over15Threshold, setOver15Threshold] = useState(
    DEFAULT_OVER15_THRESHOLD,
  );
  const [over25Threshold, setOver25Threshold] = useState(
    DEFAULT_OVER25_THRESHOLD,
  );
  const [bttsThreshold, setBttsThreshold] = useState(DEFAULT_BTTS_THRESHOLD);

  const syncedMatches = useMemo(
    () => allMatches.filter(isSyncedMatch),
    [allMatches],
  );
  const availableLeagues = useMemo(
    () => getUniqueSyncedLeagues(syncedMatches),
    [syncedMatches],
  );
  const availableCountries = useMemo(
    () => getAvailableCountries(availableLeagues, favoriteCountries),
    [availableLeagues, favoriteCountries],
  );
  const favoriteCountryLeagues = useMemo(
    () => getLeaguesForCountries(availableLeagues, favoriteCountries),
    [availableLeagues, favoriteCountries],
  );
  const additionalLeagueOptions = useMemo(
    () =>
      availableLeagues.filter(
        (league) => !favoriteCountryLeagues.includes(league),
      ),
    [availableLeagues, favoriteCountryLeagues],
  );
  const resolvedPredictionLeagues = useMemo(() => {
    if (predictionScope === PREDICTION_SCOPE_OPTIONS.ALL_SYNCED) {
      return [];
    }

    if (predictionScope === PREDICTION_SCOPE_OPTIONS.FAVORITE_COUNTRIES) {
      return favoriteCountryLeagues;
    }

    return mergeUnique([...favoriteCountryLeagues, ...additionalLeagues]);
  }, [predictionScope, favoriteCountryLeagues, additionalLeagues]);
  const predictionTargetMatches = useMemo(() => {
    if (predictionScope === PREDICTION_SCOPE_OPTIONS.ALL_SYNCED) {
      return syncedMatches;
    }

    return syncedMatches.filter((match) =>
      resolvedPredictionLeagues.includes(getLeagueName(match)),
    );
  }, [predictionScope, syncedMatches, resolvedPredictionLeagues]);
  const predictionPreviewLeagues = useMemo(
    () =>
      predictionScope === PREDICTION_SCOPE_OPTIONS.ALL_SYNCED
        ? availableLeagues
        : resolvedPredictionLeagues,
    [predictionScope, availableLeagues, resolvedPredictionLeagues],
  );
  const h2hChainComplete = predictionTargetMatches.length > 0;
  const canRunPredictions = predictionTargetMatches.length > 0;

  // Reset chain detection when the user picks a new date or changes leagues.
  useEffect(() => {
    setChainCompleteDetected(false);
  }, [selectedDate]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      window.localStorage.setItem(
        FAVORITE_COUNTRIES_STORAGE_KEY,
        JSON.stringify(favoriteCountries),
      );
    } catch (error) {
      console.error("Failed to save favorite countries:", error);
    }
  }, [favoriteCountries]);

  useEffect(() => {
    setAdditionalLeagues((current) => {
      const next = current.filter((league) =>
        availableLeagues.includes(league),
      );
      return areStringArraysEqual(current, next) ? current : next;
    });
  }, [availableLeagues]);

  // Clear stale prediction results whenever the inputs that affect them change.
  useEffect(() => {
    setPredictions([]);
  }, [
    selectedDate,
    predictionMode,
    goalMode,
    predictionScope,
    favoriteCountries,
    additionalLeagues,
    scoreThreshold,
    over15Threshold,
    over25Threshold,
    bttsThreshold,
  ]);

  // Handler: Run predictions
  const handleRunPredictions = async () => {
    if (!canRunPredictions) return;

    setPredictionsLoading(true);
    try {
      const formattedDate = formatDate(selectedDate);
      const response = await fetchPredictions(
        formattedDate,
        resolvedPredictionLeagues,
        {
          mode: predictionMode,
          goalMode,
          threshold: normalizeThreshold(scoreThreshold, 10),
          over15Threshold: normalizeThreshold(over15Threshold, 7),
          over25Threshold: normalizeThreshold(over25Threshold, 11),
          bttsThreshold: normalizeThreshold(bttsThreshold, 7),
        },
      );
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
    goalMode,
    setGoalMode,
    predictionScope,
    setPredictionScope,
    favoriteCountries,
    setFavoriteCountries,
    additionalLeagues,
    setAdditionalLeagues,
    availableCountries,
    additionalLeagueOptions,
    favoriteCountryLeagues,
    predictionPreviewLeagues,
    predictionTargetMatches,
    syncedMatchCount: syncedMatches.length,
    canRunPredictions,
    scoreThreshold,
    setScoreThreshold,
    over15Threshold,
    setOver15Threshold,
    over25Threshold,
    setOver25Threshold,
    bttsThreshold,
    setBttsThreshold,
    chainCompleteDetected,
    setChainCompleteDetected,
    h2hChainComplete,
    handleRunPredictions,
  };
}

export default usePredictions;
