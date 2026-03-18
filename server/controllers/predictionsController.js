/**
 * Predictions Controller
 * Runs the hybrid prediction algorithm on synced match H2H data.
 *
 * Gate mode (default):
 *   HOME_FORM requires >= 4 wins and <= 4 losses.
 *   DIRECT_H2H requires <= 3 total losses and >= 2 home wins.
 *
 * Score mode:
 *   Uses the same stats but converts them into a weighted score.
 *
 * Only predicts home-team wins.
 */

const DatabaseService = require("../services/DatabaseService");

const databaseService = new DatabaseService();

function passesGateSystem({
  formWins,
  formLosses,
  h2hHomeWins,
  h2hTotalLosses,
}) {
  if (formWins < 4 || formLosses > 4) return false;
  if (h2hTotalLosses > 3 || h2hHomeWins < 2) return false;
  return true;
}

function calculateScore({
  formWins,
  formLosses,
  h2hHomeWins,
  h2hTotalLosses,
}) {
  let score = 0;

  // FORM
  if (formWins >= 4) {
    score += 6 + (formWins - 4) * 1.5;
  } else {
    score -= (4 - formWins) * 3;
  }

  if (formLosses > 4) {
    score -= (formLosses - 4) * 3;
  }

  // H2H
  if (h2hHomeWins >= 2) {
    score += 5 + (h2hHomeWins - 2) * 1.5;
  } else {
    score -= (2 - h2hHomeWins) * 4;
  }

  if (h2hTotalLosses > 3) {
    score -= (h2hTotalLosses - 3) * 3;
  }

  return score;
}

function getScoreConfidence(score) {
  if (score >= 15) return "HIGH";
  if (score >= 10) return "MEDIUM";
  return "LOW";
}

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
 *   - date (required) - YYYY-MM-DD
 *   - leagues[] (optional) - array of league name strings
 *   - mode (optional) - "gate" or "score"
 *   - threshold (optional) - minimum score to include a prediction
 *
 * Returns { success: true, data: [ predictionObject, ... ] }
 */
async function getPredictions(req, res) {
  try {
    const { date } = req.query;
    const mode = req.query.mode === "score" ? "score" : "gate";
    const parsedThreshold = Number(req.query.threshold);
    const threshold = Number.isFinite(parsedThreshold) ? parsedThreshold : 10;

    if (!date) {
      return res
        .status(400)
        .json({ success: false, error: "date query parameter is required" });
    }

    // Normalise leagues - Express parses repeated keys as arrays automatically,
    // but handle both ?leagues[]=X and ?leagues=X for safety.
    let leagues = req.query.leagues || req.query["leagues[]"] || [];
    if (typeof leagues === "string") leagues = [leagues];
    // Axios v1.x serialises arrays as leagues[0]=X&leagues[1]=Y which Express
    // parses as a plain object {0:'X',1:'Y'} rather than an array.
    if (!Array.isArray(leagues) && typeof leagues === "object") {
      leagues = Object.values(leagues);
    }

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

      const formRecords = HOME_FORM.filter(
        (r) => r.homeScore !== null && r.awayScore !== null,
      );
      const formWins = formRecords.filter((r) => teamWon(r, homeTeam)).length;
      const formLosses = formRecords.filter((r) =>
        teamLost(r, homeTeam),
      ).length;

      const h2hRecords = DIRECT_H2H.filter(
        (r) => r.homeScore !== null && r.awayScore !== null,
      );
      const h2hTotalLosses = h2hRecords.filter((r) =>
        teamLost(r, homeTeam),
      ).length;
      const h2hHomeWins = h2hRecords.filter(
        (r) => r.homeTeam === homeTeam && r.homeScore > r.awayScore,
      ).length;

      let score = null;
      let confidence = null;

      if (mode === "gate") {
        const passes = passesGateSystem({
          formWins,
          formLosses,
          h2hHomeWins,
          h2hTotalLosses,
        });

        if (!passes) continue;
      } else if (mode === "score") {
        score = calculateScore({
          formWins,
          formLosses,
          h2hHomeWins,
          h2hTotalLosses,
        });

        if (score < threshold) continue;
        confidence = getScoreConfidence(score);
      }

      predictions.push({
        matchId: match.id,
        flashscoreId: match.flashscoreId,
        matchDate: match.matchDate,
        matchTime: match.matchTime,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        leagueName: match.leagueName,
        predictedWinner: homeTeam,
        oddsHome: match.oddsHome ?? null,
        oddsDraw: match.oddsDraw ?? null,
        oddsAway: match.oddsAway ?? null,
        mode,
        score: score !== null ? Number(score.toFixed(2)) : null,
        confidence,
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
