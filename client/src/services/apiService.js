/**
 * API Service
 * Handles all HTTP requests to the server API
 */

import axios from "axios";

// Create axios instance with default configuration
const apiClient = axios.create({
  baseURL: "http://localhost:5000",
  timeout: 60000, // 60 seconds (scraping can take time)
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Fetch matches for a specific date with optional league filtering
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {Array<string>} leagues - Optional array of league names
 * @returns {Promise<Object>} Response with matches array
 */
export async function fetchMatchesByDate(date, leagues = []) {
  try {
    const params = { date };

    // Add leagues as array parameter if provided
    if (leagues && leagues.length > 0) {
      params.leagues = leagues;
    }

    const response = await apiClient.get("/matches", { params });
    return response.data;
  } catch (error) {
    console.error("Error fetching matches:", error);

    const errorMessage =
      error.response?.data?.error ||
      error.response?.data?.message ||
      "Failed to fetch matches. Please try again.";

    throw new Error(errorMessage);
  }
}

/**
 * Fetch a single match by ID
 * @param {number} matchId - Match ID
 * @returns {Promise<Object>} Response with match data
 */
export async function fetchMatchById(matchId) {
  try {
    const response = await apiClient.get(`/matches/${matchId}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching match:", error);

    const errorMessage =
      error.response?.data?.error ||
      error.response?.data?.message ||
      "Failed to fetch match details.";

    throw new Error(errorMessage);
  }
}

/**
 * Fetch H2H and form data for a specific match
 * Returns data grouped by section: HOME_FORM, AWAY_FORM, DIRECT_H2H
 * @param {number} matchId - Match ID
 * @param {string} flashscoreId - FlashScore match identifier
 * @returns {Promise<Object>} Response with grouped H2H data
 */
export async function fetchH2HData(matchId, flashscoreId) {
  try {
    const response = await apiClient.get(`/h2h/${matchId}/${flashscoreId}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching H2H data:", error);

    const errorMessage =
      error.response?.data?.error ||
      error.response?.data?.message ||
      "Failed to fetch H2H data. Please try again.";

    throw new Error(errorMessage);
  }
}

/**
 * Trigger H2H scraping for specific leagues
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {Array<string>} leagues - Array of league names
 * @returns {Promise<Object>} Response with scraping status
 */
export async function scrapeH2HByLeagues(date, leagues) {
  try {
    const response = await apiClient.post("/matches/scrape-h2h", {
      date,
      leagues,
    });
    return response.data;
  } catch (error) {
    console.error("Error triggering H2H scraping:", error);

    const errorMessage =
      error.response?.data?.error ||
      error.response?.data?.message ||
      "Failed to start H2H scraping.";

    throw new Error(errorMessage);
  }
}

// Add request interceptor for logging (optional)
apiClient.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Add response interceptor for logging (optional)
apiClient.interceptors.response.use(
  (response) => {
    console.log(
      `API Response: ${response.config.url} - Status: ${response.status}`,
    );
    return response;
  },
  (error) => {
    console.error("API Error:", error.response?.status, error.message);
    return Promise.reject(error);
  },
);
