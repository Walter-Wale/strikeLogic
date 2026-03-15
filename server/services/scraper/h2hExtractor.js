const selectors = require("../../../shared/selectors");
const DataCleaner = require("../../utils/DataCleaner");
const { ensureMinimumMatches } = require("../../utils/expandMatches");
const { emitLog } = require("../../utils/socketLogger");

/**
 * Validate H2H selectors on the page
 * Ensures exactly 3 containers are found before attempting extraction
 * @param {Page} page - Puppeteer page instance
 * @param {Object} match - Match object with team names for logging
 * @param {SocketIO.Server} io - Socket.io instance for emitting logs
 * @returns {Promise<{isValid: boolean, count: number}>}
 */
async function validateH2HSelectors(page, match, io) {
  try {
    const containerCount = await page.$$eval(
      selectors.H2H_SELECTORS.CONTAINERS,
      (sections) => sections.length,
    );

    if (containerCount === 3) {
      emitLog(
        io,
        `[Scraper]: Found all 3 H2H sections. Proceeding with full extraction...`,
        "success",
      );
      return { isValid: true, count: containerCount };
    } else if (containerCount > 0) {
      emitLog(
        io,
        `[Scraper]: Found ${containerCount}/3 H2H sections. Will scrape available data...`,
        "warning",
      );
      return { isValid: true, count: containerCount };
    } else {
      emitLog(
        io,
        `[Scraper]: ❌ Error - No H2H containers found for ${match.homeTeam} vs ${match.awayTeam}. Selectors may be outdated. Please update shared/selectors.js`,
        "error",
      );
      return { isValid: false, count: 0 };
    }
  } catch (error) {
    emitLog(
      io,
      `[Scraper]: ❌ Error validating selectors: ${error.message}`,
      "error",
    );
    return { isValid: false, count: 0 };
  }
}

/**
 * Scrape all H2H sections by dynamically identifying each section type from header text
 * FlashScore sections can appear in any order or be lazy-loaded
 * @param {Page} page - Puppeteer page instance
 * @param {number} parentMatchId - Parent match ID for foreign key
 * @param {string} homeTeam - Home team name for logging
 * @param {string} awayTeam - Away team name for logging
 * @param {SocketIO.Server} io - Socket.io instance for emitting logs
 * @returns {Promise<Array>} Combined array of all H2H data
 */
async function scrapeSectionsByIndex(
  page,
  parentMatchId,
  homeTeam,
  awayTeam,
  io,
) {
  const allData = [];

  try {
    // Get all section containers (validation already done, this is for processing)
    const sectionCount = await page.$$eval(
      selectors.H2H_SELECTORS.CONTAINERS,
      (sections) => sections.length,
    );

    emitLog(io, `📋 Processing ${sectionCount} H2H sections...`, "info");

    // Iterate through each section and identify by header text
    for (let i = 0; i < sectionCount; i++) {
      // Single evaluate to identify section type AND detect show-more button —
      // eliminates one evaluateHandle + asElement round-trip per section.
      const sectionInfo = await page.evaluate(
        (containerSel, index, home, away) => {
          const sections = document.querySelectorAll(containerSel);
          if (index >= sections.length) return null;

          const section = sections[index];

          // Find header text - FlashScore uses various selectors
          const headerSelectors = [
            ".wcl-headerSection_SGpOR span",
            '[data-testid="wcl-scores-overline-02"]',
            ".wcl-bold_NZXv6",
            "span.wcl-scores-overline-02_bpqU7",
          ];

          let headerText = "";
          for (const sel of headerSelectors) {
            const headerEl = section.querySelector(sel);
            if (headerEl && headerEl.textContent.trim()) {
              headerText = headerEl.textContent.trim();
              break;
            }
          }

          // Determine section type from header text
          let sectionType = null;
          let label = "";

          if (
            headerText.toLowerCase().includes("head-to-head") ||
            headerText.toLowerCase().includes("head to head")
          ) {
            sectionType = "DIRECT_H2H";
            label = "Direct H2H";
          } else if (
            headerText.includes(home) ||
            (headerText.toLowerCase().includes("last matches") &&
              headerText.includes(home))
          ) {
            sectionType = "HOME_FORM";
            label = `${home} recent form`;
          } else if (
            headerText.includes(away) ||
            (headerText.toLowerCase().includes("last matches") &&
              headerText.includes(away))
          ) {
            sectionType = "AWAY_FORM";
            label = `${away} recent form`;
          }

          // Detect show-more button in the same pass (saves an evaluateHandle round-trip)
          const hasShowMore = !!section.querySelector(
            "button.wclButtonLink--h2h",
          );

          return { sectionType, label, headerText, hasShowMore };
        },
        selectors.H2H_SELECTORS.CONTAINERS,
        i,
        homeTeam,
        awayTeam,
      );

      if (!sectionInfo || !sectionInfo.sectionType) {
        emitLog(
          io,
          `⚠️ Could not identify section ${i + 1} (header: "${sectionInfo?.headerText || "unknown"}") - skipping`,
          "warning",
        );
        continue;
      }

      const { sectionType, label } = sectionInfo;

      // Click "Show more" via a direct evaluate — no evaluateHandle needed
      if (sectionInfo.hasShowMore) {
        try {
          await page.evaluate(
            (containerSel, index) => {
              const sections = document.querySelectorAll(containerSel);
              const btn = sections[index]?.querySelector(
                "button.wclButtonLink--h2h",
              );
              if (btn) {
                btn.scrollIntoView({ block: "center" });
                btn.click();
              }
            },
            selectors.H2H_SELECTORS.CONTAINERS,
            i,
          );
          // Wait for expanded rows to render
          await new Promise((resolve) => setTimeout(resolve, 1000));
        } catch (showMoreError) {
          // Non-fatal – section may not have a "show more" button
        }
      }

      emitLog(io, `📊 Extracting ${label}...`, "info");

      // Extract data from this section
      const sectionData = await page.evaluate(
        (
          containerSel,
          rowSel,
          dateSel,
          participantSel,
          resultSel,
          eventSel,
          index,
          secType,
          parentId,
        ) => {
          const sections = document.querySelectorAll(containerSel);
          if (index >= sections.length) return [];

          const section = sections[index];
          const rows = section.querySelectorAll(rowSel);
          const extracted = [];

          rows.forEach((row) => {
            try {
              const dateText = row.querySelector(dateSel)?.textContent?.trim();
              const participants = Array.from(
                row.querySelectorAll(participantSel),
              );
              const homeTeam = participants[0]?.textContent?.trim();
              const awayTeam = participants[1]?.textContent?.trim();

              // Extract scores from individual span elements within .h2h__result
              // Structure: <span class="h2h__result"><span>0</span><span>1</span></span>
              const resultContainer = row.querySelector(resultSel);
              const scoreSpans =
                resultContainer?.querySelectorAll("span") || [];
              const homeScore = scoreSpans[0]?.textContent?.trim();
              const awayScore = scoreSpans[1]?.textContent?.trim();
              // For backward compatibility with DataCleaner, combine as "homeScore awayScore"
              const scoreText =
                homeScore && awayScore ? `${homeScore} ${awayScore}` : null;

              const competition = row
                .querySelector(eventSel)
                ?.textContent?.trim();

              if (homeTeam && awayTeam) {
                extracted.push({
                  matchDate: dateText,
                  homeTeam,
                  awayTeam,
                  scoreText,
                  competition: competition || "Unknown",
                  sectionType: secType,
                  parentMatchId: parentId,
                });
              }
            } catch (err) {
              console.error("Error extracting row:", err);
            }
          });

          return extracted.slice(0, 10); // Limit to 10 matches per section
        },
        selectors.H2H_SELECTORS.CONTAINERS,
        selectors.H2H_SELECTORS.ROW,
        selectors.H2H_SELECTORS.DATE,
        selectors.H2H_SELECTORS.PARTICIPANT,
        selectors.H2H_SELECTORS.RESULT,
        selectors.H2H_SELECTORS.EVENT,
        i,
        sectionType,
        parentMatchId,
      );

      // Parse scores and dates
      const cleanedData = sectionData.map((match) => {
        const { homeScore, awayScore } = DataCleaner.parseScore(
          match.scoreText,
        );
        const parsedDate = DataCleaner.parseDate(match.matchDate);

        return {
          parentMatchId: match.parentMatchId,
          sectionType: match.sectionType,
          matchDate: parsedDate || new Date().toISOString().split("T")[0],
          homeTeam: DataCleaner.cleanTeamName(match.homeTeam),
          awayTeam: DataCleaner.cleanTeamName(match.awayTeam),
          homeScore,
          awayScore,
          competition: match.competition,
        };
      });

      if (cleanedData.length === 0) {
        emitLog(
          io,
          `⚠️ No rows found in ${label} - check selectors.H2H_SELECTORS.ROW in shared/selectors.js`,
          "warning",
        );
      } else {
        emitLog(
          io,
          `✓ Extracted ${cleanedData.length} matches from ${label}`,
          "success",
        );
      }

      allData.push(...cleanedData);
    }

    return allData;
  } catch (error) {
    emitLog(io, `❌ Error scraping H2H sections: ${error.message}`, "error");
    console.error("Scrape sections error:", error);
    return [];
  }
}

/**
 * DEPRECATED: Old method kept for reference
 * Use scrapeSectionsByIndex instead
 */
async function scrapeSection(
  page,
  containerSelector,
  sectionType,
  parentMatchId,
  maxRows = 10,
) {
  try {
    // Check if container exists
    const containerExists = await page.$(containerSelector);

    if (!containerExists) {
      // Try alternative selector
      const altSelector = `${containerSelector}_ALT`;
      if (selectors[altSelector]) {
        const altExists = await page.$(selectors[altSelector]);
        if (altExists) {
          containerSelector = selectors[altSelector];
        } else {
          console.log(`Container ${containerSelector} not found`);
          return [];
        }
      } else {
        return [];
      }
    }

    // Try to expand matches if "Show more" button exists
    await ensureMinimumMatches(
      page,
      containerSelector,
      selectors.SHOW_MORE_BUTTON,
      selectors.H2H_MATCH_ROW_SELECTOR,
      maxRows,
    );

    // Extract match data from the section
    const matches = await page.evaluate(
      (
        container,
        rowSel,
        dateSel,
        homeSel,
        awaySel,
        scoreSel,
        compSel,
        secType,
        parentId,
      ) => {
        const rows = document.querySelectorAll(`${container} ${rowSel}`);
        const extracted = [];

        rows.forEach((row, index) => {
          try {
            const dateText = row.querySelector(dateSel)?.textContent?.trim();
            const homeTeam = row.querySelector(homeSel)?.textContent?.trim();
            const awayTeam = row.querySelector(awaySel)?.textContent?.trim();
            const scoreText = row.querySelector(scoreSel)?.textContent?.trim();
            const competition = row.querySelector(compSel)?.textContent?.trim();

            if (homeTeam && awayTeam) {
              extracted.push({
                matchDate: dateText,
                homeTeam,
                awayTeam,
                scoreText,
                competition: competition || "Unknown",
                sectionType: secType,
                parentMatchId: parentId,
              });
            }
          } catch (err) {
            console.error("Error extracting row:", err);
          }
        });

        return extracted.slice(0, 10); // Limit to 10 matches
      },
      containerSelector,
      selectors.H2H_MATCH_ROW_SELECTOR,
      selectors.H2H_MATCH_DATE_SELECTOR,
      selectors.H2H_HOME_TEAM_SELECTOR,
      selectors.H2H_AWAY_TEAM_SELECTOR,
      selectors.H2H_SCORE_SELECTOR,
      selectors.H2H_COMPETITION_SELECTOR,
      sectionType,
      parentMatchId,
    );

    // Parse scores and dates using DataCleaner
    const cleanedMatches = matches.map((match) => {
      const { homeScore, awayScore } = DataCleaner.parseScore(match.scoreText);
      const parsedDate = DataCleaner.parseDate(match.matchDate);

      return {
        parentMatchId: match.parentMatchId,
        sectionType: match.sectionType,
        matchDate: parsedDate || new Date().toISOString().split("T")[0],
        homeTeam: DataCleaner.cleanTeamName(match.homeTeam),
        awayTeam: DataCleaner.cleanTeamName(match.awayTeam),
        homeScore,
        awayScore,
        competition: match.competition,
      };
    });

    return cleanedMatches;
  } catch (error) {
    console.error(`Error scraping section ${sectionType}:`, error);
    return [];
  }
}

module.exports = { validateH2HSelectors, scrapeSectionsByIndex, scrapeSection };
