import React from "react";
import {
  Box,
  Button,
  CircularProgress,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import PredictionTable from "./PredictionTable";

function PredictionSection({
  h2hChainComplete,
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
        <Box sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
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

        <Tooltip
          title={
            !h2hChainComplete
              ? "Available after the automated H2H chain completes"
              : ""
          }
          arrow
        >
          <span>
            <Button
              variant="contained"
              size="large"
              disabled={!h2hChainComplete || predictionsLoading}
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
