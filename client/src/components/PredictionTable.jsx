/**
 * PredictionTable Component
 * Displays home-team win predictions produced by the algorithm.
 *
 * Prediction criteria (home team only):
 *   Gate 1 — HOME_FORM: >= 4 wins AND <= 3 losses
 *   Gate 2 — DIRECT_H2H: <= 3 total losses AND >= 2 home wins
 */

import React, { useState } from "react";
import {
  Box,
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

const columns = [
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
    valueGetter: (params) => `${params.row.homeTeam} vs ${params.row.awayTeam}`,
    sortable: false,
  },
  {
    field: "predictedWinner",
    headerName: "Predicted Winner",
    width: 200,
    renderCell: (params) => (
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
      params.value != null ? Number(params.value).toFixed(2) : "—",
  },
  {
    field: "oddsDraw",
    headerName: "Draw",
    width: 85,
    align: "center",
    headerAlign: "center",
    valueFormatter: (params) =>
      params.value != null ? Number(params.value).toFixed(2) : "—",
  },
  {
    field: "oddsAway",
    headerName: "Away W",
    width: 85,
    align: "center",
    headerAlign: "center",
    valueFormatter: (params) =>
      params.value != null ? Number(params.value).toFixed(2) : "—",
  },
];

export default function PredictionTable({
  predictions = [],
  loading = false,
  matchDate,
}) {
  const [activeTab, setActiveTab] = useState(0);

  // Assign stable row IDs from matchId
  const rows = predictions.map((p) => ({ ...p, id: p.matchId }));

  return (
    <Paper elevation={2} sx={{ p: 3, mt: 3 }}>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          mb: 2,
        }}
      >
        <EmojiEventsIcon sx={{ color: "warning.main", fontSize: 28 }} />
        <Typography variant="h5">
          Predictions
          {predictions.length > 0 && (
            <Typography
              component="span"
              sx={{ ml: 2, color: "text.secondary", fontSize: "1rem" }}
            >
              ({predictions.length} predicted win
              {predictions.length !== 1 ? "s" : ""})
            </Typography>
          )}
        </Typography>
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

      {/* Predictions tab panel — always mounted, hidden when inactive */}
      <Box sx={{ display: activeTab === 0 ? "block" : "none" }}>
        {!loading && predictions.length === 0 ? (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ py: 4, textAlign: "center" }}
          >
            No strong home-team predictions found for the selected matches.
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

      {/* Tickets tab panel — always mounted, hidden when inactive */}
      <Box sx={{ display: activeTab === 1 ? "block" : "none" }}>
        <TicketsTab predictions={predictions} matchDate={matchDate} />
      </Box>

      {/* Past Tickets tab panel — always mounted, hidden when inactive */}
      <Box sx={{ display: activeTab === 2 ? "block" : "none" }}>
        <PastTicketsTab />
      </Box>
    </Paper>
  );
}
