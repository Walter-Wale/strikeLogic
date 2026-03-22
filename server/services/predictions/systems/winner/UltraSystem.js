const GateSystem = require("./GateSystem");
const ScoreSystem = require("./ScoreSystem");
const FormSystem = require("./FormSystem");

/**
 * Ultra winner system — AND-intersection of Gate, Score, and Form.
 * Accepts (match, h2hData, config).
 * Returns { winnerQualified, score: null, confidence: null }
 *
 * winnerQualified is true only when ALL THREE sub-systems qualify.
 */
function run(match, h2hData, config) {
  const gateResult = GateSystem.run(match, h2hData, config);
  const scoreResult = ScoreSystem.run(match, h2hData, config);
  const formResult = FormSystem.run(match, h2hData, config);

  const winnerQualified =
    gateResult.winnerQualified &&
    scoreResult.winnerQualified &&
    formResult.winnerQualified;

  return { winnerQualified, score: null, confidence: null };
}

module.exports = { run };
