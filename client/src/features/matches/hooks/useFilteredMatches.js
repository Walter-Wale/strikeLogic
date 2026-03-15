import { useMemo } from "react";
import { filterByLeagues } from "../utils/matchUtils";

/**
 * Derives the filtered matches list from allMatches + selectedLeagues.
 * @param {Array} allMatches
 * @param {string[]} selectedLeagues
 * @returns {{ matches: Array }}
 */
function useFilteredMatches(allMatches, selectedLeagues) {
  const matches = useMemo(
    () => filterByLeagues(allMatches, selectedLeagues),
    [allMatches, selectedLeagues],
  );

  return { matches };
}

export default useFilteredMatches;
