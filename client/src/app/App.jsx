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
import MatchSection from "../features/matches/components/MatchSection";

import useH2HSocket from "../features/h2h/hooks/useH2HSocket";
import useH2HModalController from "../features/h2h/hooks/useH2HModalController";
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
  const [matchView, setMatchView] = useState("all");

  // Matches
  const {
    allMatches,
    setAllMatches,
    loading,
    error,
    setError,
  } = useMatches(selectedDate);

  // Predictions (needs matches for allMatchesSynced check)
  const {
    predictions,
    predictionsLoading,
    predictionMode,
    setPredictionMode,
    goalMode,
    setGoalMode,
    predictionScope,
    setPredictionScope,
    favoriteCountries,
    setFavoriteCountries,
    additionalLeagues,
    setAdditionalLeagues,
    availableCountries,
    additionalLeagueOptions,
    favoriteCountryLeagues,
    predictionPreviewLeagues,
    predictionTargetMatches,
    syncedMatchCount,
    canRunPredictions,
    scoreThreshold,
    setScoreThreshold,
    over15Threshold,
    setOver15Threshold,
    over25Threshold,
    setOver25Threshold,
    setChainCompleteDetected,
    handleRunPredictions,
  } = usePredictions(selectedDate, allMatches);

  const {
    h2hModalOpen,
    selectedMatch,
    handleAnalyzeClick,
    handleCloseH2HModal,
  } = useH2HModalController(allMatches, setError);

  // Socket: real-time H2H sync + chain-complete detection
  useH2HSocket(setAllMatches, setChainCompleteDetected);

  // Scraping: manual trigger via "Start H2H Analysis" button
  const { handleStartH2H } = useH2HScraping(
    selectedDate,
    selectedLeagues,
    scrapeMode,
  );

  const handleStartH2HWithTabSwitch = React.useCallback(() => {
    setMatchView("synced");
    handleStartH2H();
  }, [handleStartH2H]);

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
        onStartH2H={handleStartH2HWithTabSwitch}
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
        matches={allMatches}
        loading={loading}
        onAnalyzeClick={handleAnalyzeClick}
        activeTab={matchView}
        onTabChange={setMatchView}
      />

      <PredictionSection
        canRunPredictions={canRunPredictions}
        syncedMatchCount={syncedMatchCount}
        predictionScope={predictionScope}
        onPredictionScopeChange={setPredictionScope}
        favoriteCountries={favoriteCountries}
        onFavoriteCountriesChange={setFavoriteCountries}
        availableCountries={availableCountries}
        additionalLeagues={additionalLeagues}
        onAdditionalLeaguesChange={setAdditionalLeagues}
        additionalLeagueOptions={additionalLeagueOptions}
        favoriteCountryLeagueCount={favoriteCountryLeagues.length}
        predictionPreviewLeagues={predictionPreviewLeagues}
        predictionTargetMatchCount={predictionTargetMatches.length}
        predictionsLoading={predictionsLoading}
        onRunPredictions={handleRunPredictions}
        onAnalyzeClick={handleAnalyzeClick}
        predictions={predictions}
        predictionMode={predictionMode}
        onPredictionModeChange={setPredictionMode}
        goalMode={goalMode}
        onGoalModeChange={setGoalMode}
        scoreThreshold={scoreThreshold}
        onScoreThresholdChange={setScoreThreshold}
        over15Threshold={over15Threshold}
        onOver15ThresholdChange={setOver15Threshold}
        over25Threshold={over25Threshold}
        onOver25ThresholdChange={setOver25Threshold}
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
