/**
 * Centralized CSS Selectors for FlashScore.com
 * Update these if FlashScore changes their DOM structure
 *
 * NOTE: These selectors are examples and may need adjustment based on
 * FlashScore's actual DOM structure. Use browser DevTools to inspect
 * the actual selectors when implementing.
 */

module.exports = {
  // ============================================
  // MATCH LIST PAGE SELECTORS
  // ============================================

  /**
   * Main container for all matches on date-filtered page
   * Example: <div class="sportName football" id="g_1_..."">
   */
  MATCHES_CONTAINER: ".sportName.football",

  /**
   * Individual match row/event
   * Verified: <div class="event__match event__match--scheduled" id="g_1_hOA1PhIN">
   */
  MATCH_ROW_SELECTOR: ".event__match.event__match--scheduled",

  /**
   * Attribute containing FlashScore's match ID (e.g., "g_1_hOA1PhIN")
   * Extract using: id.split('_')[2] to get clean ID
   */
  MATCH_ID_ATTRIBUTE: "id",

  /**
   * Home team name within match row
   * Actual structure: <div class="event__homeParticipant"><span class="wcl-name_jjfMf">Team Name</span></div>
   */
  HOME_TEAM_SELECTOR: ".event__homeParticipant .wcl-name_jjfMf",

  /**
   * Away team name within match row
   * Actual structure: <div class="event__awayParticipant"><span class="wcl-name_jjfMf">Team Name</span></div>
   */
  AWAY_TEAM_SELECTOR: ".event__awayParticipant .wcl-name_jjfMf",

  /**
   * Match time within match row
   * Example: <div class="event__time">15:00</div>
   */
  MATCH_TIME_SELECTOR: ".event__time",

  /**
   * Match date section header (for grouping matches by date)
   * Example: <div class="event__time">28.02.</div>
   */
  MATCH_DATE_SELECTOR: ".event__time",

  /**
   * League/competition name (without country)
   * Example: <a class="headerLeague__title"><span>Premier League</span></a>
   * Note: This gets only the league name, not the country
   */
  LEAGUE_HEADER_SELECTOR: ".headerLeague__title",

  /**
   * Country name for league (in headerLeague__meta section)
   * Example: <span class="headerLeague__category-text">ENGLAND</span>
   * Used to construct "COUNTRY: League Name" format
   */
  LEAGUE_COUNTRY_SELECTOR: ".headerLeague__category-text",

  /**
   * League name only (without country)
   * Example: <div class="event__title--name">Premier League</div>
   */
  LEAGUE_NAME_SELECTOR: ".event__title--name",

  /**
   * Score for finished matches
   * Example: <div class="event__score">2 - 1</div>
   */
  MATCH_SCORE_SELECTOR: ".event__score--home, .event__score--away",

  /**
   * Match status (Finished, Live, Postponed, etc.)
   * Example: <div class="event__stage">Finished</div>
   */
  MATCH_STATUS_SELECTOR: ".event__stage",

  // ============================================
  // H2H PAGE SELECTORS (Match Detail Page)
  // ============================================

  /**
   * H2H Selectors - FlashScore H2H page structure
   * IMPORTANT: These selectors may be outdated if FlashScore changed their HTML
   *
   * To update selectors:
   * 1. Visit a match H2H page: https://www.flashscore.com/match/{matchId}/#/h2h/overall
   * 2. Open browser DevTools (F12)  3. Inspect the H2H sections and find the correct class names
   * 4. Update the selectors below
   *
   * The H2H page should contain 3 sections:
   *   Index 0: Home Team Recent Form (HOME_FORM)
   *   Index 1: Away Team Recent Form (AWAY_FORM)
   *   Index 2: Direct Head-to-Head (DIRECT_H2H)
   *
   * Common alternatives to try:
   * - Container: .h2h__section, .wcl-h2h, div[class*="h2h"], section[class*="tab"]
   * - Row: .h2h__row, div[class*="row"], tr
   */
  H2H_SELECTORS: {
    /**
     * All H2H section containers (returns 3 elements)
     * Example: <div class="h2h__section">...</div>
     */
    CONTAINERS: ".h2h__section",

    /**
     * Individual match row within each section
     * Example: <div class="h2h__row">...</div>
     */
    ROW: ".h2h__row",

    /**
     * Date/time cell within match row
     * Example: <span class="h2h__date">25.02.26</span>
     * FIXED: Was .h2h__datetime, now .h2h__date (verified 2026-03-01)
     */
    DATE: ".h2h__date",

    /**
     * Participant (team name) cells - INNER element with actual text
     * Example: <span class="h2h__participantInner">Arsenal</span>
     * FIXED: Was .h2h__participant, now .h2h__participantInner (verified 2026-03-01)
     * NOTE: This returns both home and away names (2 elements per row)
     */
    PARTICIPANT: ".h2h__participantInner",

    /**
     * Result/score cell
     * Example: <div class="h2h__result">2 - 1</div>
     */
    RESULT: ".h2h__result",

    /**
     * Competition/event name
     * Example: <div class="h2h__event">Premier League</div>
     */
    EVENT: ".h2h__event",

    /**
     * "Show more" button to expand matches
     * Verified 2026-03-02: <button class="wclButtonLink wclButtonLink--h2h ...">Show more matches</button>
     */
    SHOW_MORE: "button.wclButtonLink--h2h",
  },

  // ============================================
  // WAIT SELECTORS (for page load confirmation)
  // ============================================

  /**
   * Selector to wait for on match list page
   */
  WAIT_FOR_MATCHES: ".event__match, .event__header",

  /**
   * Selector to wait for on H2H page
   */
  WAIT_FOR_H2H: ".h2h__section, .h2h",

  // ============================================
  // ODDS TAB SELECTORS (match list odds view)
  // ============================================

  /**
   * ODDS_SELECTORS - FlashScore Odds tab structure
   *
   * HOW TO VERIFY / UPDATE THESE SELECTORS:
   * 1. Run the app — it will click the ODDS tab and save a debug HTML snapshot
   *    to server/logs/errors/odds_tab_<date>.html
   * 2. Open that file in a browser, use DevTools to inspect the odds cells
   * 3. Update the selectors below to match the live DOM
   *
   * Common alternatives to try for the tab button:
   *   button[data-testid*="odds"], a[href*="odds"], .filter__btn, .tabs__tab
   *
   * Common alternatives for per-row odds cells:
   *   .oddsCell__odd, .odds__odd, span[class*="oddsValue"], .event__odds--home
   */
  ODDS_SELECTORS: {
    /**
     * The "ODDS" tab/button on the FlashScore football list page
     * Clicking it switches the match list to display 1X2 odds
     * Verified 2026-03-12: <div class="filters__tab" data-analytics-alias="odds">
     */
    ODDS_TAB: '[data-analytics-alias="odds"]',

    /**
     * Home-win odds container within a match row
     * Verified 2026-03-12:
     *   <div class="odds__odd event__odd--odd1"><svg>...</svg><span class="up">3.15</span></div>
     */
    ODDS_HOME: ".event__odd--odd1",

    /**
     * Draw odds container within a match row
     * Verified 2026-03-12:
     *   <div class="odds__odd event__odd--odd2"><svg>...</svg><span class="down">3.05</span></div>
     */
    ODDS_DRAW: ".event__odd--odd2",

    /**
     * Away-win odds container within a match row
     * Verified 2026-03-12:
     *   <div class="odds__odd event__odd--odd3"><svg>...</svg><span>2.47</span></div>
     */
    ODDS_AWAY: ".event__odd--odd3",

    /**
     * All three odds containers in a single query (ordered: odd1=home, odd2=draw, odd3=away)
     * The numeric value is in the <span> child of each container
     */
    ODDS_CELLS: ".odds__odd",
  },
};
