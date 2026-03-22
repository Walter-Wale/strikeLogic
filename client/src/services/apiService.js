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
 * Fetch only synced (H2H-ready) matches for a date — no scraping triggered.
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {Promise<Object>} Response with synced matches array
 */
export async function fetchSyncedMatches(date) {
  try {
    const response = await apiClient.get("/matches/synced", {
      params: { date },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching synced matches:", error);
    const errorMessage =
      error.response?.data?.error || "Failed to fetch synced matches.";
    throw new Error(errorMessage);
  }
}

/**
 * Trigger H2H scraping for specific leagues
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {Array<string>} leagues - Array of league names
 * @returns {Promise<Object>} Response with scraping status
 */
export async function scrapeH2HByLeagues(date, leagues, mode = "auto") {
  try {
    const response = await apiClient.post("/matches/scrape-h2h", {
      date,
      leagues,
      mode,
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

/**
 * Fetch predictions for synced matches on a given date and league set
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {Array<string>} leagues - Array of league names to filter by
 * @param {{
 *   mode?: "gate" | "score",
 *   goalMode?: "light" | "strict",
 *   threshold?: number,
 *   over15Threshold?: number,
 *   over25Threshold?: number,
 *   bttsThreshold?: number
 * }} options
 * @returns {Promise<Object>} Response with predictions array
 */
export async function fetchPredictions(date, leagues = [], options = {}) {
  try {
    const params = {
      date,
      mode: options.mode || "gate",
      goalMode: options.goalMode === "strict" ? "strict" : "light",
    };

    if (leagues && leagues.length > 0) {
      params.leagues = leagues;
    }

    if (params.mode === "score") {
      const parsedThreshold = Number(options.threshold);
      params.threshold = Number.isFinite(parsedThreshold)
        ? parsedThreshold
        : 10;
    }

    const parsedOver15Threshold = Number(options.over15Threshold);
    params.over15Threshold = Number.isFinite(parsedOver15Threshold)
      ? parsedOver15Threshold
      : 7;

    const parsedOver25Threshold = Number(options.over25Threshold);
    params.over25Threshold = Number.isFinite(parsedOver25Threshold)
      ? parsedOver25Threshold
      : 11;

    const parsedBttsThreshold = Number(options.bttsThreshold);
    params.bttsThreshold = Number.isFinite(parsedBttsThreshold)
      ? parsedBttsThreshold
      : 7;

    const response = await apiClient.get("/predictions", { params });
    return response.data;
  } catch (error) {
    console.error("Error fetching predictions:", error);

    const errorMessage =
      error.response?.data?.error ||
      error.response?.data?.message ||
      "Failed to fetch predictions.";

    throw new Error(errorMessage);
  }
}

/**
 * Save a set of generated tickets to the database.
 * @param {string} matchDate - YYYY-MM-DD date the predictions were for
 * @param {number} teamsPerTicket - Number of matches per ticket
 * @param {Array<Array>} tickets - Array of ticket arrays (each containing prediction objects)
 */
export async function saveTickets(matchDate, teamsPerTicket, tickets) {
  try {
    const response = await apiClient.post("/tickets", {
      matchDate,
      teamsPerTicket,
      tickets,
    });
    return response.data;
  } catch (error) {
    console.error("Error saving tickets:", error);
    const errorMessage =
      error.response?.data?.error || "Failed to save tickets.";
    throw new Error(errorMessage);
  }
}

/**
 * Fetch distinct played match identities for a given date.
 * @param {string} date - YYYY-MM-DD
 */
export async function fetchPlayedMatches(date) {
  try {
    const response = await apiClient.get("/tickets/played-matches", {
      params: { date },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching played matches:", error);
    throw new Error(
      error.response?.data?.error || "Failed to fetch played matches.",
    );
  }
}

/**
 * Fetch all saved ticket batches (no items, newest first).
 */
export async function fetchTicketBatches() {
  try {
    const response = await apiClient.get("/tickets");
    return response.data;
  } catch (error) {
    console.error("Error fetching ticket batches:", error);
    throw new Error(
      error.response?.data?.error || "Failed to fetch ticket batches.",
    );
  }
}

/**
 * Fetch a single saved batch with all tickets reconstructed.
 * @param {number} batchId
 */
export async function fetchTicketBatch(batchId) {
  try {
    const response = await apiClient.get(`/tickets/${batchId}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching ticket batch:", error);
    throw new Error(
      error.response?.data?.error || "Failed to fetch ticket batch.",
    );
  }
}

/**
 * Delete a saved ticket batch.
 * @param {number} batchId
 */
export async function deleteTicketBatch(batchId) {
  try {
    const response = await apiClient.delete(`/tickets/${batchId}`);
    return response.data;
  } catch (error) {
    console.error("Error deleting ticket batch:", error);
    throw new Error(
      error.response?.data?.error || "Failed to delete ticket batch.",
    );
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
