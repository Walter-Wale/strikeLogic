import React, { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  CircularProgress,
  Divider,
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

function chunk(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

function buildPool(predictions, maxAppearances) {
  const pool = [];
  for (let i = 0; i < Math.max(1, maxAppearances); i++) {
    pool.push(...predictions);
  }
  return pool;
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
                    {/* League label pushed to the right */}
                    {p.leagueName && (
                      <Typography
                        component="span"
                        variant="caption"
                        sx={{
                          ml: "auto",
                          pl: 1,
                          color: "text.secondary",
                          whiteSpace: "nowrap",
                          flexShrink: 0,
                        }}
                      >
                        {p.leagueName}
                      </Typography>
                    )}
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

export default function TicketsTab({ predictions = [], matchDate, onSaved }) {
  const [teamsPerTicket, setTeamsPerTicket] = useState(5);
  const [maxAppearances, setMaxAppearances] = useState(1);
  const [multiCount, setMultiCount] = useState(10);
  const [tickets, setTickets] = useState([]);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const noData = predictions.length === 0;
  const perTicket = Math.max(1, teamsPerTicket);

  function handleRandomize() {
    if (noData) return;
    const pool = buildPool(predictions, maxAppearances);
    setTickets(chunk(shuffle(pool), perTicket));
  }

  function handleMultiRandomize() {
    if (noData) return;
    let pool = buildPool(predictions, maxAppearances);
    const times = Math.max(2, multiCount);
    for (let i = 0; i < times; i++) {
      pool = shuffle(pool);
    }
    setTickets(chunk(pool, perTicket));
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
              {predictions.length * Math.max(1, maxAppearances)} match slots
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
          No predictions available. Run predictions first to generate tickets.
        </Typography>
      )}

      {!noData && tickets.length === 0 && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ textAlign: "center", py: 6 }}
        >
          Press <strong>Randomize</strong> or <strong>Multi Randomize</strong>{" "}
          to generate betting tickets.
        </Typography>
      )}

      {tickets.length > 0 && (
        <Grid container spacing={2}>
          {tickets.map((matches, idx) => (
            <Grid item xs={12} sm={6} md={4} key={idx}>
              <TicketCard matches={matches} idx={idx} />
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}
