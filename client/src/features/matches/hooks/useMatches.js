import { useState, useEffect } from "react";
import {
  fetchMatchesByDate,
  fetchSyncedMatches,
} from "../../../services/apiService";
import { formatDate } from "../../../utils/dateUtils";

/**
 * Manages all-matches state, loading, and fetch handlers.
 * @param {import('dayjs').Dayjs} selectedDate
 * @param {Function} onChainComplete - called when ready matches confirm H2H is done
 * @returns {{ allMatches, setAllMatches, loading, error, setError, handleFetchMatches, handleLoadReadyMatches }}
 */
function useMatches(selectedDate, onChainComplete) {
  const [allMatches, setAllMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // AUTOMATED WORKFLOW: Fetch all matches when date changes (no league filter — filtering is client-side)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (selectedDate) {
        handleFetchMatches();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [selectedDate]); // Only re-fetch from server when date changes

  // Handler: Fetch all matches for the date (no league filter — filtering is applied client-side)
  const handleFetchMatches = async () => {
    setLoading(true);
    setError(null);
    setAllMatches([]);

    try {
      // Format date to YYYY-MM-DD
      const formattedDate = formatDate(selectedDate);

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

  // Handler: Load only already-synced (H2H complete) matches from DB — no scraping
  const handleLoadReadyMatches = async () => {
    setLoading(true);
    setError(null);
    setAllMatches([]);
    try {
      const formattedDate = formatDate(selectedDate);
      const response = await fetchSyncedMatches(formattedDate);
      if (response.success) {
        setAllMatches(response.data || []);
        if ((response.count || 0) > 0) {
          onChainComplete();
        }
      } else {
        setError(response.error || "Failed to load ready matches");
      }
    } catch (err) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return {
    allMatches,
    setAllMatches,
    loading,
    error,
    setError,
    handleFetchMatches,
    handleLoadReadyMatches,
  };
}

export default useMatches;
