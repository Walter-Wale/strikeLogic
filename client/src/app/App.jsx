/**
 * Main App Component
 * StrikeLogic - Football Data Analysis Application
 */

import React, { useState } from "react";
import { Alert } from "@mui/material";
import dayjs from "dayjs";

// Layout
import PageContainer from "../components/layout/PageContainer";
import Header from "../components/layout/Header";

// Common
import LogConsole from "../components/common/LogConsole";

// Features
import useMatches from "../features/matches/hooks/useMatches";
import useFilteredMatches from "../features/matches/hooks/useFilteredMatches";
import MatchSection from "../features/matches/components/MatchSection";

import useH2HSocket from "../features/h2h/hooks/useH2HSocket";
import H2HModal from "../features/h2h/components/H2HModal";

import useH2HScraping from "../features/scraping/hooks/useH2HScraping";
import ScrapingControls from "../features/scraping/components/ScrapingControls";

import usePredictions from "../features/predictions/hooks/usePredictions";
import PredictionSection from "../features/predictions/components/PredictionSection";

function App() {
  // UI state managed at the top level
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [selectedLeagues, setSelectedLeagues] = useState([]);
  const [scrapeMode, setScrapeMode] = useState("auto");

  // H2H Modal state
  const [h2hModalOpen, setH2hModalOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState({
    matchId: null,
    flashscoreId: null,
    homeTeam: "",
    awayTeam: "",
  });

  // Matches
  const {
    allMatches,
    setAllMatches,
    loading,
    error,
    setError,
    handleLoadReadyMatches,
  } = useMatches(selectedDate, () => setChainCompleteDetected(true));

  const { matches } = useFilteredMatches(allMatches, selectedLeagues);

  // Predictions (needs matches for allMatchesSynced check)
  const {
    predictions,
    predictionsLoading,
    predictionMode,
    setPredictionMode,
    scoreThreshold,
    setScoreThreshold,
    setChainCompleteDetected,
    h2hChainComplete,
    handleRunPredictions,
  } = usePredictions(selectedDate, selectedLeagues, matches);

  // Socket: real-time H2H sync + chain-complete detection
  useH2HSocket(setAllMatches, setChainCompleteDetected);

  // Scraping: manual trigger via "Start H2H Analysis" button
  const { handleStartH2H } = useH2HScraping(
    selectedDate,
    selectedLeagues,
    scrapeMode,
  );

  // Handler: Analyze match (open H2H modal)
  const handleAnalyzeClick = (matchId, flashscoreId, homeTeam, awayTeam) => {
    setSelectedMatch({ matchId, flashscoreId, homeTeam, awayTeam });
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
    <PageContainer>
      <Header />

      <ScrapingControls
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        selectedLeagues={selectedLeagues}
        onLeaguesChange={setSelectedLeagues}
        allMatches={allMatches}
        loading={loading}
        onLoadReady={handleLoadReadyMatches}
        onStartH2H={handleStartH2H}
        scrapeMode={scrapeMode}
        onScrapeModeChange={setScrapeMode}
      />

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Log Console */}
      <LogConsole />

      <MatchSection
        matches={matches}
        loading={loading}
        onAnalyzeClick={handleAnalyzeClick}
      />

      <PredictionSection
        h2hChainComplete={h2hChainComplete}
        predictionsLoading={predictionsLoading}
        onRunPredictions={handleRunPredictions}
        predictions={predictions}
        predictionMode={predictionMode}
        onPredictionModeChange={setPredictionMode}
        scoreThreshold={scoreThreshold}
        onScoreThresholdChange={setScoreThreshold}
        selectedDate={selectedDate}
      />

      <H2HModal
        open={h2hModalOpen}
        onClose={handleCloseH2HModal}
        matchId={selectedMatch.matchId}
        flashscoreId={selectedMatch.flashscoreId}
        homeTeam={selectedMatch.homeTeam}
        awayTeam={selectedMatch.awayTeam}
      />
    </PageContainer>
  );
}

export default App;
