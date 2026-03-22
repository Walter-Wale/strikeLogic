import React from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Divider,
  FormControlLabel,
  FormGroup,
  InputAdornment,
  Snackbar,
  TextField,
  Typography,
} from "@mui/material";
import ShuffleIcon from "@mui/icons-material/Shuffle";
import FilterNoneIcon from "@mui/icons-material/FilterNone";
import SaveIcon from "@mui/icons-material/Save";
import { normalizePercentage } from "../utils/ticketSelection";

function TicketControls({
  // Numeric inputs
  teamsPerTicket,
  setTeamsPerTicket,
  maxAppearances,
  setMaxAppearances,
  multiCount,
  setMultiCount,
  // Winner options
  highConfidenceWinnersOnly,
  setHighConfidenceWinnersOnly,
  hasHighConfidenceWinners,
  highConfidenceWinnerPredictions,
  overOddsWinnersOnly,
  setOverOddsWinnersOnly,
  overOddsWinnerPredictions,
  minOddsThreshold,
  setMinOddsThreshold,
  winnerPredictions,
  // Over 1.5 options
  includeOver15,
  setIncludeOver15,
  topOver15Only,
  setTopOver15Only,
  topOver15Percentage,
  setTopOver15Percentage,
  filteredOver15Predictions,
  over15Predictions,
  // Over 2.5 options
  includeOver25,
  setIncludeOver25,
  topOver25Only,
  setTopOver25Only,
  topOver25Percentage,
  setTopOver25Percentage,
  filteredOver25Predictions,
  over25Predictions,
  // Actions
  noData,
  handleRandomize,
  handleMultiRandomize,
  handleSave,
  // Save state
  tickets,
  saving,
  ticketPredictions,
  playedTicketIndices,
  // Snackbar
  snackbar,
  setSnackbar,
}) {
  return (
    <>
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
                disabled={!hasHighConfidenceWinners}
                onChange={(event) =>
                  setHighConfidenceWinnersOnly(event.target.checked)
                }
              />
            }
            label={`High confidence winners only (${highConfidenceWinnerPredictions.length}/${winnerPredictions.length})`}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={overOddsWinnersOnly}
                onChange={(event) =>
                  setOverOddsWinnersOnly(event.target.checked)
                }
              />
            }
            label={`Over ${minOddsThreshold} odd winners only (${overOddsWinnerPredictions.length}/${winnerPredictions.length})`}
          />
          <TextField
            label="Min odds"
            type="number"
            size="small"
            value={minOddsThreshold}
            onChange={(event) => {
              const val = parseFloat(event.target.value);
              if (Number.isFinite(val) && val > 0) setMinOddsThreshold(val);
            }}
            inputProps={{ min: 1.01, step: 0.05 }}
            disabled={!overOddsWinnersOnly}
            sx={{ width: 110 }}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={includeOver15}
                onChange={(event) => setIncludeOver15(event.target.checked)}
              />
            }
            label={`Include Over 1.5 (${filteredOver15Predictions.length}/${over15Predictions.length})`}
          />
          <TextField
            label="Top % O1.5"
            type="number"
            size="small"
            value={topOver15Percentage}
            onChange={(event) =>
              setTopOver15Percentage(
                normalizePercentage(event.target.value, 20),
              )
            }
            inputProps={{ min: 1, max: 100 }}
            disabled={
              !includeOver15 || !topOver15Only || over15Predictions.length === 0
            }
            sx={{ width: 110 }}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={topOver15Only}
                disabled={!includeOver15 || over15Predictions.length === 0}
                onChange={(event) => setTopOver15Only(event.target.checked)}
              />
            }
            label="Top % only O1.5"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={includeOver25}
                onChange={(event) => setIncludeOver25(event.target.checked)}
              />
            }
            label={`Include Over 2.5 (${filteredOver25Predictions.length}/${over25Predictions.length})`}
          />
          <TextField
            label="Top % O2.5"
            type="number"
            size="small"
            value={topOver25Percentage}
            onChange={(event) =>
              setTopOver25Percentage(
                normalizePercentage(event.target.value, 20),
              )
            }
            inputProps={{ min: 1, max: 100 }}
            disabled={
              !includeOver25 || !topOver25Only || over25Predictions.length === 0
            }
            sx={{ width: 110 }}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={topOver25Only}
                disabled={!includeOver25 || over25Predictions.length === 0}
                onChange={(event) => setTopOver25Only(event.target.checked)}
              />
            }
            label="Top % only O2.5"
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
              disabled={saving || playedTicketIndices.size === 0}
              sx={{ height: 40 }}
            >
              Save Played ({playedTicketIndices.size})
            </Button>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ ml: "auto" }}
            >
              {tickets.length} ticket{tickets.length !== 1 ? "s" : ""} &bull;{" "}
              {ticketPredictions.length * Math.max(1, maxAppearances)} match
              slots
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
    </>
  );
}

export default TicketControls;
