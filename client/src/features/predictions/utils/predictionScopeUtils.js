export const PREDICTION_SCOPE_OPTIONS = {
  ALL_SYNCED: "all_synced",
  FAVORITE_COUNTRIES: "favorite_countries",
  FAVORITES_PLUS_LEAGUES: "favorites_plus_leagues",
};

export const FAVORITE_COUNTRIES_STORAGE_KEY =
  "strikelogic.favorite-countries";

export function getLeagueName(match) {
  return match?.leagueName || match?.league_name || match?.league?.name || "";
}

export function isSyncedMatch(match) {
  return Boolean(match?.isSynced || match?.h2hScraped);
}

export function extractCountryFromLeague(leagueName) {
  if (!leagueName) return "";
  const separatorIndex = leagueName.indexOf(":");
  return (
    (separatorIndex >= 0
      ? leagueName.slice(0, separatorIndex)
      : leagueName
    ).trim() || ""
  );
}

export function sortAlphabetically(values) {
  return [...values].sort((a, b) => a.localeCompare(b));
}

export function getUniqueSyncedLeagues(matches) {
  return sortAlphabetically(
    [...new Set(matches.map(getLeagueName).filter(Boolean))],
  );
}

export function getAvailableCountries(leagues, selectedCountries = []) {
  return sortAlphabetically(
    [
      ...new Set([
        ...leagues.map((league) => extractCountryFromLeague(league)).filter(Boolean),
        ...selectedCountries.filter(Boolean),
      ]),
    ],
  );
}

export function getLeaguesForCountries(leagues, countries) {
  const selectedCountries = new Set(countries);
  return sortAlphabetically(
    leagues.filter((league) =>
      selectedCountries.has(extractCountryFromLeague(league)),
    ),
  );
}

export function mergeUnique(values) {
  return sortAlphabetically([...new Set(values.filter(Boolean))]);
}
