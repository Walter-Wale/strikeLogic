import React from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  Checkbox,
  CircularProgress,
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import PredictionTable from "./PredictionTable";
import { PREDICTION_SCOPE_OPTIONS } from "../utils/predictionScopeUtils";

function PredictionSection({
  canRunPredictions,
  syncedMatchCount,
  predictionScope,
  onPredictionScopeChange,
  favoriteCountries,
  onFavoriteCountriesChange,
  availableCountries,
  additionalLeagues,
  onAdditionalLeaguesChange,
  additionalLeagueOptions,
  favoriteCountryLeagueCount,
  predictionPreviewLeagues,
  predictionTargetMatchCount,
  predictionsLoading,
  onRunPredictions,
  onAnalyzeClick,
  predictions,
  predictionMode,
  onPredictionModeChange,
  goalMode,
  onGoalModeChange,
  scoreThreshold,
  onScoreThresholdChange,
  over15Threshold,
  onOver15ThresholdChange,
  over25Threshold,
  onOver25ThresholdChange,
  selectedDate,
}) {
  const isScoreMode = predictionMode === "score";
  const showAdditionalLeagues =
    predictionScope === PREDICTION_SCOPE_OPTIONS.FAVORITES_PLUS_LEAGUES;

  let predictionScopeSummary = `Predicting from all synced H2H matches (${syncedMatchCount} available).`;
  if (predictionScope === PREDICTION_SCOPE_OPTIONS.FAVORITE_COUNTRIES) {
    predictionScopeSummary = `Predicting from favourite countries: ${favoriteCountryLeagueCount} synced leagues, ${predictionTargetMatchCount} matches.`;
  } else if (
    predictionScope === PREDICTION_SCOPE_OPTIONS.FAVORITES_PLUS_LEAGUES
  ) {
    predictionScopeSummary = `Predicting from favourite countries plus ${additionalLeagues.length} extra leagues: ${predictionTargetMatchCount} matches.`;
  }

  const runDisabledReason = !canRunPredictions
    ? predictionScope === PREDICTION_SCOPE_OPTIONS.ALL_SYNCED
      ? "No synced H2H matches are available yet for the selected date."
      : "Your current prediction source selection does not include any synced matches."
    : "";

  return (
    <>
      {/* Prediction Controls */}
      <Box
        sx={{
          mt: 3,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 2,
          flexWrap: "wrap",
        }}
      >
        <Box
          sx={{
            display: "flex",
            gap: 2,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <Box>
            <Typography
              variant="subtitle2"
              sx={{ mb: 0.75, color: "text.secondary" }}
            >
              Prediction Mode
            </Typography>
            <ToggleButtonGroup
              value={predictionMode}
              exclusive
              size="small"
              onChange={(_, value) => {
                if (value) onPredictionModeChange(value);
              }}
            >
              <ToggleButton value="gate">Gate</ToggleButton>
              <ToggleButton value="score">Score</ToggleButton>
              <ToggleButton value="form">Form</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          <Box>
            <Typography
              variant="subtitle2"
              sx={{ mb: 0.75, color: "text.secondary" }}
            >
              Goal Mode
            </Typography>
            <ToggleButtonGroup
              value={goalMode}
              exclusive
              size="small"
              onChange={(_, value) => {
                if (value) onGoalModeChange(value);
              }}
            >
              <ToggleButton value="light">Light</ToggleButton>
              <ToggleButton value="strict">Strict</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          <FormControl sx={{ minWidth: 320 }}>
            <FormLabel sx={{ mb: 1, color: "text.secondary" }}>
              Prediction Source
            </FormLabel>
            <RadioGroup
              value={predictionScope}
              onChange={(event) => onPredictionScopeChange(event.target.value)}
            >
              <FormControlLabel
                value={PREDICTION_SCOPE_OPTIONS.ALL_SYNCED}
                control={<Radio size="small" />}
                label={`All synced H2H matches (${syncedMatchCount})`}
              />
              <FormControlLabel
                value={PREDICTION_SCOPE_OPTIONS.FAVORITE_COUNTRIES}
                control={<Radio size="small" />}
                label="Favourite countries"
              />
              <FormControlLabel
                value={PREDICTION_SCOPE_OPTIONS.FAVORITES_PLUS_LEAGUES}
                control={<Radio size="small" />}
                label="Favourite countries + additional leagues"
              />
            </RadioGroup>
          </FormControl>

          <Autocomplete
            multiple
            disableCloseOnSelect
            options={availableCountries}
            value={favoriteCountries}
            onChange={(_, value) => onFavoriteCountriesChange(value)}
            getOptionLabel={(option) => option}
            renderOption={(props, option, { selected }) => (
              <li {...props}>
                <Checkbox checked={selected} sx={{ mr: 1 }} />
                {option}
              </li>
            )}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Favourite Countries"
                placeholder="Select countries"
              />
            )}
            sx={{ minWidth: 280, flex: 1 }}
          />

          {showAdditionalLeagues && (
            <Autocomplete
              multiple
              disableCloseOnSelect
              options={additionalLeagueOptions}
              value={additionalLeagues}
              onChange={(_, value) => onAdditionalLeaguesChange(value)}
              getOptionLabel={(option) => option}
              renderOption={(props, option, { selected }) => (
                <li {...props}>
                  <Checkbox checked={selected} sx={{ mr: 1 }} />
                  {option}
                </li>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Additional Leagues"
                  placeholder="Add leagues"
                />
              )}
              sx={{ minWidth: 320, flex: 1 }}
            />
          )}

          {isScoreMode && (
            <TextField
              label="Score Threshold"
              type="number"
              size="small"
              value={scoreThreshold}
              onChange={(event) => onScoreThresholdChange(event.target.value)}
              inputProps={{ min: 0, step: 0.5 }}
              sx={{ width: 150, mt: { xs: 0, sm: 3 } }}
            />
          )}

          <TextField
            label="Over 1.5 Threshold"
            type="number"
            size="small"
            value={over15Threshold}
            onChange={(event) => onOver15ThresholdChange(event.target.value)}
            inputProps={{ min: 0, step: 0.5 }}
            sx={{ width: 165, mt: { xs: 0, sm: 3 } }}
          />

          <TextField
            label="Over 2.5 Threshold"
            type="number"
            size="small"
            value={over25Threshold}
            onChange={(event) => onOver25ThresholdChange(event.target.value)}
            inputProps={{ min: 0, step: 0.5 }}
            sx={{ width: 165, mt: { xs: 0, sm: 3 } }}
          />
        </Box>

        <Box sx={{ width: "100%" }}>
          <Alert severity="info" sx={{ mt: 1 }}>
            {predictionScopeSummary}
          </Alert>
          <Box
            sx={{
              mt: 1,
              p: 1.5,
              border: 1,
              borderColor: "divider",
              borderRadius: 1,
              backgroundColor: "background.paper",
            }}
          >
            <Typography
              variant="subtitle2"
              sx={{ mb: 1, color: "text.secondary" }}
            >
              League Preview ({predictionPreviewLeagues.length})
            </Typography>
            {predictionPreviewLeagues.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No leagues are currently selected for this prediction source.
              </Typography>
            ) : (
              <Box
                sx={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 1,
                  maxHeight: 160,
                  overflowY: "auto",
                  pr: 0.5,
                }}
              >
                {predictionPreviewLeagues.map((league) => (
                  <Chip key={league} label={league} size="small" />
                ))}
              </Box>
            )}
          </Box>
          {predictionScope === PREDICTION_SCOPE_OPTIONS.FAVORITE_COUNTRIES &&
            favoriteCountries.length === 0 && (
              <Alert severity="warning" sx={{ mt: 1 }}>
                Add at least one favourite country to use this prediction
                source.
              </Alert>
            )}
          {predictionScope ===
            PREDICTION_SCOPE_OPTIONS.FAVORITES_PLUS_LEAGUES &&
            favoriteCountries.length === 0 &&
            additionalLeagues.length === 0 && (
              <Alert severity="warning" sx={{ mt: 1 }}>
                Add a favourite country or choose additional leagues for this
                prediction source.
              </Alert>
            )}
        </Box>

        <Tooltip title={!canRunPredictions ? runDisabledReason : ""} arrow>
          <span>
            <Button
              variant="contained"
              size="large"
              disabled={!canRunPredictions || predictionsLoading}
              onClick={onRunPredictions}
              startIcon={
                predictionsLoading ? (
                  <CircularProgress size={18} color="inherit" />
                ) : null
              }
              sx={{ px: 4 }}
            >
              {predictionsLoading ? "Running..." : "Run Predictions"}
            </Button>
          </span>
        </Tooltip>
      </Box>

      {/* Prediction Results */}
      <PredictionTable
        predictions={predictions}
        loading={predictionsLoading}
        mode={predictionMode}
        goalMode={goalMode}
        threshold={scoreThreshold}
        over15Threshold={over15Threshold}
        over25Threshold={over25Threshold}
        onAnalyzeClick={onAnalyzeClick}
        matchDate={selectedDate ? selectedDate.format("YYYY-MM-DD") : null}
      />
    </>
  );
}

export default PredictionSection;
