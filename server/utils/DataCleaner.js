/**
 * Data Cleaner Utility
 * Parses and cleans scraped data from FlashScore
 */

/**
 * Parses score text from various formats into home and away scores
 * Handles formats like:
 *   - "2 : 1", "2-1", "2 - 1" (traditional formats)
 *   - "2 1" (FlashScore's new format from separate spans)
 *   - "2 - 1 (ET)", "1:0 (Pen.)" (with extra time/penalties)
 *   - "- : -", "Postp." (postponed/cancelled)
 * @param {string} scoreText - Raw score text from FlashScore
 * @returns {Object} { homeScore: number|null, awayScore: number|null }
 */
function parseScore(scoreText) {
  if (!scoreText || typeof scoreText !== "string") {
    return { homeScore: null, awayScore: null };
  }

  // Trim whitespace
  const trimmed = scoreText.trim();

  // Handle postponed, cancelled, or no score cases
  if (
    trimmed === "" ||
    trimmed === "-" ||
    trimmed === "- : -" ||
    trimmed === "- -" ||
    trimmed.toLowerCase().includes("postp") ||
    trimmed.toLowerCase().includes("canc") ||
    trimmed.toLowerCase().includes("aband")
  ) {
    return { homeScore: null, awayScore: null };
  }

  // Extract numbers before any parenthetical content (ET, Pen., etc.)
  // Remove parenthetical content: (ET), (Pen.), (AET), etc.
  const withoutParentheses = trimmed.replace(/\([^)]*\)/g, "").trim();

  // Try to match score patterns:
  // - "2:1" or "2 : 1" (colon separated)
  // - "2-1" or "2 - 1" (dash separated)
  // - "2 1" (space separated, from FlashScore's new structure)
  const scoreRegex = /(\d+)\s*[:\-\s]\s*(\d+)/;
  const match = withoutParentheses.match(scoreRegex);

  if (match) {
    const homeScore = parseInt(match[1], 10);
    const awayScore = parseInt(match[2], 10);

    // Validate that scores are reasonable (0-20 range)
    if (
      !isNaN(homeScore) &&
      !isNaN(awayScore) &&
      homeScore >= 0 &&
      homeScore <= 20 &&
      awayScore >= 0 &&
      awayScore <= 20
    ) {
      return { homeScore, awayScore };
    }
  }

  // If no valid score found, return null
  return { homeScore: null, awayScore: null };
}

/**
 * Cleans team name by trimming whitespace and removing special characters
 * @param {string} teamName - Raw team name
 * @returns {string} Cleaned team name
 */
function cleanTeamName(teamName) {
  if (!teamName || typeof teamName !== "string") {
    return "";
  }

  return teamName
    .trim()
    .replace(/\s+/g, " ") // Replace multiple spaces with single space
    .replace(/[^\w\s\-.']/g, ""); // Keep only alphanumeric, spaces, hyphens, periods, apostrophes
}

/**
 * Parses date string from various formats to YYYY-MM-DD
 * Handles FlashScore's DD.MM.YY format (e.g., "23.02.26" = February 23, 2026)
 * @param {string} dateText - Raw date text from FlashScore
 * @returns {string|null} Date in YYYY-MM-DD format or null
 */
function parseDate(dateText) {
  if (!dateText || typeof dateText !== "string") {
    return null;
  }

  try {
    // Handle FlashScore's DD.MM.YY format (e.g., "23.02.26")
    const ddmmyyPattern = /^(\d{2})\.(\d{2})\.(\d{2})$/;
    const ddmmyyMatch = dateText.trim().match(ddmmyyPattern);

    if (ddmmyyMatch) {
      const day = parseInt(ddmmyyMatch[1], 10);
      const month = parseInt(ddmmyyMatch[2], 10);
      const yearShort = parseInt(ddmmyyMatch[3], 10);

      // Convert 2-digit year to 4-digit year
      // Assume years 00-49 are 2000-2049, and 50-99 are 1950-1999
      const year = yearShort < 50 ? 2000 + yearShort : 1900 + yearShort;

      // Validate date components
      if (
        month >= 1 &&
        month <= 12 &&
        day >= 1 &&
        day <= 31 &&
        year >= 1900 &&
        year <= 2100
      ) {
        const monthStr = String(month).padStart(2, "0");
        const dayStr = String(day).padStart(2, "0");
        return `${year}-${monthStr}-${dayStr}`;
      }
    }

    // Fallback: Try to parse as standard date format
    const date = new Date(dateText);
    if (isNaN(date.getTime())) {
      return null;
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  } catch (error) {
    console.error("Error parsing date:", dateText, error);
    return null;
  }
}

module.exports = {
  parseScore,
  cleanTeamName,
  parseDate,
};
