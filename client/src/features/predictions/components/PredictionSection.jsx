import React from "react";
import { Box, Button, CircularProgress, Tooltip } from "@mui/material";
import PredictionTable from "./PredictionTable";

function PredictionSection({
  h2hChainComplete,
  predictionsLoading,
  onRunPredictions,
  predictions,
  selectedDate,
}) {
  return (
    <>
      {/* Run Predictions Button */}
      <Box sx={{ mt: 3, display: "flex", justifyContent: "flex-end" }}>
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
        matchDate={selectedDate ? selectedDate.format("YYYY-MM-DD") : null}
      />
    </>
  );
}

export default PredictionSection;
