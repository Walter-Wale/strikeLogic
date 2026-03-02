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
} from "@mui/material";
import SportsSoccerIcon from "@mui/icons-material/SportsSoccer";
import dayjs from "dayjs";

// Import components
import DatePicker from "./components/DatePicker";
import LeagueSelector from "./components/LeagueSelector";
import MatchTable from "./components/MatchTable";
import LogConsole from "./components/LogConsole";
import H2HModal from "./components/H2HModal";

// Import services
import { fetchMatchesByDate, scrapeH2HByLeagues } from "./services/apiService";
import {
  initializeSocket,
  disconnect,
  subscribeToH2HSynced,
} from "./services/socketService";

function App() {
  // State management
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [selectedLeagues, setSelectedLeagues] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // H2H Modal state
  const [h2hModalOpen, setH2hModalOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState({
    matchId: null,
    flashscoreId: null,
    homeTeam: "",
    awayTeam: "",
  });

  // Initialize socket connection on mount
  useEffect(() => {
    initializeSocket();

    // Real-time H2H sync: mark individual matches as synced when server notifies us
    const unsubscribeH2H = subscribeToH2HSynced(({ matchId }) => {
      setMatches((prev) =>
        prev.map((m) =>
          m.id === matchId ? { ...m, h2hScraped: true, isSynced: true } : m,
        ),
      );
    });

    return () => {
      unsubscribeH2H();
      disconnect();
    };
  }, []);

  // AUTOMATED WORKFLOW: Automatically fetch matches when date or leagues change
  useEffect(() => {
    // Auto-trigger fetching when date or leagues change
    // Small delay to debounce rapid changes
    const timer = setTimeout(() => {
      if (selectedDate) {
        handleFetchMatches();
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [selectedDate, selectedLeagues]); // Triggers on date or league change

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

  // Handler: Fetch matches
  const handleFetchMatches = async () => {
    setLoading(true);
    setError(null);
    setMatches([]);

    try {
      // Format date to YYYY-MM-DD
      const formattedDate = selectedDate.format("YYYY-MM-DD");

      // Fetch matches from API
      const response = await fetchMatchesByDate(formattedDate, selectedLeagues);

      if (response.success) {
        setMatches(response.data || []);
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
                matches={matches}
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
