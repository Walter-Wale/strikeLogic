const express = require("express");
const router = express.Router();
const { getPredictions } = require("../controllers/predictionsController");

router.get("/predictions", getPredictions);

module.exports = router;
