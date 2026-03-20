/**
 * PredictionTable Component
 * Displays home-team win predictions produced by the selected prediction mode.
 */

import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Typography,
  Chip,
  CircularProgress,
  Paper,
  Tab,
  Tabs,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import ConfirmationNumberIcon from "@mui/icons-material/ConfirmationNumber";
import HistoryIcon from "@mui/icons-material/History";
import TicketsTab from "./TicketsTab";
import PastTicketsTab from "./PastTicketsTab";

/**
 * Format a date string (YYYY-MM-DD) to DD/MM/YYYY for display.
 */
function formatDate(dateStr) {
  if (!dateStr) return "-";
  const [year, month, day] = dateStr.split("-");
  if (!year || !month || !day) return dateStr;
  return `${day}/${month}/${year}`;
}

/**
 * Format a time string (HH:MM:SS or HH:MM) to HH:MM for display.
 */
function formatTime(timeStr) {
  if (!timeStr) return "-";
  return timeStr.slice(0, 5);
}

function getConfidenceColor(confidence) {
  if (confidence === "HIGH") return "success";
  if (confidence === "MEDIUM") return "warning";
  return "default";
}

function renderGoalMarketChip(value, label) {
  return (
    <Chip
      label={`${label}: ${value ? "YES" : "NO"}`}
      size="small"
      color={value ? "success" : "default"}
      variant={value ? "filled" : "outlined"}
    />
  );
}

function normalizeNumericThreshold(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function isLightModeOver15Match(goalScore, over15Threshold, over25Threshold) {
  return goalScore > over15Threshold && goalScore < over25Threshold;
}

function isLightModeOver25Match(goalScore, over25Threshold) {
  return goalScore > over25Threshold;
}

function buildColumns(
  mode,
  onAnalyzeClick,
  goalMode,
  activeSubTab,
  over15Threshold,
  over25Threshold,
) {
  const commonColumns = [
    {
      field: "matchDate",
      headerName: "Date",
      width: 110,
      valueFormatter: (params) => formatDate(params.value),
    },
    {
      field: "matchTime",
      headerName: "Time",
      width: 80,
      valueFormatter: (params) => formatTime(params.value),
    },
    {
      field: "fixture",
      headerName: "Fixture",
      flex: 1,
      minWidth: 220,
      valueGetter: (params) =>
        `${params.row.homeTeam} vs ${params.row.awayTeam}`,
      renderCell: (params) => (
        <Box
          onClick={() => {
            if (!onAnalyzeClick) return;
            const match = params.row;
            onAnalyzeClick(
              match.matchId || match.id,
              match.flashscoreId || null,
              match.homeTeam,
              match.awayTeam,
            );
          }}
          sx={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            cursor: "pointer",
          }}
        >
          {params.value}
        </Box>
      ),
      sortable: false,
    },
  ];

  const winnerColumns = [
    ...commonColumns,
    {
      field: "predictedWinner",
      headerName: "Predicted Winner",
      width: 200,
      renderCell: (params) =>
        params.value ? (
          <Chip
            icon={<EmojiEventsIcon sx={{ color: "#fff !important" }} />}
            label={params.value}
            size="small"
            sx={{
              backgroundColor: "success.main",
              color: "white",
              fontWeight: 600,
              "& .MuiChip-icon": { color: "white" },
            }}
          />
        ) : (
          "-"
        ),
      sortable: false,
    },
    {
      field: "oddsHome",
      headerName: "Home W",
      width: 85,
      align: "center",
      headerAlign: "center",
      valueFormatter: (params) =>
        params.value != null ? Number(params.value).toFixed(2) : "-",
    },
    {
      field: "oddsDraw",
      headerName: "Draw",
      width: 85,
      align: "center",
      headerAlign: "center",
      valueFormatter: (params) =>
        params.value != null ? Number(params.value).toFixed(2) : "-",
    },
    {
      field: "oddsAway",
      headerName: "Away W",
      width: 85,
      align: "center",
      headerAlign: "center",
      valueFormatter: (params) =>
        params.value != null ? Number(params.value).toFixed(2) : "-",
    },
  ];

  const goalColumns = [
    ...commonColumns,
    {
      field: "goalScore",
      headerName: "Goal Score",
      width: 110,
      align: "center",
      headerAlign: "center",
      valueFormatter: (params) =>
        params.value != null ? Number(params.value).toFixed(2) : "-",
    },
  ];

  if (activeSubTab === "over15") {
    return [
      ...goalColumns,
      {
        field: "over15Band",
        headerName: "Over 1.5",
        width: 130,
        align: "center",
        headerAlign: "center",
        renderCell: (params) =>
          renderGoalMarketChip(
            goalMode === "strict"
              ? Boolean(params.row.over15)
              : isLightModeOver15Match(
                  params.row.goalScore,
                  over15Threshold,
                  over25Threshold,
                ),
            "O1.5",
          ),
        sortable: false,
      },
    ];
  }

  if (activeSubTab === "over25") {
    return [
      ...goalColumns,
      {
        field: "over25Band",
        headerName: "Over 2.5",
        width: 130,
        align: "center",
        headerAlign: "center",
        renderCell: (params) =>
          renderGoalMarketChip(
            goalMode === "strict"
              ? Boolean(params.row.over25)
              : isLightModeOver25Match(params.row.goalScore, over25Threshold),
            "O2.5",
          ),
        sortable: false,
      },
    ];
  }

  if (mode !== "score") {
    return winnerColumns;
  }

  const scoredColumns = [
    ...winnerColumns,
    {
      field: "score",
      headerName: "Score",
      width: 95,
      align: "center",
      headerAlign: "center",
      valueFormatter: (params) =>
        params.value != null ? Number(params.value).toFixed(2) : "-",
    },
    {
      field: "confidence",
      headerName: "Confidence",
      width: 120,
      align: "center",
      headerAlign: "center",
      renderCell: (params) => (
        <Chip
          label={params.value || "LOW"}
          size="small"
          color={getConfidenceColor(params.value)}
          variant={params.value === "HIGH" ? "filled" : "outlined"}
        />
      ),
    },
  ];
  return scoredColumns;
}

export default function PredictionTable({
  predictions = [],
  loading = false,
  mode = "gate",
  goalMode = "light",
  threshold = "10",
  over15Threshold = "7",
  over25Threshold = "11",
  onAnalyzeClick,
  matchDate,
}) {
  const [activeTab, setActiveTab] = useState(0);
  const [activeSubTab, setActiveSubTab] = useState("winners");
  // Timestamp bumped on every successful save - triggers PastTicketsTab to refetch
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const isScoreMode = mode === "score";
  const isStrictGoalMode = goalMode === "strict";
  const thresholdLabel = threshold === "" || threshold == null ? "10" : threshold;
  const over15ThresholdValue = normalizeNumericThreshold(over15Threshold, 7);
  const over25ThresholdValue = normalizeNumericThreshold(over25Threshold, 11);
  const over15ThresholdLabel = String(over15ThresholdValue);
  const over25ThresholdLabel = String(over25ThresholdValue);
  const winnerPredictions = predictions.filter((prediction) =>
    Boolean(prediction.predictedWinner),
  );
  const over15Predictions = predictions.filter((prediction) =>
    goalMode === "strict"
      ? prediction.over15 === true
      : isLightModeOver15Match(
          prediction.goalScore,
          over15ThresholdValue,
          over25ThresholdValue,
        ),
  );
  const over25Predictions = predictions.filter((prediction) =>
    goalMode === "strict"
      ? prediction.over25 === true
      : isLightModeOver25Match(prediction.goalScore, over25ThresholdValue),
  );

  useEffect(() => {
    const counts = {
      winners: winnerPredictions.length,
      over15: over15Predictions.length,
      over25: over25Predictions.length,
    };

    if (counts[activeSubTab] > 0) {
      return;
    }

    if (counts.winners > 0) {
      setActiveSubTab("winners");
      return;
    }

    if (counts.over15 > 0) {
      setActiveSubTab("over15");
      return;
    }

    if (counts.over25 > 0) {
      setActiveSubTab("over25");
    }
  }, [
    activeSubTab,
    winnerPredictions.length,
    over15Predictions.length,
    over25Predictions.length,
  ]);

  let filteredPredictions = winnerPredictions;

  if (activeSubTab === "over15") {
    filteredPredictions = over15Predictions;
  }

  if (activeSubTab === "over25") {
    filteredPredictions = over25Predictions;
  }

  const columns = buildColumns(
    mode,
    onAnalyzeClick,
    goalMode,
    activeSubTab,
    over15ThresholdValue,
    over25ThresholdValue,
  );
  const headerCount = filteredPredictions.length;
  const headerLabel =
    activeSubTab === "winners"
      ? "predicted win"
      : activeSubTab === "over15"
        ? "over 1.5 pick"
        : "over 2.5 pick";

  // Assign stable row IDs from matchId
  const rows = filteredPredictions.map((prediction) => ({
    ...prediction,
    id: prediction.matchId,
  }));

  return (
    <Paper elevation={2} sx={{ p: 3, mt: 3 }}>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          mb: 2,
          flexWrap: "wrap",
        }}
      >
        <EmojiEventsIcon sx={{ color: "warning.main", fontSize: 28 }} />
        <Typography variant="h5">
          Predictions
          {headerCount > 0 && (
            <Typography
              component="span"
              sx={{ ml: 2, color: "text.secondary", fontSize: "1rem" }}
            >
              ({headerCount} {headerLabel}
              {headerCount !== 1 ? "s" : ""})
            </Typography>
          )}
        </Typography>
        <Chip
          label={isScoreMode ? "Score Mode" : "Gate Mode"}
          size="small"
          color={isScoreMode ? "primary" : "default"}
          variant={isScoreMode ? "filled" : "outlined"}
        />
        <Chip
          label={`Goal ${isStrictGoalMode ? "Strict" : "Light"}`}
          size="small"
          color={isStrictGoalMode ? "warning" : "default"}
          variant={isStrictGoalMode ? "filled" : "outlined"}
        />
        {isScoreMode && (
          <Chip
            label={`Threshold ${thresholdLabel}`}
            size="small"
            color="secondary"
            variant="outlined"
          />
        )}
        <Chip
          label={
            goalMode === "strict"
              ? `O1.5 > ${over15ThresholdLabel}`
              : `O1.5 > ${over15ThresholdLabel} < ${over25ThresholdLabel}`
          }
          size="small"
          color={activeSubTab === "over15" ? "success" : "default"}
          variant={activeSubTab === "over15" ? "filled" : "outlined"}
        />
        <Chip
          label={
            goalMode === "strict"
              ? "O2.5 Top 30% of O1.5 pool"
              : `O2.5 > ${over25ThresholdLabel}`
          }
          size="small"
          color={activeSubTab === "over25" ? "success" : "default"}
          variant={activeSubTab === "over25" ? "filled" : "outlined"}
        />
        {loading && <CircularProgress size={20} sx={{ ml: 1 }} />}
      </Box>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onChange={(_, v) => setActiveTab(v)}
        sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}
      >
        <Tab
          icon={<EmojiEventsIcon fontSize="small" />}
          iconPosition="start"
          label="Predictions"
        />
        <Tab
          icon={<ConfirmationNumberIcon fontSize="small" />}
          iconPosition="start"
          label="Tickets"
        />
        <Tab
          icon={<HistoryIcon fontSize="small" />}
          iconPosition="start"
          label="Past Tickets"
        />
      </Tabs>

      {/* Predictions tab panel - always mounted, hidden when inactive */}
      <Box sx={{ display: activeTab === 0 ? "block" : "none" }}>
        <Box sx={{ display: "flex", gap: 1, mb: 2, flexWrap: "wrap" }}>
          <Button
            variant={activeSubTab === "winners" ? "contained" : "outlined"}
            onClick={() => setActiveSubTab("winners")}
          >
            Match Winners ({winnerPredictions.length})
          </Button>
          <Button
            variant={activeSubTab === "over15" ? "contained" : "outlined"}
            onClick={() => setActiveSubTab("over15")}
          >
            Over 1.5 ({over15Predictions.length})
          </Button>
          <Button
            variant={activeSubTab === "over25" ? "contained" : "outlined"}
            onClick={() => setActiveSubTab("over25")}
          >
            Over 2.5 ({over25Predictions.length})
          </Button>
        </Box>

        {!loading && filteredPredictions.length === 0 ? (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ py: 4, textAlign: "center" }}
          >
            {activeSubTab === "winners" &&
              (isScoreMode
                ? "No predictions met the selected scoring threshold."
                : "No strong home-team predictions found for the selected matches.")}
            {activeSubTab === "over15" &&
              "No matches cleared the Over 1.5 entry threshold."}
            {activeSubTab === "over25" &&
              (goalMode === "strict"
                ? "No matches made the top-30% cut for Over 2.5."
                : "No matches exceeded the Over 2.5 threshold.")}
          </Typography>
        ) : (
          <DataGrid
            rows={rows}
            columns={columns}
            loading={loading}
            pageSizeOptions={[10, 25, 50]}
            initialState={{
              pagination: { paginationModel: { pageSize: 10 } },
            }}
            disableRowSelectionOnClick
            autoHeight
            sx={{
              "& .MuiDataGrid-columnHeader": {
                backgroundColor: "primary.main",
                color: "white",
                fontWeight: 700,
              },
              "& .MuiDataGrid-columnHeader .MuiDataGrid-sortIcon": {
                color: "white",
              },
              "& .MuiDataGrid-row:hover": {
                backgroundColor: "action.hover",
              },
            }}
          />
        )}
      </Box>

      {/* Tickets tab panel - always mounted, hidden when inactive */}
      <Box sx={{ display: activeTab === 1 ? "block" : "none" }}>
        <TicketsTab
          winnerPredictions={winnerPredictions}
          over15Predictions={over15Predictions}
          over25Predictions={over25Predictions}
          matchDate={matchDate}
          onSaved={() => setLastSavedAt(Date.now())}
        />
      </Box>

      {/* Past Tickets tab panel - always mounted, hidden when inactive */}
      <Box sx={{ display: activeTab === 2 ? "block" : "none" }}>
        <PastTicketsTab lastSavedAt={lastSavedAt} />
      </Box>
    </Paper>
  );
}
