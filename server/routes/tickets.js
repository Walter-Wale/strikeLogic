const express = require("express");
const router = express.Router();
const {
  saveTickets,
  getTicketBatches,
  getTicketBatch,
  deleteTicketBatch,
  getPlayedMatches,
} = require("../controllers/ticketsController");

router.post("/tickets", saveTickets);
router.get("/tickets", getTicketBatches);
router.get("/tickets/played-matches", getPlayedMatches);
router.get("/tickets/:batchId", getTicketBatch);
router.delete("/tickets/:batchId", deleteTicketBatch);

module.exports = router;
