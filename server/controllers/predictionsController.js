/**
 * Predictions Controller — HTTP layer only.
 * All business logic lives in PredictionService and its sub-layers.
 */

const PredictionService = require("../services/predictions/PredictionService");

const predictionService = new PredictionService();

/**
 * GET /predictions
 * Query params:
 *   - date (required) - YYYY-MM-DD
 *   - leagues[] (optional) - array of league name strings
 *   - mode (optional) - "gate" | "score" | "form" | "ultra"
 *   - threshold (optional) - minimum score to include a prediction
 *   - goalMode (optional) - "light" | "strict"
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

    const predictions = await predictionService.getPredictions({
      date,
      leagues,
      mode,
      goalMode,
      threshold,
      over15Threshold,
      over25Threshold,
      bttsThreshold,
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
