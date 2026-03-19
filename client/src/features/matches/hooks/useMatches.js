import { useState, useEffect } from "react";
import { fetchMatchesByDate } from "../../../services/apiService";
import { formatDate } from "../../../utils/dateUtils";

/**
 * Manages all-matches state, loading, and fetch handlers.
 * @param {import('dayjs').Dayjs} selectedDate
 * @returns {{ allMatches, setAllMatches, loading, error, setError, handleFetchMatches }}
 */
function useMatches(selectedDate) {
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

  return {
    allMatches,
    setAllMatches,
    loading,
    error,
    setError,
    handleFetchMatches,
  };
}

export default useMatches;
