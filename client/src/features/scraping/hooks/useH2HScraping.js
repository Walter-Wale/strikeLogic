import { useCallback } from "react";
import { scrapeH2HByLeagues } from "../../../services/apiService";
import { formatDate } from "../../../utils/dateUtils";

/**
 * Returns a manual callback to start H2H scraping for the selected leagues.
 * H2H scraping is NOT triggered automatically — the user must click the button.
 * @param {import('dayjs').Dayjs} selectedDate
 * @param {string[]} selectedLeagues
 * @param {"feed"|"puppeteer"|"auto"} scrapeMode
 * @returns {{ handleStartH2H: () => void }}
 */
function useH2HScraping(selectedDate, selectedLeagues, scrapeMode = "auto") {
  const handleStartH2H = useCallback(() => {
    if (selectedLeagues.length === 0 || !selectedDate) return;

    const formattedDate = formatDate(selectedDate);

    scrapeH2HByLeagues(formattedDate, selectedLeagues, scrapeMode)
      .then((response) => {
        console.log(
          `H2H scraping started for ${response.matchCount} matches in ${response.leagues.join(", ")}`,
        );
      })
      .catch((err) => {
        console.error("Failed to start H2H scraping:", err);
      });
  }, [selectedDate, selectedLeagues, scrapeMode]);

  return { handleStartH2H };
}

export default useH2HScraping;
