const db = require("../models");

/**
 * POST /tickets
 * Body: { matchDate, teamsPerTicket, tickets: [[predictionObj, ...], ...] }
 */
async function saveTickets(req, res) {
  const { matchDate, teamsPerTicket, tickets } = req.body;

  if (!matchDate || !Array.isArray(tickets) || tickets.length === 0) {
    return res
      .status(400)
      .json({ success: false, error: "matchDate and tickets[] are required" });
  }

  const t = await db.sequelize.transaction();
  try {
    const batch = await db.SavedTicketBatch.create(
      {
        match_date: matchDate,
        ticket_count: tickets.length,
        teams_per_ticket: teamsPerTicket || 0,
      },
      { transaction: t },
    );

    const items = [];
    tickets.forEach((ticket, ticketIdx) => {
      ticket.forEach((p, posIdx) => {
        items.push({
          batch_id: batch.id,
          ticket_number: ticketIdx + 1,
          position: posIdx + 1,
          home_team: p.homeTeam,
          away_team: p.awayTeam,
          predicted_winner: p.predictedWinner,
          league_name: p.leagueName || null,
          match_date: p.matchDate || null,
          match_time: p.matchTime || null,
          odds_home: p.oddsHome != null ? p.oddsHome : null,
          odds_draw: p.oddsDraw != null ? p.oddsDraw : null,
          odds_away: p.oddsAway != null ? p.oddsAway : null,
        });
      });
    });

    await db.SavedTicketItem.bulkCreate(items, { transaction: t });
    await t.commit();

    return res.json({ success: true, batchId: batch.id });
  } catch (err) {
    await t.rollback();
    console.error("Error saving tickets:", err);
    return res
      .status(500)
      .json({ success: false, error: "Failed to save tickets" });
  }
}

/**
 * GET /tickets
 * Returns all batches (newest first), no items.
 */
async function getTicketBatches(req, res) {
  try {
    const batches = await db.SavedTicketBatch.findAll({
      order: [["saved_at", "DESC"]],
    });
    return res.json({ success: true, data: batches });
  } catch (err) {
    console.error("Error fetching ticket batches:", err);
    return res
      .status(500)
      .json({ success: false, error: "Failed to fetch ticket batches" });
  }
}

/**
 * GET /tickets/:batchId
 * Returns one batch with its items grouped back into ticket arrays.
 */
async function getTicketBatch(req, res) {
  const { batchId } = req.params;
  try {
    const batch = await db.SavedTicketBatch.findByPk(batchId);
    if (!batch) {
      return res.status(404).json({ success: false, error: "Batch not found" });
    }

    const items = await db.SavedTicketItem.findAll({
      where: { batch_id: batchId },
      order: [
        ["ticket_number", "ASC"],
        ["position", "ASC"],
      ],
    });

    // Group flat rows back into [[ticket1matches], [ticket2matches], ...]
    const ticketMap = {};
    items.forEach((item) => {
      const d = item.toJSON();
      if (!ticketMap[d.ticket_number]) ticketMap[d.ticket_number] = [];
      ticketMap[d.ticket_number].push({
        homeTeam: d.home_team,
        awayTeam: d.away_team,
        predictedWinner: d.predicted_winner,
        leagueName: d.league_name,
        matchDate: d.match_date,
        matchTime: d.match_time,
        oddsHome: d.odds_home != null ? parseFloat(d.odds_home) : null,
        oddsDraw: d.odds_draw != null ? parseFloat(d.odds_draw) : null,
        oddsAway: d.odds_away != null ? parseFloat(d.odds_away) : null,
      });
    });

    const tickets = Object.keys(ticketMap)
      .sort((a, b) => Number(a) - Number(b))
      .map((k) => ticketMap[k]);

    return res.json({
      success: true,
      data: { batch: batch.toJSON(), tickets },
    });
  } catch (err) {
    console.error("Error fetching ticket batch:", err);
    return res
      .status(500)
      .json({ success: false, error: "Failed to fetch ticket batch" });
  }
}

/**
 * DELETE /tickets/:batchId
 * Deletes a saved batch and all its items (CASCADE).
 */
async function deleteTicketBatch(req, res) {
  const { batchId } = req.params;
  try {
    const deleted = await db.SavedTicketBatch.destroy({
      where: { id: batchId },
    });
    if (!deleted) {
      return res.status(404).json({ success: false, error: "Batch not found" });
    }
    return res.json({ success: true });
  } catch (err) {
    console.error("Error deleting ticket batch:", err);
    return res
      .status(500)
      .json({ success: false, error: "Failed to delete ticket batch" });
  }
}

module.exports = {
  saveTickets,
  getTicketBatches,
  getTicketBatch,
  deleteTicketBatch,
};
