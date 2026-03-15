import { useEffect } from "react";
import { scrapeH2HByLeagues } from "../../../services/apiService";
import { formatDate } from "../../../utils/dateUtils";

/**
 * Automatically triggers H2H scraping when leagues + matches are ready.
 * @param {import('dayjs').Dayjs} selectedDate
 * @param {string[]} selectedLeagues
 * @param {number} matchesLength
 * @param {boolean} loading
 */
function useH2HScraping(selectedDate, selectedLeagues, matchesLength, loading) {
  // AUTOMATED WORKFLOW: Trigger H2H scraping when leagues are selected
  useEffect(() => {
    // Only trigger if we have matches loaded and leagues selected
    if (
      selectedLeagues.length > 0 &&
      matchesLength > 0 &&
      !loading &&
      selectedDate
    ) {
      const timer = setTimeout(() => {
        const formattedDate = formatDate(selectedDate);

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
  }, [selectedLeagues, matchesLength, loading, selectedDate]);
}

export default useH2HScraping;
