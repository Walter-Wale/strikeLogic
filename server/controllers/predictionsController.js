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

function calculateScore({ formWins, formLosses, h2hHomeWins, h2hTotalLosses }) {
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

function compareStrictGoalCandidates(a, b) {
  if (b.goalScore !== a.goalScore) {
    return b.goalScore - a.goalScore;
  }

  const timeA = a.matchTime || "";
  const timeB = b.matchTime || "";
  const timeCompare = timeA.localeCompare(timeB);
  if (timeCompare !== 0) {
    return timeCompare;
  }

  return (a.matchId || 0) - (b.matchId || 0);
}

function getAvgGoals(records) {
  const valid = records.filter(
    (record) => record.homeScore !== null && record.awayScore !== null,
  );

  if (valid.length === 0) return 0;

  const total = valid.reduce(
    (sum, record) => sum + record.homeScore + record.awayScore,
    0,
  );
  return total / valid.length;
}

function filterHomeMatches(records, team) {
  return records.filter((record) => record.homeTeam === team);
}

function filterAwayMatches(records, team) {
  return records.filter((record) => record.awayTeam === team);
}

function calculateGoalScore({ HOME_FORM, AWAY_FORM, DIRECT_H2H }) {
  let score = 0;

  const homeAvg = getAvgGoals(HOME_FORM);
  const awayAvg = getAvgGoals(AWAY_FORM);
  const h2hAvg = getAvgGoals(DIRECT_H2H);
  const combinedAvg = (homeAvg + awayAvg + h2hAvg) / 3;
  const validH2H = DIRECT_H2H.filter(
    (record) => record.homeScore !== null && record.awayScore !== null,
  );

  // --- BASELINE (very strict) ---
  if (combinedAvg >= 3.5) score += 8;
  else if (combinedAvg >= 3.0) score += 6;
  else if (combinedAvg >= 2.5) score += 3;
  else score -= 6;

  // --- CONSISTENCY (must repeat, not one-off) ---
  const highScoringMatches = validH2H.filter(
    (record) => record.homeScore + record.awayScore >= 3,
  ).length;

  if (highScoringMatches >= 4) score += 6;
  else if (highScoringMatches >= 3) score += 4;
  else if (highScoringMatches >= 2) score += 2;
  else score -= 4;

  // --- LOW SCORE PENALTY (very strong) ---
  const lowScoringMatches = validH2H.filter(
    (record) => record.homeScore + record.awayScore <= 1,
  ).length;

  if (lowScoringMatches >= 2) score -= 7;

  // --- ATTACK SIGNAL ---
  if (homeAvg >= 1.6) score += 3;
  if (awayAvg >= 1.3) score += 3;

  return score;
}

function calculateBTTSScore({ HOME_FORM, AWAY_FORM, DIRECT_H2H }) {
  const allMatches = [...HOME_FORM, ...AWAY_FORM, ...DIRECT_H2H].filter(
    (m) => m.homeScore !== null && m.awayScore !== null,
  );

  if (allMatches.length < 6) return -5;

  let score = 0;

  // SCORING FREQUENCY
  const homeScores =
    HOME_FORM.filter((m) => m.homeScore >= 1).length / (HOME_FORM.length || 1);
  const awayScores =
    AWAY_FORM.filter((m) => m.awayScore >= 1).length / (AWAY_FORM.length || 1);

  if (homeScores >= 0.7) score += 3;
  if (awayScores >= 0.7) score += 3;

  // CONCEDING
  const homeConcedes =
    HOME_FORM.filter((m) => m.awayScore >= 1).length / (HOME_FORM.length || 1);
  const awayConcedes =
    AWAY_FORM.filter((m) => m.homeScore >= 1).length / (AWAY_FORM.length || 1);

  if (homeConcedes >= 0.6) score += 2;
  if (awayConcedes >= 0.6) score += 2;

  // H2H BTTS RATE
  const h2hValid = DIRECT_H2H.filter(
    (m) => m.homeScore !== null && m.awayScore !== null,
  );
  const h2hBTTS =
    h2hValid.filter((m) => m.homeScore >= 1 && m.awayScore >= 1).length /
    (h2hValid.length || 1);

  if (h2hBTTS >= 0.6) score += 4;
  else if (h2hBTTS < 0.3) score -= 4;

  // LOW SCORE PENALTY
  const lowScoreRate =
    allMatches.filter((m) => m.homeScore + m.awayScore <= 1).length /
    allMatches.length;

  if (lowScoreRate > 0.3) score -= 5;

  return score;
}

function calculateGoalScoreStrict({ HOME_FORM, AWAY_FORM, DIRECT_H2H }) {
  const allMatches = [...HOME_FORM, ...AWAY_FORM, ...DIRECT_H2H].filter(
    (r) => r.homeScore !== null && r.awayScore !== null,
  );

  // ❌ Not enough data → reject
  if (allMatches.length < 6) return -5;

  const totalMatches = allMatches.length;

  const totalGoals = allMatches.reduce(
    (sum, r) => sum + r.homeScore + r.awayScore,
    0,
  );

  const combinedAvg = totalGoals / totalMatches;

  const highScoring = allMatches.filter(
    (r) => r.homeScore + r.awayScore >= 3,
  ).length;

  const lowScoring = allMatches.filter(
    (r) => r.homeScore + r.awayScore <= 1,
  ).length;

  const highRate = highScoring / totalMatches;
  const lowRate = lowScoring / totalMatches;

  // 🔥 HARD FILTERS (THIS IS THE KEY FIX)

  // Too many low scoring games → reject
  if (lowRate > 0.25) return -5;

  // Not enough high scoring consistency → reject
  if (highRate < 0.55) return -5;

  // Average too low → reject
  if (combinedAvg < 2.8) return -5;

  // 🔥 H2H VALIDATION (extra strictness)
  const h2hMatches = DIRECT_H2H.filter(
    (r) => r.homeScore !== null && r.awayScore !== null,
  );

  if (h2hMatches.length >= 3) {
    const h2hHighRate =
      h2hMatches.filter((r) => r.homeScore + r.awayScore >= 3).length /
      h2hMatches.length;

    if (h2hHighRate < 0.5) return -5;
  }

  // ✅ SCORING (simple, no inflation)
  let score = 0;

  // Average strength
  if (combinedAvg >= 3.2) score += 4;
  if (combinedAvg >= 3.6) score += 6;

  // Frequency strength
  if (highRate >= 0.6) score += 4;
  if (highRate >= 0.7) score += 6;

  // Low-risk bonus
  if (lowRate <= 0.2) score += 2;

  return Math.min(score, 15);
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

// ── Form mode helpers ────────────────────────────────────────────────────────

function calculateFormScore(matches, teamName) {
  const last7 = matches.slice(0, 7);
  let points = 0;
  let totalWeight = 0;

  last7.forEach((m, index) => {
    if (m.homeScore == null || m.awayScore == null) return;
    const weight = index === 0 ? 1.5 : 1.0;
    let matchPoints = 0;
    if (teamWon(m, teamName)) matchPoints = 3;
    else if (!teamWon(m, teamName) && !teamLost(m, teamName)) matchPoints = 1;
    points += matchPoints * weight;
    totalWeight += 3 * weight;
  });

  if (totalWeight === 0) return 0;
  return (points / totalWeight) * 10;
}

// 🔥 NEW: Balanced Form + H2H (with home context)

function calculateH2HScore(matches, homeTeam, awayTeam) {
  const last5 = matches.slice(0, 5);

  let generalPoints = 0;
  let generalWeight = 0;

  let homeContextPoints = 0;
  let homeContextWeight = 0;

  last5.forEach((m, index) => {
    if (m.homeScore == null || m.awayScore == null) return;

    const weight = index === 0 ? 1.5 : 1.0;

    let matchPoints = 0;

    if (teamWon(m, homeTeam)) matchPoints = 3;
    else if (!teamWon(m, homeTeam) && !teamLost(m, homeTeam)) matchPoints = 1;

    // GENERAL H2H
    generalPoints += matchPoints * weight;
    generalWeight += 3 * weight;

    // 🏟️ HOME CONTEXT (when home team was actually home)
    if (m.homeTeam === homeTeam) {
      const boostedWeight = weight + 0.5;
      homeContextPoints += matchPoints * boostedWeight;
      homeContextWeight += 3 * boostedWeight;
    }
  });

  const generalScore =
    generalWeight === 0 ? 0 : (generalPoints / generalWeight) * 10;

  const homeScore =
    homeContextWeight === 0
      ? generalScore
      : (homeContextPoints / homeContextWeight) * 10;

  // ⚖️ Combine both (balanced)
  return generalScore * 0.6 + homeScore * 0.4;
}

function calculateFormBasedScore({
  HOME_FORM,
  AWAY_FORM,
  DIRECT_H2H,
  homeTeam,
  awayTeam,
}) {
  // ✅ FORM SCORES (unchanged logic)
  const homeFormScore = calculateFormScore(HOME_FORM, homeTeam);
  const awayFormScore = calculateFormScore(AWAY_FORM, awayTeam);
  const formDelta = homeFormScore - awayFormScore;

  // ✅ NEW H2H SCORES (balanced + contextual)
  const homeH2HScore = calculateH2HScore(DIRECT_H2H, homeTeam, awayTeam);
  const awayH2HScore = calculateH2HScore(DIRECT_H2H, awayTeam, homeTeam);
  const h2hDelta = homeH2HScore - awayH2HScore;

  // 🚫 HARD REJECTION (strong negative signals)
  if (formDelta < -2 || h2hDelta < -2) {
    return { rejected: true };
  }

  let score = 0;

  // ⚖️ EQUAL IMPORTANCE
  score += formDelta * 1.5;
  score += h2hDelta * 1.5;

  // 🔥 STRONG AGREEMENT BOOST
  if (formDelta > 2 && h2hDelta > 2) {
    score += 4;
  }

  // ⚠️ CONFLICT PENALTY
  if ((formDelta > 2 && h2hDelta < 0) || (h2hDelta > 2 && formDelta < 0)) {
    score -= 3;
  }

  return {
    score,
    homeFormScore,
    awayFormScore,
    formDelta,
    rejected: false,
  };
}

function getFormConfidence(score) {
  if (score >= 12) return "HIGH";
  if (score >= 8) return "MEDIUM";
  return "LOW";
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /predictions
 * Query params:
 *   - date (required) - YYYY-MM-DD
 *   - leagues[] (optional) - array of league name strings
 *   - mode (optional) - "gate" or "score"
 *   - threshold (optional) - minimum score to include a prediction
 *   - goalMode (optional) - "light" or "strict"
 *   - over15Threshold (optional) - goal score threshold for Over 1.5
 *   - over25Threshold (optional) - goal score threshold for Over 2.5
 *   - bttsThreshold (optional) - btts score threshold for BTTS
 *
 * Returns { success: true, data: [ predictionObject, ... ] }
 */
async function getPredictions(req, res) {
  try {
    const { date } = req.query;
    const mode =
      req.query.mode === "score"
        ? "score"
        : req.query.mode === "form"
          ? "form"
          : req.query.mode === "ultra"
            ? "ultra"
            : "gate";
    const goalMode = req.query.goalMode === "strict" ? "strict" : "light";
    const parsedThreshold = Number(req.query.threshold);
    const threshold = Number.isFinite(parsedThreshold) ? parsedThreshold : 10;
    const parsedOver15Threshold = Number(req.query.over15Threshold);
    const over15Threshold = Number.isFinite(parsedOver15Threshold)
      ? parsedOver15Threshold
      : 7;
    const parsedOver25Threshold = Number(req.query.over25Threshold);
    const over25Threshold = Number.isFinite(parsedOver25Threshold)
      ? parsedOver25Threshold
      : 11;
    const parsedBttsThreshold = Number(req.query.bttsThreshold);
    const bttsThreshold = Number.isFinite(parsedBttsThreshold)
      ? parsedBttsThreshold
      : 7;

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
      const { HOME_FORM = [], AWAY_FORM = [], DIRECT_H2H = [] } = h2hData;

      const homeTeam = match.homeTeam;
      const awayTeam = match.awayTeam;
      const goalScore =
        goalMode === "strict"
          ? calculateGoalScoreStrict({
              HOME_FORM,
              AWAY_FORM,
              DIRECT_H2H,
              homeTeam,
              awayTeam,
            })
          : calculateGoalScore({
              HOME_FORM,
              AWAY_FORM,
              DIRECT_H2H,
            });
      const over15 = goalScore >= over15Threshold;
      const over25 = goalScore >= over25Threshold;
      const bttsScore = calculateBTTSScore({
        HOME_FORM,
        AWAY_FORM,
        DIRECT_H2H,
      });

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
      let winnerQualified = false;
      let homeFormScore = null;
      let awayFormScore = null;
      let formDelta = null;

      if (mode === "gate") {
        winnerQualified = passesGateSystem({
          formWins,
          formLosses,
          h2hHomeWins,
          h2hTotalLosses,
        });
      } else if (mode === "score") {
        score = calculateScore({
          formWins,
          formLosses,
          h2hHomeWins,
          h2hTotalLosses,
        });
        confidence = getScoreConfidence(score);
        winnerQualified = score >= threshold;
      } else if (mode === "form") {
        const formResult = calculateFormBasedScore({
          HOME_FORM,
          AWAY_FORM,
          DIRECT_H2H,
          homeTeam,
          awayTeam,
        });
        if (!formResult.rejected && formResult.score >= 8) {
          score = formResult.score;
          confidence = getFormConfidence(formResult.score);
          winnerQualified = true;
          homeFormScore = Number(formResult.homeFormScore.toFixed(2));
          awayFormScore = Number(formResult.awayFormScore.toFixed(2));
          formDelta = Number(formResult.formDelta.toFixed(2));
        }
        // Always fall through to predictions.push so goal market data is preserved
      } else if (mode === "ultra") {
        // AND-intersection of gate, score, and form modes
        const gateQualified = passesGateSystem({
          formWins,
          formLosses,
          h2hHomeWins,
          h2hTotalLosses,
        });

        const ultraScore = calculateScore({
          formWins,
          formLosses,
          h2hHomeWins,
          h2hTotalLosses,
        });
        const scoreQualified = ultraScore >= threshold;

        const formResult = calculateFormBasedScore({
          HOME_FORM,
          AWAY_FORM,
          DIRECT_H2H,
          homeTeam,
          awayTeam,
        });
        const formQualified = !formResult.rejected && formResult.score >= 8;

        winnerQualified = gateQualified && scoreQualified && formQualified;
      }

      predictions.push({
        matchId: match.id,
        flashscoreId: match.flashscoreId,
        matchDate: match.matchDate,
        matchTime: match.matchTime,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        leagueName: match.leagueName,
        predictedWinner: winnerQualified ? homeTeam : null,
        oddsHome: match.oddsHome ?? null,
        oddsDraw: match.oddsDraw ?? null,
        oddsAway: match.oddsAway ?? null,
        mode,
        goalMode,
        score: score !== null ? Number(score.toFixed(2)) : null,
        confidence,
        over15: false,
        over25: false,
        over15Threshold,
        over25Threshold,
        goalScore: Number(goalScore.toFixed(2)),
        bttsScore: Number(bttsScore.toFixed(2)),
        btts: false,
        bttsThreshold,
        homeFormScore,
        awayFormScore,
        formDelta,
      });
    }

    if (goalMode === "strict") {
      const over15Pool = predictions.filter(
        (prediction) => prediction.goalScore > over15Threshold,
      );
      const over25Count =
        over15Pool.length > 0 ? Math.ceil(over15Pool.length * 0.3) : 0;
      const over25Ids = new Set(
        [...over15Pool]
          .sort(compareStrictGoalCandidates)
          .slice(0, over25Count)
          .map((prediction) => prediction.matchId),
      );

      predictions.forEach((prediction) => {
        const qualifiesForGoalPool = prediction.goalScore > over15Threshold;
        prediction.over25 = over25Ids.has(prediction.matchId);
        prediction.over15 = qualifiesForGoalPool && !prediction.over25;
      });
    } else {
      predictions.forEach((prediction) => {
        prediction.over15 =
          prediction.goalScore > over15Threshold &&
          prediction.goalScore < over25Threshold;
        prediction.over25 = prediction.goalScore > over25Threshold;
      });
    }

    predictions.forEach((prediction) => {
      prediction.btts = prediction.bttsScore > bttsThreshold;
    });

    return res.json({ success: true, data: predictions });
  } catch (error) {
    console.error("Error generating predictions:", error);
    return res
      .status(500)
      .json({ success: false, error: "Failed to generate predictions" });
  }
}

module.exports = { getPredictions };
