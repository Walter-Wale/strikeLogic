const express = require("express");
const router = express.Router();
const {
  saveTickets,
  getTicketBatches,
  getTicketBatch,
  deleteTicketBatch,
} = require("../controllers/ticketsController");

router.post("/tickets", saveTickets);
router.get("/tickets", getTicketBatches);
router.get("/tickets/:batchId", getTicketBatch);
router.delete("/tickets/:batchId", deleteTicketBatch);

module.exports = router;
