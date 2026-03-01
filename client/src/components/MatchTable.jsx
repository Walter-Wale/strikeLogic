/**
 * MatchTable Component
 * Displays matches in a data grid with analyze action
 */

import React from "react";
import { DataGrid } from "@mui/x-data-grid";
import { Button, Chip } from "@mui/material";
import AnalyticsIcon from "@mui/icons-material/Analytics";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";

const MatchTable = ({ matches, loading, onAnalyzeClick }) => {
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
    <div style={{ height: 600, width: "100%" }}>
      <DataGrid
        rows={matches}
        columns={columns}
        pageSize={10}
        rowsPerPageOptions={[10, 25, 50]}
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
  );
};

export default MatchTable;
