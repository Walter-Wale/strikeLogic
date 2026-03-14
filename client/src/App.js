/**
 * Main App Component
 * StrikeLogic - Football Data Analysis Application
 */

import React, { useState, useEffect } from "react";
import {
  Container,
  Box,
  Typography,
  Grid,
  Paper,
  Alert,
  CircularProgress,
  Button,
  Tooltip,
} from "@mui/material";
import SportsSoccerIcon from "@mui/icons-material/SportsSoccer";
import dayjs from "dayjs";

// Import components
import DatePicker from "./components/DatePicker";
import LeagueSelector from "./components/LeagueSelector";
import MatchTable from "./components/MatchTable";
import LogConsole from "./components/LogConsole";
import H2HModal from "./components/H2HModal";
import PredictionTable from "./components/PredictionTable";

// Import services
import {
  fetchMatchesByDate,
  scrapeH2HByLeagues,
  fetchPredictions,
} from "./services/apiService";
import {
  initializeSocket,
  disconnect,
  subscribeToH2HSynced,
  subscribeToLogs,
} from "./services/socketService";

function App() {
  // State management
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [selectedLeagues, setSelectedLeagues] = useState([]);
  const [allMatches, setAllMatches] = useState([]); // full unfiltered list for the date
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Derive filtered matches client-side so league selector always sees all leagues
  const matches = React.useMemo(() => {
    if (selectedLeagues.length === 0) return allMatches;
    return allMatches.filter((m) => {
      const league = m.leagueName || m.league_name || m.league?.name || "";
      return selectedLeagues.includes(league);
    });
  }, [allMatches, selectedLeagues]);

  // H2H Modal state
  const [h2hModalOpen, setH2hModalOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState({
    matchId: null,
    flashscoreId: null,
    homeTeam: "",
    awayTeam: "",
  });

  // Prediction state
  const [chainCompleteDetected, setChainCompleteDetected] = useState(false);
  const [predictions, setPredictions] = useState([]);
  const [predictionsLoading, setPredictionsLoading] = useState(false);

  // Button is enabled when: the chain-complete log fired, OR all visible synced matches exist
  const allMatchesSynced =
    matches.length > 0 && matches.every((m) => m.isSynced || m.h2hScraped);
  const h2hChainComplete = chainCompleteDetected || allMatchesSynced;

  // Initialize socket connection on mount
  useEffect(() => {
    initializeSocket();

    // Real-time H2H sync: mark individual matches as synced when server notifies us
    const unsubscribeH2H = subscribeToH2HSynced(({ matchId }) => {
      setAllMatches((prev) =>
        prev.map((m) =>
          m.id === matchId ? { ...m, h2hScraped: true, isSynced: true } : m,
        ),
      );
    });

    // Detect H2H chain completion: enable the Run Predictions button
    const unsubscribeLogs = subscribeToLogs(({ message }) => {
      if (message && message.includes("Automated H2H chain complete")) {
        setChainCompleteDetected(true);
      }
    });

    return () => {
      unsubscribeH2H();
      unsubscribeLogs();
      disconnect();
    };
  }, []);

  // Reset predictions and chain detection flag when the user picks a new date or changes leagues
  useEffect(() => {
    setChainCompleteDetected(false);
    setPredictions([]);
  }, [selectedDate, selectedLeagues]);

  // AUTOMATED WORKFLOW: Fetch all matches when date changes (no league filter — filtering is client-side)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (selectedDate) {
        handleFetchMatches();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [selectedDate]); // Only re-fetch from server when date changes

  // AUTOMATED WORKFLOW: Trigger H2H scraping when leagues are selected
  useEffect(() => {
    // Only trigger if we have matches loaded and leagues selected
    if (
      selectedLeagues.length > 0 &&
      matches.length > 0 &&
      !loading &&
      selectedDate
    ) {
      const timer = setTimeout(() => {
        const formattedDate = selectedDate.format("YYYY-MM-DD");

        scrapeH2HByLeagues(formattedDate, selectedLeagues)
          .then((response) => {
            console.log(
              `H2H scraping started for ${response.matchCount} matches in ${response.leagues.join(", ")}`,
            );
          })
          .catch((err) => {
            console.error("Failed to start H2H scraping:", err);
          });
      }, 1000); // 1 second debounce

      return () => clearTimeout(timer);
    }
  }, [selectedLeagues, matches.length, loading, selectedDate]);

  // REMOVED: Auto-refresh was causing excessive database queries
  // User can manually refresh by changing date or clicking "Scrape Matches"

  // Handler: Fetch all matches for the date (no league filter — filtering is applied client-side)
  const handleFetchMatches = async () => {
    setLoading(true);
    setError(null);
    setAllMatches([]);

    try {
      // Format date to YYYY-MM-DD
      const formattedDate = selectedDate.format("YYYY-MM-DD");

      // Always fetch ALL matches for the date; league filtering is done client-side
      const response = await fetchMatchesByDate(formattedDate, []);

      if (response.success) {
        setAllMatches(response.data || []);
      } else {
        setError(response.error || "Failed to fetch matches");
      }
    } catch (err) {
      setError(err.message || "An error occurred while fetching matches");
    } finally {
      setLoading(false);
    }
  };

  // Handler: Analyze match (open H2H modal)
  const handleAnalyzeClick = (matchId, flashscoreId, homeTeam, awayTeam) => {
    setSelectedMatch({
      matchId,
      flashscoreId,
      homeTeam,
      awayTeam,
    });
    setH2hModalOpen(true);
  };

  // Handler: Close H2H modal
  const handleCloseH2HModal = () => {
    setH2hModalOpen(false);
    // Clear selected match after animation completes
    setTimeout(() => {
      setSelectedMatch({
        matchId: null,
        flashscoreId: null,
        homeTeam: "",
        awayTeam: "",
      });
    }, 300);
  };

  // Handler: Run predictions
  const handleRunPredictions = async () => {
    setPredictionsLoading(true);
    try {
      const formattedDate = selectedDate.format("YYYY-MM-DD");
      const response = await fetchPredictions(formattedDate, selectedLeagues);
      if (response.success) {
        setPredictions(response.data || []);
      }
    } catch (err) {
      console.error("Error fetching predictions:", err);
    } finally {
      setPredictionsLoading(false);
    }
  };

  return (
    <Box sx={{ bgcolor: "background.default", minHeight: "100vh", py: 4 }}>
      <Container maxWidth="xl">
        {/* Header */}
        <Paper
          elevation={3}
          sx={{
            p: 3,
            mb: 4,
            background: "linear-gradient(135deg, #1976d2 0%, #1565c0 100%)",
            color: "white",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <SportsSoccerIcon sx={{ fontSize: 48 }} />
            <Box>
              <Typography variant="h3" component="h1">
                StrikeLogic
              </Typography>
              <Typography variant="subtitle1">
                Professional Football Data Analysis & Prediction Platform
              </Typography>
            </Box>
          </Box>
        </Paper>

        {/* Date & League Selection */}
        <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
          <Typography
            variant="h6"
            gutterBottom
            sx={{ mb: 2, color: "primary.main" }}
          >
            🔄 Automated Scraping Dashboard
          </Typography>
          <Typography variant="body2" sx={{ mb: 2, color: "text.secondary" }}>
            Select a date and leagues - scraping happens automatically with full
            H2H analysis for every match
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <DatePicker value={selectedDate} onChange={setSelectedDate} />
            </Grid>
            <Grid item xs={12} md={6}>
              <LeagueSelector
                value={selectedLeagues}
                onChange={setSelectedLeagues}
                matches={allMatches}
              />
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

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Log Console */}
        <Box sx={{ mb: 3 }}>
          <LogConsole />
        </Box>

        {/* Matches Table */}
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
            onAnalyzeClick={handleAnalyzeClick}
          />
        </Paper>

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
                onClick={handleRunPredictions}
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

        {/* H2H Analysis Modal */}
        <H2HModal
          open={h2hModalOpen}
          onClose={handleCloseH2HModal}
          matchId={selectedMatch.matchId}
          flashscoreId={selectedMatch.flashscoreId}
          homeTeam={selectedMatch.homeTeam}
          awayTeam={selectedMatch.awayTeam}
        />
      </Container>
    </Box>
  );
}

export default App;
