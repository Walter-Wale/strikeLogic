/**
 * MatchTable Component
 * Displays matches in a data grid with analyze action
 */

import React, { useState } from "react";
import { DataGrid } from "@mui/x-data-grid";
import { Button, Chip, TextField, InputAdornment, Box } from "@mui/material";
import AnalyticsIcon from "@mui/icons-material/Analytics";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import SearchIcon from "@mui/icons-material/Search";

const MatchTable = ({ matches, loading, onAnalyzeClick }) => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredMatches = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return matches;
    return matches.filter((match) => {
      const league =
        match.league?.name ||
        match.League?.name ||
        match.leagueName ||
        match.league_name ||
        "";
      return (
        match.homeTeam?.toLowerCase().includes(q) ||
        match.awayTeam?.toLowerCase().includes(q) ||
        league.toLowerCase().includes(q)
      );
    });
  }, [matches, searchQuery]);
  // Define columns for the data grid
  const columns = [
    {
      field: "matchTime",
      headerName: "Time",
      width: 80,
      sortable: true,
    },
    {
      field: "homeTeam",
      headerName: "Home Team",
      width: 180,
      sortable: true,
    },
    {
      field: "awayTeam",
      headerName: "Away Team",
      width: 180,
      sortable: true,
    },
    {
      field: "league",
      headerName: "League",
      width: 150,
      sortable: true,
      valueGetter: (params) => {
        return (
          params.row.league?.name ||
          params.row.League?.name ||
          params.row.leagueName ||
          params.row.league_name ||
          "Unknown"
        );
      },
    },
    {
      field: "oddsHome",
      headerName: "Home W",
      width: 80,
      sortable: true,
      align: "center",
      headerAlign: "center",
      valueFormatter: (params) =>
        params.value != null ? params.value.toFixed(2) : "—",
    },
    {
      field: "oddsDraw",
      headerName: "Draw",
      width: 80,
      sortable: true,
      align: "center",
      headerAlign: "center",
      valueFormatter: (params) =>
        params.value != null ? params.value.toFixed(2) : "—",
    },
    {
      field: "oddsAway",
      headerName: "Away W",
      width: 80,
      sortable: true,
      align: "center",
      headerAlign: "center",
      valueFormatter: (params) =>
        params.value != null ? params.value.toFixed(2) : "—",
    },
    {
      field: "h2hStatus",
      headerName: "H2H Status",
      width: 130,
      sortable: true,
      renderCell: (params) => {
        const h2hScraped = params.row.h2hScraped;

        return (
          <Chip
            icon={h2hScraped ? <CheckCircleIcon /> : <HourglassEmptyIcon />}
            label={h2hScraped ? "Synced" : "Pending"}
            color={h2hScraped ? "success" : "warning"}
            size="small"
            variant={h2hScraped ? "filled" : "outlined"}
          />
        );
      },
    },
    {
      field: "status",
      headerName: "Status",
      width: 120,
      sortable: true,
      renderCell: (params) => {
        const status = params.row.status || "scheduled";
        let color = "default";

        switch (status) {
          case "finished":
            color = "success";
            break;
          case "live":
            color = "error";
            break;
          case "scheduled":
            color = "info";
            break;
          case "postponed":
          case "cancelled":
            color = "warning";
            break;
          default:
            color = "default";
        }

        return (
          <Chip
            label={status.charAt(0).toUpperCase() + status.slice(1)}
            color={color}
            size="small"
          />
        );
      },
    },
    {
      field: "actions",
      headerName: "Actions",
      width: 130,
      sortable: false,
      renderCell: (params) => {
        const match = params.row;
        return (
          <Button
            variant="contained"
            size="small"
            startIcon={<AnalyticsIcon />}
            onClick={() =>
              onAnalyzeClick(
                match.id,
                match.flashscoreId,
                match.homeTeam,
                match.awayTeam,
              )
            }
            sx={{ textTransform: "none" }}
            disabled={!match.h2hScraped}
          >
            Analyze
          </Button>
        );
      },
    },
  ];

  return (
    <Box>
      <TextField
        placeholder="Search team or league…"
        size="small"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          ),
        }}
        sx={{ mb: 2, width: 320 }}
      />
      <div style={{ height: 600, width: "100%" }}>
        <DataGrid
          rows={filteredMatches}
          columns={columns}
          pageSizeOptions={[10, 25, 50]}
          loading={loading}
          disableSelectionOnClick
          autoHeight
          getRowId={(row) => row.id}
          sx={{
            "& .MuiDataGrid-cell:focus": {
              outline: "none",
            },
            "& .MuiDataGrid-row:hover": {
              backgroundColor: "action.hover",
            },
          }}
          initialState={{
            pagination: {
              paginationModel: { pageSize: 10, page: 0 },
            },
          }}
        />
      </div>
    </Box>
  );
};

export default MatchTable;
