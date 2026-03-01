/**
 * H2HModal Component
 * Displays Head-to-Head and form data analysis in tabbed sections
 */

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Tabs,
  Tab,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { fetchH2HData } from "../services/apiService";
import dayjs from "dayjs";

// TabPanel component for rendering tab content
function TabPanel({ children, value, index }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`h2h-tabpanel-${index}`}
      aria-labelledby={`h2h-tab-${index}`}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const H2HModal = ({
  open,
  onClose,
  matchId,
  flashscoreId,
  homeTeam,
  awayTeam,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [h2hData, setH2hData] = useState(null);
  const [activeTab, setActiveTab] = useState(0);

  // Fetch H2H data when modal opens
  useEffect(() => {
    if (open && matchId && flashscoreId) {
      fetchData();
    }
  }, [open, matchId, flashscoreId]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetchH2HData(matchId, flashscoreId);
      setH2hData(response.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Helper function to determine result color
  const getResultColor = (homeScore, awayScore, teamContext) => {
    if (homeScore === null || awayScore === null) return "default";

    if (teamContext === "home") {
      if (homeScore > awayScore) return "success";
      if (homeScore < awayScore) return "error";
      return "warning";
    } else if (teamContext === "away") {
      if (awayScore > homeScore) return "success";
      if (awayScore < homeScore) return "error";
      return "warning";
    }

    return "default";
  };

  // Render match table for a specific section
  const renderMatchTable = (matches, sectionType) => {
    if (!matches || matches.length === 0) {
      return (
        <Alert severity="info">
          No{" "}
          {sectionType === "DIRECT_H2H"
            ? "head-to-head history"
            : "recent matches"}{" "}
          found.
        </Alert>
      );
    }

    return (
      <TableContainer component={Paper} variant="outlined">
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: "primary.main" }}>
              <TableCell
                sx={{ color: "primary.contrastText", fontWeight: "bold" }}
              >
                Date
              </TableCell>
              <TableCell
                sx={{ color: "primary.contrastText", fontWeight: "bold" }}
              >
                Home Team
              </TableCell>
              <TableCell
                sx={{
                  color: "primary.contrastText",
                  fontWeight: "bold",
                  textAlign: "center",
                }}
              >
                Score
              </TableCell>
              <TableCell
                sx={{ color: "primary.contrastText", fontWeight: "bold" }}
              >
                Away Team
              </TableCell>
              <TableCell
                sx={{ color: "primary.contrastText", fontWeight: "bold" }}
              >
                Competition
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {matches.map((match, index) => {
              const score =
                match.homeScore !== null && match.awayScore !== null
                  ? `${match.homeScore} - ${match.awayScore}`
                  : "-";

              let teamContext = "neutral";
              if (sectionType === "HOME_FORM" && match.homeTeam === homeTeam)
                teamContext = "home";
              if (sectionType === "AWAY_FORM" && match.awayTeam === awayTeam)
                teamContext = "away";

              const resultColor = getResultColor(
                match.homeScore,
                match.awayScore,
                teamContext,
              );

              return (
                <TableRow key={index} hover>
                  <TableCell>
                    {match.matchDate
                      ? dayjs(match.matchDate).format("DD/MM/YYYY")
                      : "-"}
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight:
                        match.homeTeam === homeTeam ? "bold" : "normal",
                    }}
                  >
                    {match.homeTeam}
                  </TableCell>
                  <TableCell sx={{ textAlign: "center" }}>
                    <Chip
                      label={score}
                      color={resultColor}
                      size="small"
                      sx={{ minWidth: "60px", fontWeight: "bold" }}
                    />
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight:
                        match.awayTeam === awayTeam ? "bold" : "normal",
                    }}
                  >
                    {match.awayTeam}
                  </TableCell>
                  <TableCell sx={{ color: "text.secondary" }}>
                    {match.competition || "Unknown"}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      scroll="paper"
    >
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography variant="h5" component="div">
          Match Analysis: <strong>{homeTeam}</strong> vs{" "}
          <strong>{awayTeam}</strong>
        </Typography>
        <IconButton
          edge="end"
          color="inherit"
          onClick={onClose}
          aria-label="close"
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {loading && (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              minHeight: 300,
            }}
          >
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {!loading && !error && h2hData && (
          <>
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              variant="fullWidth"
              sx={{ borderBottom: 1, borderColor: "divider" }}
            >
              <Tab label={`${homeTeam} Recent Form`} />
              <Tab label={`${awayTeam} Recent Form`} />
              <Tab label="Historical Head-to-Head" />
            </Tabs>

            <TabPanel value={activeTab} index={0}>
              <Typography variant="h6" gutterBottom>
                Last 5 Matches - {homeTeam}
              </Typography>
              {renderMatchTable(h2hData.HOME_FORM, "HOME_FORM")}
            </TabPanel>

            <TabPanel value={activeTab} index={1}>
              <Typography variant="h6" gutterBottom>
                Last 5 Matches - {awayTeam}
              </Typography>
              {renderMatchTable(h2hData.AWAY_FORM, "AWAY_FORM")}
            </TabPanel>

            <TabPanel value={activeTab} index={2}>
              <Typography variant="h6" gutterBottom>
                Head-to-Head History (Last 5 Encounters)
              </Typography>
              {renderMatchTable(h2hData.DIRECT_H2H, "DIRECT_H2H")}
            </TabPanel>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default H2HModal;
