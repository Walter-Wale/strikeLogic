/**
 * Database Service
 * Handles all database operations for matches, teams, and H2H history
 * Uses normalized schema with teams table
 */

const db = require("../models");
const { Op } = require("sequelize");

class DatabaseService {
  _chunkArray(items, chunkSize = 500) {
    const chunks = [];

    for (let index = 0; index < items.length; index += chunkSize) {
      chunks.push(items.slice(index, index + chunkSize));
    }

    return chunks;
  }

  _formatLocalDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  _formatLocalTime(date) {
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    return `${hours}:${minutes}:${seconds}`;
  }

  _normalizeDateOnly(value) {
    if (!value) return null;

    if (typeof value === "string") {
      return value.slice(0, 10);
    }

    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return this._formatLocalDate(value);
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }

    return this._formatLocalDate(parsed);
  }

  _normalizeTimeOnly(value) {
    if (!value) return null;

    const raw = String(value).trim();
    const match = raw.match(/^(\d{2}):(\d{2})(?::(\d{2}))?/);

    if (!match) {
      return null;
    }

    const [, hours, minutes, seconds = "00"] = match;
    return `${hours}:${minutes}:${seconds}`;
  }

  /**
   * Get or create a team by name
   * @param {string} teamName - Team name
   * @returns {Promise<Object>} Team instance with ID
   */
  async getOrCreateTeam(teamName) {
    try {
      const [team, created] = await db.Team.findOrCreate({
        where: { name: teamName },
        defaults: { name: teamName },
      });

      return team;
    } catch (error) {
      console.error("Error getting/creating team:", error);
      throw error;
    }
  }

  async _resolveTeamsByName(teamNames) {
    const uniqueTeamNames = [
      ...new Set(teamNames.map((name) => String(name || "").trim()).filter(Boolean)),
    ];

    if (uniqueTeamNames.length === 0) {
      return new Map();
    }

    const existingTeams = await db.Team.findAll({
      where: {
        name: {
          [Op.in]: uniqueTeamNames,
        },
      },
    });

    const existingTeamMap = new Map(
      existingTeams.map((team) => [team.name, team]),
    );

    const missingTeamNames = uniqueTeamNames.filter(
      (name) => !existingTeamMap.has(name),
    );

    if (missingTeamNames.length > 0) {
      await db.Team.bulkCreate(
        missingTeamNames.map((name) => ({ name })),
        {
          ignoreDuplicates: true,
        },
      );
    }

    const resolvedTeams = await db.Team.findAll({
      where: {
        name: {
          [Op.in]: uniqueTeamNames,
        },
      },
    });

    return new Map(resolvedTeams.map((team) => [team.name, team]));
  }

  /**
   * Get matches for a specific date with team names included
   * @param {string} date - Date in YYYY-MM-DD format
   * @returns {Promise<Array>} Array of match objects with team info
   */
  async getMatchesByDate(date) {
    try {
      const matches = await db.Match.findAll({
        where: { match_date: date },
        include: [
          {
            model: db.Team,
            as: "homeTeam",
            attributes: ["id", "name"],
            required: false,
          },
          {
            model: db.Team,
            as: "awayTeam",
            attributes: ["id", "name"],
            required: false,
          },
        ],
        order: [["match_time", "ASC"]],
      });

      // Transform to include team names at root level for frontend compatibility
      return matches.map((match) => {
        const data = match.toJSON();
        return {
          id: data.id,
          flashscoreId: data.flashscore_id,
          matchDate: data.match_date,
          matchTime: data.match_time,
          homeTeam: data.homeTeam?.name || "Unknown",
          awayTeam: data.awayTeam?.name || "Unknown",
          homeTeamId: data.home_team_id,
          awayTeamId: data.away_team_id,
          leagueName: data.league_name,
          isSynced: data.is_synced,
          h2hScraped: data.is_synced, // Alias for frontend compatibility
          flashscoreUrl: data.flashscore_url || null,
          oddsHome: data.odds_home != null ? parseFloat(data.odds_home) : null,
          oddsDraw: data.odds_draw != null ? parseFloat(data.odds_draw) : null,
          oddsAway: data.odds_away != null ? parseFloat(data.odds_away) : null,
          status: "scheduled", // Default status for scraped matches
        };
      });
    } catch (error) {
      console.error("Error fetching matches by date:", error);
      throw error;
    }
  }

  /**
   * Get only fully-synced (H2H scraped) matches for a date.
   * Used by the "Load Ready Matches" button — instant DB query, no scraping.
   * @param {string} date - Date in YYYY-MM-DD format
   * @returns {Promise<Array>} Array of synced match objects
   */
  async getSyncedMatchesByDate(date) {
    try {
      const matches = await db.Match.findAll({
        where: { match_date: date, is_synced: true },
        include: [
          {
            model: db.Team,
            as: "homeTeam",
            attributes: ["id", "name"],
            required: false,
          },
          {
            model: db.Team,
            as: "awayTeam",
            attributes: ["id", "name"],
            required: false,
          },
        ],
        order: [["match_time", "ASC"]],
      });

      return matches.map((match) => {
        const data = match.toJSON();
        return {
          id: data.id,
          flashscoreId: data.flashscore_id,
          matchDate: data.match_date,
          matchTime: data.match_time,
          homeTeam: data.homeTeam?.name || "Unknown",
          awayTeam: data.awayTeam?.name || "Unknown",
          homeTeamId: data.home_team_id,
          awayTeamId: data.away_team_id,
          leagueName: data.league_name,
          isSynced: true,
          h2hScraped: true,
          flashscoreUrl: data.flashscore_url || null,
          oddsHome: data.odds_home != null ? parseFloat(data.odds_home) : null,
          oddsDraw: data.odds_draw != null ? parseFloat(data.odds_draw) : null,
          oddsAway: data.odds_away != null ? parseFloat(data.odds_away) : null,
          status: "scheduled",
        };
      });
    } catch (error) {
      console.error("Error fetching synced matches by date:", error);
      throw error;
    }
  }

  /**
   * Save or update multiple matches (converts team names to IDs)
   * @param {Array} matchesArray - Array of match objects with team names
   * @returns {Promise<Array>} Array of saved match instances with team names
   */
  async saveMatches(matchesArray) {
    try {
      if (!Array.isArray(matchesArray) || matchesArray.length === 0) {
        return [];
      }

      const allTeamNames = matchesArray.flatMap((match) => [
        match.homeTeam,
        match.awayTeam,
      ]);
      const teamMap = await this._resolveTeamsByName(allTeamNames);

      const matchRecords = matchesArray.map((matchData) => {
        const homeTeam = teamMap.get(String(matchData.homeTeam || "").trim());
        const awayTeam = teamMap.get(String(matchData.awayTeam || "").trim());

        if (!homeTeam || !awayTeam) {
          throw new Error(
            `Could not resolve teams for match ${matchData.homeTeam} vs ${matchData.awayTeam}`,
          );
        }

        return {
          flashscore_id: matchData.flashscoreId,
          match_date: this._normalizeDateOnly(matchData.matchDate),
          match_time: this._normalizeTimeOnly(matchData.matchTime),
          home_team_id: homeTeam.id,
          away_team_id: awayTeam.id,
          league_name: matchData.leagueName || matchData.league_name || null,
          is_synced: matchData.isSynced || false,
          flashscore_url: matchData.matchUrl || matchData.flashscoreUrl || null,
          odds_home: matchData.oddsHome ?? null,
          odds_draw: matchData.oddsDraw ?? null,
          odds_away: matchData.oddsAway ?? null,
        };
      });

      for (const chunk of this._chunkArray(matchRecords, 200)) {
        await db.Match.bulkCreate(chunk, {
          updateOnDuplicate: [
            "match_date",
            "match_time",
            "home_team_id",
            "away_team_id",
            "league_name",
            "is_synced",
            "flashscore_url",
            "odds_home",
            "odds_draw",
            "odds_away",
          ],
        });
      }

      const savedMatches = await db.Match.findAll({
        where: {
          flashscore_id: {
            [Op.in]: matchRecords.map((match) => match.flashscore_id),
          },
        },
        include: [
          { model: db.Team, as: "homeTeam", attributes: ["id", "name"] },
          { model: db.Team, as: "awayTeam", attributes: ["id", "name"] },
        ],
      });

      const savedMatchMap = new Map(
        savedMatches.map((match) => [match.flashscore_id, match.toJSON()]),
      );

      return matchRecords
        .map((record) => savedMatchMap.get(record.flashscore_id))
        .filter(Boolean)
        .map((data) => ({
          id: data.id,
          flashscoreId: data.flashscore_id,
          matchDate: data.match_date,
          matchTime: data.match_time,
          homeTeam: data.homeTeam?.name || "Unknown",
          awayTeam: data.awayTeam?.name || "Unknown",
          homeTeamId: data.home_team_id,
          awayTeamId: data.away_team_id,
          leagueName: data.league_name,
          isSynced: data.is_synced,
          h2hScraped: data.is_synced,
          flashscoreUrl: data.flashscore_url || null,
          oddsHome: data.odds_home != null ? parseFloat(data.odds_home) : null,
          oddsDraw: data.odds_draw != null ? parseFloat(data.odds_draw) : null,
          oddsAway: data.odds_away != null ? parseFloat(data.odds_away) : null,
          status: "scheduled",
        }));
    } catch (error) {
      console.error("Error saving matches:", error);
      throw error;
    }
  }

  /**
   * Get H2H data for a specific match, grouped by section type (with team names)
   * @param {number} parentMatchId - ID of the parent match
   * @returns {Promise<Object>} Object with HOME_FORM, AWAY_FORM, and DIRECT_H2H arrays
   */
  async getH2HData(parentMatchId) {
    try {
      const h2hRecords = await db.H2HHistory.findAll({
        where: { parent_match_id: parentMatchId },
        include: [
          {
            model: db.Team,
            as: "homeTeam",
            attributes: ["id", "name"],
            required: false,
          },
          {
            model: db.Team,
            as: "awayTeam",
            attributes: ["id", "name"],
            required: false,
          },
        ],
        order: [["match_date", "DESC"]],
      });

      // Group by section type
      const grouped = {
        HOME_FORM: [],
        AWAY_FORM: [],
        DIRECT_H2H: [],
      };

      h2hRecords.forEach((record) => {
        const data = record.toJSON();
        const transformed = {
          id: data.id,
          parentMatchId: data.parent_match_id,
          sectionType: data.section_type,
          matchDate: data.match_date,
          homeTeam: data.homeTeam?.name || "Unknown",
          awayTeam: data.awayTeam?.name || "Unknown",
          homeScore: data.home_score,
          awayScore: data.away_score,
          competition: data.competition,
        };

        if (grouped[data.section_type]) {
          grouped[data.section_type].push(transformed);
        }
      });

      return grouped;
    } catch (error) {
      console.error("Error fetching H2H data:", error);
      throw error;
    }
  }

  /**
   * Save H2H history records (converts team names to IDs)
   * @param {Array} h2hArray - Array of H2H record objects with team names
   * @returns {Promise<Array>} Array of saved records
   */
  async saveH2HData(h2hArray) {
    try {
      // Delete any existing rows for this parent match before inserting
      // so re-scrapes produce a clean set rather than appending duplicates
      if (h2hArray.length > 0) {
        const parentMatchId = h2hArray[0].parentMatchId;
        await db.H2HHistory.destroy({
          where: { parent_match_id: parentMatchId },
        });
      }

      const recordsToInsert = [];

      const allTeamNames = h2hArray.flatMap((history) => [
        history.homeTeam,
        history.awayTeam,
      ]);
      const teamMap = await this._resolveTeamsByName(allTeamNames);

      for (const h2hData of h2hArray) {
        const homeTeam = teamMap.get(h2hData.homeTeam);
        const awayTeam = teamMap.get(h2hData.awayTeam);

        recordsToInsert.push({
          parent_match_id: h2hData.parentMatchId,
          section_type: h2hData.sectionType,
          match_date: h2hData.matchDate,
          home_team_id: homeTeam.id,
          away_team_id: awayTeam.id,
          home_score: h2hData.homeScore,
          away_score: h2hData.awayScore,
          competition: h2hData.competition,
        });
      }

      const savedRecords = await db.H2HHistory.bulkCreate(recordsToInsert, {
        ignoreDuplicates: true,
      });

      return savedRecords;
    } catch (error) {
      console.error("Error saving H2H data:", error);
      throw error;
    }
  }

  /**
   * Mark a match as having H2H data scraped
   * @param {number} matchId - Match ID to update
   * @returns {Promise<boolean>} Success status
   */
  async markH2HScraped(matchId) {
    try {
      const match = await db.Match.findByPk(matchId);
      if (!match) {
        throw new Error(`Match with ID ${matchId} not found`);
      }

      await match.update({ is_synced: true });
      return true;
    } catch (error) {
      console.error("Error marking H2H as scraped:", error);
      throw error;
    }
  }

  /**
   * Clear existing H2H data for a match (useful for re-scraping)
   * @param {number} parentMatchId - Parent match ID
   * @returns {Promise<number>} Number of deleted records
   */
  async clearH2HData(parentMatchId) {
    try {
      const deletedCount = await db.H2HHistory.destroy({
        where: { parent_match_id: parentMatchId },
      });

      return deletedCount;
    } catch (error) {
      console.error("Error clearing H2H data:", error);
      throw error;
    }
  }

  /**
   * Get a single match by ID with team names
   * @param {number} matchId - Match ID
   * @returns {Promise<Object>} Match instance with team names
   */
  async getMatchById(matchId) {
    try {
      const match = await db.Match.findByPk(matchId, {
        include: [
          {
            model: db.Team,
            as: "homeTeam",
            attributes: ["id", "name"],
            required: false,
          },
          {
            model: db.Team,
            as: "awayTeam",
            attributes: ["id", "name"],
            required: false,
          },
        ],
      });

      if (!match) return null;

      const data = match.toJSON();
      return {
        id: data.id,
        flashscoreId: data.flashscore_id,
        matchDate: data.match_date,
        matchTime: data.match_time,
        homeTeam: data.homeTeam?.name || "Unknown",
        awayTeam: data.awayTeam?.name || "Unknown",
        homeTeamId: data.home_team_id,
        awayTeamId: data.away_team_id,
        leagueName: data.league_name,
        isSynced: data.is_synced,
        h2hScraped: data.is_synced,
        flashscoreUrl: data.flashscore_url || null,
        oddsHome: data.odds_home != null ? parseFloat(data.odds_home) : null,
        oddsDraw: data.odds_draw != null ? parseFloat(data.odds_draw) : null,
        oddsAway: data.odds_away != null ? parseFloat(data.odds_away) : null,
        status: "scheduled", // Default status for scraped matches
      };
    } catch (error) {
      console.error("Error fetching match by ID:", error);
      throw error;
    }
  }

  /**
   * Get match by FlashScore ID with team names
   * @param {string} flashscoreId - FlashScore match identifier
   * @returns {Promise<Object>} Match instance with team names
   */
  async getMatchByFlashscoreId(flashscoreId) {
    try {
      const match = await db.Match.findOne({
        where: { flashscore_id: flashscoreId },
        include: [
          {
            model: db.Team,
            as: "homeTeam",
            attributes: ["id", "name"],
            required: false,
          },
          {
            model: db.Team,
            as: "awayTeam",
            attributes: ["id", "name"],
            required: false,
          },
        ],
      });

      if (!match) return null;

      const data = match.toJSON();
      return {
        id: data.id,
        flashscoreId: data.flashscore_id,
        matchDate: data.match_date,
        matchTime: data.match_time,
        homeTeam: data.homeTeam?.name || "Unknown",
        awayTeam: data.awayTeam?.name || "Unknown",
        homeTeamId: data.home_team_id,
        awayTeamId: data.away_team_id,
        leagueName: data.league_name,
        isSynced: data.is_synced,
        h2hScraped: data.is_synced,
      };
    } catch (error) {
      console.error("Error fetching match by FlashScore ID:", error);
      throw error;
    }
  }

  /**
   * Delete all matches that have already started, plus their H2H rows and
   * any teams orphaned by those deletions.
   * Deletion order respects FK constraints:
   *   1. h2h_history (references matches)
   *   2. matches
   *   3. teams orphaned after the above deletions
   * A same-day match is deleted once its kickoff time is before the server's
   * current time. If a match has no stored time, it is only deleted when its
   * date is before today.
   * @param {Date|string} cutoff - Server timestamp used as the "already started" cutoff
   * @returns {Promise<{h2hDeleted: number, matchesDeleted: number, teamsDeleted: number}>}
   */
  async cleanupStaleData(cutoff = new Date()) {
    const effectiveCutoff =
      cutoff instanceof Date ? new Date(cutoff) : new Date(cutoff);

    if (Number.isNaN(effectiveCutoff.getTime())) {
      throw new Error("Invalid cleanup cutoff supplied");
    }

    const cutoffDate = this._formatLocalDate(effectiveCutoff);
    const cutoffTime = this._formatLocalTime(effectiveCutoff);

    try {
      // Step 1: find IDs of all matches that have already started by the
      // current server timestamp.
      const staleMatches = await db.Match.findAll({
        attributes: ["id", "match_date", "match_time"],
      });

      const staleMatchIds = staleMatches
        .filter((match) => {
          const matchDate = this._normalizeDateOnly(match.match_date);
          const matchTime = this._normalizeTimeOnly(match.match_time);

          if (!matchDate) {
            return false;
          }

          if (matchDate < cutoffDate) {
            return true;
          }

          if (matchDate > cutoffDate) {
            return false;
          }

          if (!matchTime) {
            return false;
          }

          return matchTime < cutoffTime;
        })
        .map((match) => match.id);

      let h2hDeleted = 0;
      let matchesDeleted = 0;

      if (staleMatchIds.length > 0) {
        // Step 2: delete h2h_history rows that belong to those matches
        h2hDeleted = await db.H2HHistory.destroy({
          where: { parent_match_id: { [Op.in]: staleMatchIds } },
        });

        // Step 3: delete the stale matches themselves
        matchesDeleted = await db.Match.destroy({
          where: { id: { [Op.in]: staleMatchIds } },
        });
      }

      // Step 4: delete teams no longer referenced in matches or h2h_history
      const referencedTeamIds = await db.sequelize.query(
        `SELECT DISTINCT id FROM teams WHERE
           id IN (SELECT home_team_id FROM matches WHERE home_team_id IS NOT NULL)
        OR id IN (SELECT away_team_id FROM matches WHERE away_team_id IS NOT NULL)
        OR id IN (SELECT home_team_id FROM h2h_history WHERE home_team_id IS NOT NULL)
        OR id IN (SELECT away_team_id FROM h2h_history WHERE away_team_id IS NOT NULL)`,
        { type: db.sequelize.QueryTypes.SELECT },
      );

      const referencedIds = referencedTeamIds.map((r) => r.id);

      let teamsDeleted = 0;
      if (referencedIds.length > 0) {
        teamsDeleted = await db.Team.destroy({
          where: { id: { [Op.notIn]: referencedIds } },
        });
      } else {
        // No references at all — delete every team (plain DELETE, TRUNCATE is blocked by FK constraints)
        teamsDeleted = await db.Team.destroy({ where: {} });
      }

      console.log(
        `Started-match cleanup complete at ${cutoffDate} ${cutoffTime} - h2h_history: ${h2hDeleted} rows, matches: ${matchesDeleted} rows, teams: ${teamsDeleted} rows deleted`,
      );

      return { h2hDeleted, matchesDeleted, teamsDeleted };
    } catch (error) {
      console.error("Error during started-match cleanup:", error);
      throw error;
    }
  }
}

module.exports = DatabaseService;
