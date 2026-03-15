import React from "react";
import { Paper, Typography } from "@mui/material";
import MatchTable from "./MatchTable";

function MatchSection({ matches, loading, onAnalyzeClick }) {
  return (
    <Paper elevation={2} sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>
        Match Fixtures
        {matches.length > 0 && (
          <Typography
            component="span"
            sx={{ ml: 2, color: "text.secondary", fontSize: "1rem" }}
          >
            ({matches.length} matches)
          </Typography>
        )}
      </Typography>

      <MatchTable
        matches={matches}
        loading={loading}
        onAnalyzeClick={onAnalyzeClick}
      />
    </Paper>
  );
}

export default MatchSection;
