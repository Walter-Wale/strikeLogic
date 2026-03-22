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

module.exports = { teamWon, teamLost };
