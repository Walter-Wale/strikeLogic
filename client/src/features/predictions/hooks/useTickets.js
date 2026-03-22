import { useState, useEffect, useCallback } from "react";
import { buildTicketPool } from "../controllers/ticketController";
import { buildPool, buildTickets, shuffle } from "../utils/ticketBuilder";
import { saveTickets, fetchPlayedMatches } from "../../../services/apiService";

export function useTickets({
  winnerPredictions,
  over15Predictions,
  over25Predictions,
  matchDate,
  onSaved,
}) {
  const [teamsPerTicket, setTeamsPerTicket] = useState(6);
  const [maxAppearances, setMaxAppearances] = useState(1);
  const [multiCount, setMultiCount] = useState(10);
  const [highConfidenceWinnersOnly, setHighConfidenceWinnersOnly] =
    useState(false);
  const [overOddsWinnersOnly, setOverOddsWinnersOnly] = useState(false);
  const [minOddsThreshold, setMinOddsThreshold] = useState(1.3);
  const [topOver15Only, setTopOver15Only] = useState(false);
  const [topOver15Percentage, setTopOver15Percentage] = useState(30);
  const [topOver25Only, setTopOver25Only] = useState(false);
  const [topOver25Percentage, setTopOver25Percentage] = useState(30);
  const [includeOver15, setIncludeOver15] = useState(false);
  const [includeOver25, setIncludeOver25] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [saving, setSaving] = useState(false);
  const [playedTicketIndices, setPlayedTicketIndices] = useState(
    () => new Set(),
  );
  const [playedMatchKeys, setPlayedMatchKeys] = useState(() => new Set());
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const {
    ticketPredictions,
    filteredWinnerPredictions,
    filteredOver15Predictions,
    filteredOver25Predictions,
    highConfidenceWinnerPredictions,
    overOddsWinnerPredictions,
  } = buildTicketPool({
    winnerPredictions,
    over15Predictions,
    over25Predictions,
    playedMatchKeys,
    highConfidenceWinnersOnly,
    overOddsWinnersOnly,
    minOddsThreshold,
    topOver15Only,
    topOver15Percentage,
    topOver25Only,
    topOver25Percentage,
    includeOver15,
    includeOver25,
  });

  const hasHighConfidenceWinners = highConfidenceWinnerPredictions.length > 0;
  const noData = ticketPredictions.length === 0;
  const perTicket = Math.max(1, teamsPerTicket);

  const ticketPoolSignature = [
    filteredWinnerPredictions
      .map(
        (prediction) => `${prediction.matchId}:${prediction.predictedWinner}`,
      )
      .join("|"),
    over15Predictions.map((prediction) => prediction.matchId).join("|"),
    over25Predictions.map((prediction) => prediction.matchId).join("|"),
    filteredOver15Predictions
      .map((prediction) => `${prediction.matchId}:${prediction.goalScore}`)
      .join("|"),
    filteredOver25Predictions
      .map((prediction) => `${prediction.matchId}:${prediction.goalScore}`)
      .join("|"),
    highConfidenceWinnersOnly,
    overOddsWinnersOnly,
    minOddsThreshold,
    topOver15Only,
    topOver15Percentage,
    topOver25Only,
    topOver25Percentage,
    includeOver15,
    includeOver25,
    teamsPerTicket,
    maxAppearances,
  ].join("::");

  useEffect(() => {
    setTickets([]);
    setPlayedTicketIndices(new Set());
  }, [ticketPoolSignature]);

  useEffect(() => {
    if (!hasHighConfidenceWinners && highConfidenceWinnersOnly) {
      setHighConfidenceWinnersOnly(false);
    }
  }, [hasHighConfidenceWinners, highConfidenceWinnersOnly]);

  const loadPlayedMatchKeys = useCallback(async () => {
    if (!matchDate) return;
    try {
      const result = await fetchPlayedMatches(matchDate);
      const keys = new Set(
        (result.data || []).map((m) => `${m.homeTeam}|${m.awayTeam}`),
      );
      setPlayedMatchKeys(keys);
    } catch {
      // non-critical — silently ignore
    }
  }, [matchDate]);

  useEffect(() => {
    loadPlayedMatchKeys();
  }, [loadPlayedMatchKeys]);

  function togglePlayedTicket(idx) {
    setPlayedTicketIndices((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  }

  function handleRandomize() {
    if (noData) return;
    const pool = buildPool(ticketPredictions, maxAppearances);
    setTickets(buildTickets(shuffle(pool), perTicket));
  }

  function handleMultiRandomize() {
    if (noData) return;
    let pool = buildPool(ticketPredictions, maxAppearances);
    const times = Math.max(2, multiCount);
    for (let i = 0; i < times; i++) {
      pool = shuffle(pool);
    }
    setTickets(buildTickets(pool, perTicket));
  }

  async function handleSave() {
    if (playedTicketIndices.size === 0) return;
    const playedTickets = tickets.filter((_, idx) =>
      playedTicketIndices.has(idx),
    );
    setSaving(true);
    try {
      await saveTickets(matchDate, teamsPerTicket, playedTickets);
      setSnackbar({
        open: true,
        message: `${playedTickets.length} played ticket${
          playedTickets.length !== 1 ? "s" : ""
        } saved successfully!`,
        severity: "success",
      });
      await loadPlayedMatchKeys();
      if (onSaved) onSaved();
    } catch (err) {
      setSnackbar({
        open: true,
        message: err.message || "Failed to save tickets.",
        severity: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  return {
    teamsPerTicket,
    setTeamsPerTicket,
    maxAppearances,
    setMaxAppearances,
    multiCount,
    setMultiCount,
    highConfidenceWinnersOnly,
    setHighConfidenceWinnersOnly,
    overOddsWinnersOnly,
    setOverOddsWinnersOnly,
    minOddsThreshold,
    setMinOddsThreshold,
    overOddsWinnerPredictions,
    topOver15Only,
    setTopOver15Only,
    topOver15Percentage,
    setTopOver15Percentage,
    topOver25Only,
    setTopOver25Only,
    topOver25Percentage,
    setTopOver25Percentage,
    includeOver15,
    setIncludeOver15,
    includeOver25,
    setIncludeOver25,
    tickets,
    saving,
    snackbar,
    setSnackbar,
    playedTicketIndices,
    togglePlayedTicket,
    filteredWinnerPredictions,
    filteredOver15Predictions,
    filteredOver25Predictions,
    highConfidenceWinnerPredictions,
    hasHighConfidenceWinners,
    ticketPredictions,
    noData,
    perTicket,
    handleRandomize,
    handleMultiRandomize,
    handleSave,
  };
}
