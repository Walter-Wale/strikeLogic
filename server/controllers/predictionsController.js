/**
 * Predictions Controller
 * Runs the two-gate prediction algorithm on synced match H2H data.
 *
 * Gate 1 — Recent Form (HOME_FORM):
 *   Home team must have >= 4 wins AND <= 3 losses in their last recorded form games.
 *
 * Gate 2 — Head-to-Head (DIRECT_H2H):
 *   Home team must have <= 3 total H2H losses AND >= 2 wins when playing at home.
 *
 * Only predicts home-team wins.
 */

const DatabaseService = require("../services/DatabaseService");

const databaseService = new DatabaseService();

/**
 * Returns true if `teamName` won in the given H2H record.
 * Skips records with null scores.
 */
function teamWon(record, teamName) {
  if (record.homeScore === null || record.awayScore === null) return false;
  if (record.homeTeam === teamName) return record.homeScore > record.awayScore;
  if (record.awayTeam === teamName) return record.awayScore > record.homeScore;
  return false;
}

/**
 * Returns true if `teamName` lost in the given H2H record.
 * Skips records with null scores.
 */
function teamLost(record, teamName) {
  if (record.homeScore === null || record.awayScore === null) return false;
  if (record.homeTeam === teamName) return record.homeScore < record.awayScore;
  if (record.awayTeam === teamName) return record.awayScore < record.homeScore;
  return false;
}

/**
 * GET /predictions
 * Query params:
 *   - date (required) — YYYY-MM-DD
 *   - leagues[] (optional) — array of league name strings
 *
 * Returns { success: true, data: [ predictionObject, ... ] }
 */
async function getPredictions(req, res) {
  try {
    const { date } = req.query;

    if (!date) {
      return res
        .status(400)
        .json({ success: false, error: "date query parameter is required" });
    }

    // Normalise leagues — Express parses repeated keys as arrays automatically,
    // but handle both ?leagues[]=X and ?leagues=X for safety.
    let leagues = req.query.leagues || req.query["leagues[]"] || [];
    if (typeof leagues === "string") leagues = [leagues];

    // Fetch all matches for the date from the DB
    const allMatches = await databaseService.getMatchesByDate(date);

    // Keep only matches that are synced (H2H scraped) and in the selected leagues
    const syncedMatches = allMatches.filter((m) => {
      if (!m.isSynced) return false;
      if (leagues.length === 0) return true;
      return leagues.includes(m.leagueName);
    });

    const predictions = [];

    for (const match of syncedMatches) {
      const h2hData = await databaseService.getH2HData(match.id);
      const { HOME_FORM = [], DIRECT_H2H = [] } = h2hData;

      const homeTeam = match.homeTeam;

      // --- Gate 1: Recent Form ---
      // Use HOME_FORM records with valid scores
      const formRecords = HOME_FORM.filter(
        (r) => r.homeScore !== null && r.awayScore !== null,
      );
      const formWins = formRecords.filter((r) => teamWon(r, homeTeam)).length;
      const formLosses = formRecords.filter((r) =>
        teamLost(r, homeTeam),
      ).length;

      // Must have >= 4 wins and <= 3 losses to proceed
      if (formWins < 4 || formLosses > 3) continue;

      // --- Gate 2: Head-to-Head record ---
      const h2hRecords = DIRECT_H2H.filter(
        (r) => r.homeScore !== null && r.awayScore !== null,
      );
      const h2hTotalLosses = h2hRecords.filter((r) =>
        teamLost(r, homeTeam),
      ).length;

      // Wins specifically when the home team was the HOME side in the H2H fixture
      const h2hHomeWins = h2hRecords.filter(
        (r) => r.homeTeam === homeTeam && r.homeScore > r.awayScore,
      ).length;

      // Must have <= 3 total H2H losses and >= 2 home wins
      if (h2hTotalLosses > 3 || h2hHomeWins < 2) continue;

      predictions.push({
        matchId: match.id,
        matchDate: match.matchDate,
        matchTime: match.matchTime,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        leagueName: match.leagueName,
        predictedWinner: homeTeam,
        oddsHome: match.oddsHome ?? null,
        oddsDraw: match.oddsDraw ?? null,
        oddsAway: match.oddsAway ?? null,
      });
    }

    return res.json({ success: true, data: predictions });
  } catch (error) {
    console.error("Error generating predictions:", error);
    return res
      .status(500)
      .json({ success: false, error: "Failed to generate predictions" });
  }
}

module.exports = { getPredictions };
