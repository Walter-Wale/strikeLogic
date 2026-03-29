const DatabaseService = require("../DatabaseService");

const GateSystem = require("./systems/winner/GateSystem");
const ScoreSystem = require("./systems/winner/ScoreSystem");
const FormSystem = require("./systems/winner/FormSystem");
const UltraSystem = require("./systems/winner/UltraSystem");

const Over15System = require("./systems/goals/Over15System");
const SuperOver25System = require("./systems/goals/SuperOver25System");
const BTTSSystem = require("./systems/btts/BTTSSystem");

const { applyStrictGoalSelector } = require("./selectors/strictGoalSelector");

class PredictionService {
  constructor() {
    this.databaseService = new DatabaseService();
  }

  async getPredictions({
    date,
    leagues,
    mode,
    goalMode,
    threshold,
    over15Threshold,
    over25Threshold,
    bttsThreshold,
  }) {
    // Fetch all matches for the date from the DB
    const allMatches = await this.databaseService.getMatchesByDate(date);

    // Keep only matches that are synced (H2H scraped) and in the selected leagues
    const syncedMatches = allMatches.filter((m) => {
      if (!m.isSynced) return false;
      if (leagues.length === 0) return true;
      return leagues.includes(m.leagueName);
    });

    const config = {
      mode,
      goalMode,
      threshold,
      over15Threshold,
      over25Threshold,
      bttsThreshold,
    };

    const predictions = [];

    for (const match of syncedMatches) {
      const h2hData = await this.databaseService.getH2HData(match.id);
      const { HOME_FORM = [], AWAY_FORM = [], DIRECT_H2H = [] } = h2hData;
      const normalizedH2HData = { HOME_FORM, AWAY_FORM, DIRECT_H2H };

      // ── Winner prediction ──────────────────────────────────────────────────
      let winnerQualified = false;
      let score = null;
      let confidence = null;
      let homeFormScore = null;
      let awayFormScore = null;
      let formDelta = null;

      if (mode === "gate") {
        const result = GateSystem.run(match, normalizedH2HData, config);
        winnerQualified = result.winnerQualified;
      } else if (mode === "score") {
        const result = ScoreSystem.run(match, normalizedH2HData, config);
        winnerQualified = result.winnerQualified;
        score = result.score;
        confidence = result.confidence;
      } else if (mode === "form") {
        const result = FormSystem.run(match, normalizedH2HData, config);
        winnerQualified = result.winnerQualified;
        score = result.score;
        confidence = result.confidence;
        homeFormScore = result.homeFormScore;
        awayFormScore = result.awayFormScore;
        formDelta = result.formDelta;
      } else if (mode === "ultra") {
        const result = UltraSystem.run(match, normalizedH2HData, config);
        winnerQualified = result.winnerQualified;
      }

      // ── Goal & BTTS predictions ────────────────────────────────────────────
      let goalScore = null;
      let over15 = false;
      let over25 = false;

      if (goalMode === "super") {
        const result = SuperOver25System.run(match, normalizedH2HData, config);
        goalScore = result.goalScore;
        over25 = result.over25;
      } else {
        const result = Over15System.run(match, normalizedH2HData, config);
        goalScore = result.goalScore;
      }

      const { bttsScore } = BTTSSystem.run(match, normalizedH2HData, config);

      const homeTeam = match.homeTeam;

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
        over15,
        over25,
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

    // ── Apply goal market flags ────────────────────────────────────────────
    if (goalMode === "super") {
      predictions.forEach((prediction) => {
        prediction.over15 = false;
      });
    } else if (goalMode === "strict") {
      applyStrictGoalSelector(predictions, { over15Threshold });
    } else {
      predictions.forEach((prediction) => {
        prediction.over15 =
          prediction.goalScore > over15Threshold &&
          prediction.goalScore < over25Threshold;
        prediction.over25 = prediction.goalScore > over25Threshold;
      });
    }

    // ── Apply BTTS flag ───────────────────────────────────────────────────
    predictions.forEach((prediction) => {
      prediction.btts = prediction.bttsScore > bttsThreshold;
    });

    return predictions;
  }
}

module.exports = PredictionService;
