/**
 * Utility functions for match filtering and sync state.
 */

/**
 * Filter a list of matches by the selected league names.
 * An empty leagues array returns the original list unmodified.
 * @param {Array} matches
 * @param {string[]} leagues
 * @returns {Array}
 */
export function filterByLeagues(matches, leagues) {
  if (leagues.length === 0) return matches;
  return matches.filter((m) => {
    const league = m.leagueName || m.league_name || m.league?.name || "";
    return leagues.includes(league);
  });
}

/**
 * Returns true when every match in the list has been synced (H2H complete).
 * @param {Array} matches
 * @returns {boolean}
 */
export function allMatchesSynced(matches) {
  return matches.length > 0 && matches.every((m) => m.isSynced || m.h2hScraped);
}
