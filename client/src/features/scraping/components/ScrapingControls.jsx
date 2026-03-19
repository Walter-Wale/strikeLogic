import React from "react";
import {
  Paper,
  Typography,
  Grid,
  Button,
  Box,
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import DatePicker from "../../../components/common/DatePicker";
import LeagueSelector from "../../../components/common/LeagueSelector";

function ScrapingControls({
  selectedDate,
  onDateChange,
  selectedLeagues,
  onLeaguesChange,
  allMatches,
  loading,
  onStartH2H,
  scrapeMode,
  onScrapeModeChange,
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
        Select a date to load fixtures and odds, then select leagues and click
        Start H2H Analysis to scrape form data for those matches.
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
          <Box
            sx={{
              display: "flex",
              gap: 2,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <ToggleButtonGroup
              value={scrapeMode}
              exclusive
              onChange={(_, value) => {
                if (value) onScrapeModeChange(value);
              }}
              size="small"
            >
              <ToggleButton value="feed">⚡ Fast</ToggleButton>
              <ToggleButton value="auto">🔁 Auto</ToggleButton>
              <ToggleButton value="puppeteer">🧠 Safe</ToggleButton>
            </ToggleButtonGroup>
            <Button
              variant="contained"
              color="primary"
              size="large"
              onClick={onStartH2H}
              disabled={selectedLeagues.length === 0 || loading}
            >
              Start H2H Analysis
            </Button>
          </Box>
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
