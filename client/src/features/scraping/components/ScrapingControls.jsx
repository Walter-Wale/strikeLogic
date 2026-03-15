import React from "react";
import {
  Paper,
  Typography,
  Grid,
  Button,
  Box,
  CircularProgress,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import DatePicker from "../../../components/common/DatePicker";
import LeagueSelector from "../../../components/common/LeagueSelector";

function ScrapingControls({
  selectedDate,
  onDateChange,
  selectedLeagues,
  onLeaguesChange,
  allMatches,
  loading,
  onLoadReady,
}) {
  return (
    <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
      <Typography
        variant="h6"
        gutterBottom
        sx={{ mb: 2, color: "primary.main" }}
      >
        🔄 Automated Scraping Dashboard
      </Typography>
      <Typography variant="body2" sx={{ mb: 2, color: "text.secondary" }}>
        Select a date and leagues - scraping happens automatically with full H2H
        analysis for every match
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <DatePicker value={selectedDate} onChange={onDateChange} />
        </Grid>
        <Grid item xs={12} md={6}>
          <LeagueSelector
            value={selectedLeagues}
            onChange={onLeaguesChange}
            matches={allMatches}
          />
        </Grid>
        <Grid item xs={12}>
          <Button
            variant="outlined"
            color="success"
            size="large"
            onClick={onLoadReady}
            disabled={loading}
            startIcon={<CheckCircleIcon />}
          >
            Load Ready Matches (H2H Complete)
          </Button>
        </Grid>
      </Grid>
      {loading && (
        <Box sx={{ mt: 2, display: "flex", alignItems: "center", gap: 1 }}>
          <CircularProgress size={20} />
          <Typography variant="body2" color="primary">
            Automated scraping in progress... Check LogConsole for details
          </Typography>
        </Box>
      )}
    </Paper>
  );
}

export default ScrapingControls;
