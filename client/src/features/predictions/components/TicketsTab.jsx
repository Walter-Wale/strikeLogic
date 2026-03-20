import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Checkbox,
  Chip,
  CircularProgress,
  Divider,
  FormControlLabel,
  FormGroup,
  Grid,
  InputAdornment,
  List,
  ListItem,
  ListItemText,
  Snackbar,
  TextField,
  Typography,
} from "@mui/material";
import ShuffleIcon from "@mui/icons-material/Shuffle";
import FilterNoneIcon from "@mui/icons-material/FilterNone";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import SaveIcon from "@mui/icons-material/Save";
import { saveTickets } from "../../../services/apiService";

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function buildPool(predictions, maxAppearances) {
  const pool = [];
  for (let i = 0; i < Math.max(1, maxAppearances); i++) {
    pool.push(...predictions);
  }
  return pool;
}

function getTicketMatchKey(prediction) {
  return (
    prediction.matchId ??
    `${prediction.homeTeam}-${prediction.awayTeam}-${prediction.matchDate}-${prediction.matchTime}`
  );
}

function createTicketBucket() {
  return {
    picks: [],
    usedMatchIds: new Set(),
  };
}

function addPredictionToTicket(ticket, prediction) {
  ticket.picks.push(prediction);
  ticket.usedMatchIds.add(getTicketMatchKey(prediction));
}

function countWinnerPicks(ticket) {
  return ticket.picks.filter((pick) => pick.ticketMarket === "winner").length;
}

function countMarketPicks(ticket, market) {
  return ticket.picks.filter((pick) => pick.ticketMarket === market).length;
}

function placePredictionsAcrossTickets(tickets, predictions, ticketSize, sorter) {
  predictions.forEach((prediction) => {
    const matchKey = getTicketMatchKey(prediction);

    const eligibleTickets = tickets.filter(
      (ticket) =>
        ticket.picks.length < ticketSize && !ticket.usedMatchIds.has(matchKey),
    );

    if (eligibleTickets.length > 0) {
      eligibleTickets.sort(sorter);
      addPredictionToTicket(eligibleTickets[0], prediction);
      return;
    }

    const overflowTicket = createTicketBucket();
    addPredictionToTicket(overflowTicket, prediction);
    tickets.push(overflowTicket);
  });
}

function getTicketPickMeta(prediction) {
  if (
    prediction.predictedWinner &&
    (prediction.predictedWinner === prediction.homeTeam ||
      prediction.predictedWinner === prediction.awayTeam)
  ) {
    return {
      label: `Winner: ${prediction.predictedWinner}`,
      color: "success",
      variant: "filled",
    };
  }

  if (prediction.predictedWinner === "Over 1.5") {
    return { label: "Over 1.5", color: "info", variant: "outlined" };
  }

  if (prediction.predictedWinner === "Over 2.5") {
    return { label: "Over 2.5", color: "warning", variant: "outlined" };
  }

  return {
    label: prediction.predictedWinner || "Pick",
    color: "default",
    variant: "outlined",
  };
}

function buildTicketPredictions({
  winnerPredictions,
  over15Predictions,
  over25Predictions,
  includeOver15,
  includeOver25,
}) {
  const pool = winnerPredictions.map((prediction) => ({
    ...prediction,
    ticketMarket: "winner",
  }));

  if (includeOver15) {
    pool.push(
      ...over15Predictions.map((prediction) => ({
        ...prediction,
        predictedWinner: "Over 1.5",
        ticketMarket: "over15",
      })),
    );
  }

  if (includeOver25) {
    pool.push(
      ...over25Predictions.map((prediction) => ({
        ...prediction,
        predictedWinner: "Over 2.5",
        ticketMarket: "over25",
      })),
    );
  }

  return pool;
}

function buildTickets(pool, size) {
  const ticketSize = Math.max(1, size);
  if (pool.length === 0) return [];

  const initialTicketCount = Math.max(1, Math.ceil(pool.length / ticketSize));
  const tickets = Array.from({ length: initialTicketCount }, () =>
    createTicketBucket(),
  );
  const marketPlacementOrder = ["winner", "over15", "over25"];

  marketPlacementOrder.forEach((market) => {
    const marketPredictions = pool.filter(
      (prediction) => prediction.ticketMarket === market,
    );

    if (marketPredictions.length === 0) {
      return;
    }

    placePredictionsAcrossTickets(
      tickets,
      marketPredictions,
      ticketSize,
      (left, right) =>
        countMarketPicks(left, market) - countMarketPicks(right, market) ||
        left.picks.length - right.picks.length,
    );
  });

  return tickets
    .map((ticket) => ticket.picks)
    .filter((ticket) => ticket.length > 0);
}

function getMarketDistributionSummary(tickets, market) {
  if (tickets.length === 0) return null;

  const winnerCounts = tickets.map(
    (ticket) => ticket.filter((pick) => pick.ticketMarket === market).length,
  );
  const totalWinners = winnerCounts.reduce((sum, count) => sum + count, 0);

  return {
    totalPicks: totalWinners,
    minimum: Math.min(...winnerCounts),
    maximum: Math.max(...winnerCounts),
    average: totalWinners / tickets.length,
    ticketCount: tickets.length,
  };
}

function TicketCard({ matches, idx }) {
  return (
    <Card
      variant="outlined"
      sx={{ height: "100%", borderColor: "primary.main", borderWidth: 1.5 }}
    >
      <CardHeader
        avatar={<EmojiEventsIcon sx={{ color: "warning.main" }} />}
        title={
          <Typography variant="subtitle1" fontWeight={700}>
            Ticket {idx + 1}
          </Typography>
        }
        subheader={`${matches.length} match${matches.length !== 1 ? "es" : ""}`}
        sx={{ pb: 0, "& .MuiCardHeader-content": { overflow: "hidden" } }}
      />
      <Divider />
      <CardContent sx={{ pt: 1, pb: "12px !important" }}>
        <List dense disablePadding>
          {matches.map((p, i) => (
            <ListItem key={i} disableGutters sx={{ py: 0.4 }}>
              <ListItemText
                primary={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <Typography
                      component="span"
                      variant="body2"
                      fontWeight={700}
                      sx={{ mr: 0.5, color: "primary.main", minWidth: 18 }}
                    >
                      {i + 1}.
                    </Typography>
                    {/* Home team — bold + green if winner */}
                    <Typography
                      component="span"
                      variant="body2"
                      fontWeight={p.predictedWinner === p.homeTeam ? 700 : 400}
                      sx={{
                        color:
                          p.predictedWinner === p.homeTeam
                            ? "success.main"
                            : "text.primary",
                      }}
                    >
                      {p.homeTeam}
                    </Typography>
                    <Typography
                      component="span"
                      variant="body2"
                      sx={{ color: "text.disabled", mx: 0.5 }}
                    >
                      vs
                    </Typography>
                    {/* Away team — bold + green if winner */}
                    <Typography
                      component="span"
                      variant="body2"
                      fontWeight={p.predictedWinner === p.awayTeam ? 700 : 400}
                      sx={{
                        color:
                          p.predictedWinner === p.awayTeam
                            ? "success.main"
                            : "text.primary",
                      }}
                    >
                      {p.awayTeam}
                    </Typography>
                    <Box
                      sx={{
                        ml: "auto",
                        pl: 1,
                        display: "flex",
                        alignItems: "center",
                        gap: 0.75,
                        flexShrink: 0,
                      }}
                    >
                      <Chip
                        {...getTicketPickMeta(p)}
                        size="small"
                        sx={{ height: 22 }}
                      />
                      {p.leagueName && (
                        <Typography
                          component="span"
                          variant="caption"
                          sx={{
                            color: "text.secondary",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {p.leagueName}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                }
              />
            </ListItem>
          ))}
        </List>
      </CardContent>
    </Card>
  );
}

export default function TicketsTab({
  winnerPredictions = [],
  over15Predictions = [],
  over25Predictions = [],
  matchDate,
  onSaved,
}) {
  const [teamsPerTicket, setTeamsPerTicket] = useState(5);
  const [maxAppearances, setMaxAppearances] = useState(1);
  const [multiCount, setMultiCount] = useState(10);
  const [highConfidenceWinnersOnly, setHighConfidenceWinnersOnly] =
    useState(false);
  const [includeOver15, setIncludeOver15] = useState(false);
  const [includeOver25, setIncludeOver25] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const filteredWinnerPredictions = highConfidenceWinnersOnly
    ? winnerPredictions.filter((prediction) => prediction.confidence === "HIGH")
    : winnerPredictions;
  const ticketPredictions = buildTicketPredictions({
    winnerPredictions: filteredWinnerPredictions,
    over15Predictions,
    over25Predictions,
    includeOver15,
    includeOver25,
  });
  const noData = ticketPredictions.length === 0;
  const perTicket = Math.max(1, teamsPerTicket);
  const winnerDistribution = getMarketDistributionSummary(tickets, "winner");
  const over15Distribution = getMarketDistributionSummary(tickets, "over15");
  const over25Distribution = getMarketDistributionSummary(tickets, "over25");
  const ticketPoolSignature = [
    filteredWinnerPredictions
      .map((prediction) => `${prediction.matchId}:${prediction.predictedWinner}`)
      .join("|"),
    over15Predictions.map((prediction) => prediction.matchId).join("|"),
    over25Predictions.map((prediction) => prediction.matchId).join("|"),
    highConfidenceWinnersOnly,
    includeOver15,
    includeOver25,
    teamsPerTicket,
    maxAppearances,
  ].join("::");

  useEffect(() => {
    setTickets([]);
  }, [ticketPoolSignature]);

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

  return (
    <Box sx={{ pt: 2 }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 2,
          flexWrap: "wrap",
          mb: 3,
        }}
      >
        <TextField
          label="Teams per ticket"
          type="number"
          size="small"
          value={teamsPerTicket}
          onChange={(e) =>
            setTeamsPerTicket(Math.max(1, parseInt(e.target.value) || 1))
          }
          inputProps={{ min: 1 }}
          sx={{ width: 160 }}
        />
        <TextField
          label="Max appearances"
          type="number"
          size="small"
          value={maxAppearances}
          onChange={(e) =>
            setMaxAppearances(Math.max(1, parseInt(e.target.value) || 1))
          }
          inputProps={{ min: 1 }}
          sx={{ width: 160 }}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">per team</InputAdornment>
            ),
          }}
        />
        <FormGroup row sx={{ gap: 1 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={highConfidenceWinnersOnly}
                onChange={(event) =>
                  setHighConfidenceWinnersOnly(event.target.checked)
                }
              />
            }
            label={`High confidence winners only (${filteredWinnerPredictions.length}/${winnerPredictions.length})`}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={includeOver15}
                onChange={(event) => setIncludeOver15(event.target.checked)}
              />
            }
            label={`Include Over 1.5 (${over15Predictions.length})`}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={includeOver25}
                onChange={(event) => setIncludeOver25(event.target.checked)}
              />
            }
            label={`Include Over 2.5 (${over25Predictions.length})`}
          />
        </FormGroup>

        <Divider orientation="vertical" flexItem />

        <Button
          variant="contained"
          startIcon={<ShuffleIcon />}
          onClick={handleRandomize}
          disabled={noData}
          sx={{ height: 40 }}
        >
          Randomize
        </Button>

        <Divider orientation="vertical" flexItem />

        <TextField
          label="Shuffles"
          type="number"
          size="small"
          value={multiCount}
          onChange={(e) =>
            setMultiCount(Math.max(2, parseInt(e.target.value) || 2))
          }
          inputProps={{ min: 2 }}
          sx={{ width: 110 }}
        />
        <Button
          variant="outlined"
          startIcon={<FilterNoneIcon />}
          onClick={handleMultiRandomize}
          disabled={noData}
          sx={{ height: 40 }}
        >
          Multi Randomize
        </Button>

        {tickets.length > 0 && (
          <>
            <Button
              variant="contained"
              color="success"
              startIcon={
                saving ? (
                  <CircularProgress size={16} color="inherit" />
                ) : (
                  <SaveIcon />
                )
              }
              onClick={handleSave}
              disabled={saving}
              sx={{ height: 40 }}
            >
              Save Tickets
            </Button>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ ml: "auto" }}
            >
              {tickets.length} ticket{tickets.length !== 1 ? "s" : ""} &bull;{" "}
              {ticketPredictions.length * Math.max(1, maxAppearances)} match slots
            </Typography>
          </>
        )}
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          severity={snackbar.severity}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {noData && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ textAlign: "center", py: 6 }}
        >
          No ticket picks available. Run predictions first or enable goal markets.
        </Typography>
      )}

      {!noData && tickets.length === 0 && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ textAlign: "center", py: 6 }}
        >
          Press <strong>Randomize</strong> or <strong>Multi Randomize</strong>{" "}
          to generate betting tickets. The same match will never appear twice in
          the same ticket, even across different markets.
        </Typography>
      )}

      {tickets.length > 0 && (
        <>
          {winnerDistribution && winnerDistribution.totalPicks > 0 && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Match winner picks are distributed across {winnerDistribution.ticketCount} ticket
              {winnerDistribution.ticketCount !== 1 ? "s" : ""}: min{" "}
              {winnerDistribution.minimum}, max {winnerDistribution.maximum},
              average {winnerDistribution.average.toFixed(1)} per ticket.
            </Alert>
          )}
          {over15Distribution && over15Distribution.totalPicks > 0 && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Over 1.5 picks are distributed across {over15Distribution.ticketCount} ticket
              {over15Distribution.ticketCount !== 1 ? "s" : ""}: min{" "}
              {over15Distribution.minimum}, max {over15Distribution.maximum},
              average {over15Distribution.average.toFixed(1)} per ticket.
            </Alert>
          )}
          {over25Distribution && over25Distribution.totalPicks > 0 && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Over 2.5 picks are distributed across {over25Distribution.ticketCount} ticket
              {over25Distribution.ticketCount !== 1 ? "s" : ""}: min{" "}
              {over25Distribution.minimum}, max {over25Distribution.maximum},
              average {over25Distribution.average.toFixed(1)} per ticket.
            </Alert>
          )}
          <Grid container spacing={2}>
            {tickets.map((matches, idx) => (
              <Grid item xs={12} sm={6} md={4} key={idx}>
                <TicketCard matches={matches} idx={idx} />
              </Grid>
            ))}
          </Grid>
        </>
      )}
    </Box>
  );
}
