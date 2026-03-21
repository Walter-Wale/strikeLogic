import { useState, useEffect } from "react";
import { buildTicketPool } from "../controllers/ticketController";
import { buildPool, buildTickets, shuffle } from "../utils/ticketBuilder";
import { saveTickets } from "../../../services/apiService";

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
  const [topOver15Only, setTopOver15Only] = useState(false);
  const [topOver15Percentage, setTopOver15Percentage] = useState(30);
  const [topOver25Only, setTopOver25Only] = useState(false);
  const [topOver25Percentage, setTopOver25Percentage] = useState(30);
  const [includeOver15, setIncludeOver15] = useState(false);
  const [includeOver25, setIncludeOver25] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [saving, setSaving] = useState(false);
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
    highConfidenceWinnersOnly,
    overOddsWinnersOnly,
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
  }, [ticketPoolSignature]);

  useEffect(() => {
    if (!hasHighConfidenceWinners && highConfidenceWinnersOnly) {
      setHighConfidenceWinnersOnly(false);
    }
  }, [hasHighConfidenceWinners, highConfidenceWinnersOnly]);

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
    if (tickets.length === 0) return;
    setSaving(true);
    try {
      await saveTickets(matchDate, teamsPerTicket, tickets);
      setSnackbar({
        open: true,
        message: `${tickets.length} ticket${tickets.length !== 1 ? "s" : ""} saved successfully!`,
        severity: "success",
      });
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
