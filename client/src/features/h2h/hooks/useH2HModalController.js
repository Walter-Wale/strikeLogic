import { useState } from "react";
import { fetchMatchById } from "../../../services/apiService";

const EMPTY_SELECTED_MATCH = {
  matchId: null,
  flashscoreId: null,
  homeTeam: "",
  awayTeam: "",
};

/**
 * Owns H2H modal state and resolves enough match data to open the modal.
 * @param {Array} allMatches
 * @param {Function} setError
 */
function useH2HModalController(allMatches, setError) {
  const [h2hModalOpen, setH2hModalOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(EMPTY_SELECTED_MATCH);

  const handleAnalyzeClick = async (
    matchId,
    flashscoreId,
    homeTeam,
    awayTeam,
  ) => {
    try {
      let resolvedMatch = {
        matchId,
        flashscoreId,
        homeTeam,
        awayTeam,
      };

      if (!resolvedMatch.flashscoreId && resolvedMatch.matchId) {
        const existingMatch = allMatches.find((match) => match.id === matchId);

        if (existingMatch?.flashscoreId) {
          resolvedMatch = {
            matchId: existingMatch.id,
            flashscoreId: existingMatch.flashscoreId,
            homeTeam: existingMatch.homeTeam,
            awayTeam: existingMatch.awayTeam,
          };
        } else {
          const response = await fetchMatchById(resolvedMatch.matchId);
          const fetchedMatch = response?.data;

          if (fetchedMatch?.flashscoreId) {
            resolvedMatch = {
              matchId: fetchedMatch.id,
              flashscoreId: fetchedMatch.flashscoreId,
              homeTeam: fetchedMatch.homeTeam,
              awayTeam: fetchedMatch.awayTeam,
            };
          }
        }
      }

      if (!resolvedMatch.matchId || !resolvedMatch.flashscoreId) {
        setError("Unable to open H2H details for this match.");
        return;
      }

      setSelectedMatch(resolvedMatch);
      setH2hModalOpen(true);
    } catch (error) {
      console.error("Error opening H2H modal:", error);
      setError(error.message || "Unable to open H2H details for this match.");
    }
  };

  const handleCloseH2HModal = () => {
    setH2hModalOpen(false);
    // Clear selected match after the close animation completes.
    setTimeout(() => {
      setSelectedMatch(EMPTY_SELECTED_MATCH);
    }, 300);
  };

  return {
    h2hModalOpen,
    selectedMatch,
    handleAnalyzeClick,
    handleCloseH2HModal,
  };
}

export default useH2HModalController;
