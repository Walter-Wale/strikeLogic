/**
 * Express Application Setup
 * Configures middleware and routes
 */

const express = require("express");
const cors = require("cors");

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Import routes
const matchesRoutes = require("./routes/matches");
const h2hRoutes = require("./routes/h2h");
const predictionsRoutes = require("./routes/predictions");

// Mount routes
app.use(matchesRoutes);
app.use(h2hRoutes);
app.use(predictionsRoutes);

// Health check endpoint
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "StrikeLogic API Server is running",
    version: "1.0.0",
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint not found",
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Global error handler:", err);
  res.status(500).json({
    success: false,
    error: "Internal server error",
    message: err.message,
  });
});

module.exports = app;
