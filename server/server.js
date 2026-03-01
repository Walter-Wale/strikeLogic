/**
 * Server Entry Point
 * Initializes database, Socket.io, and starts HTTP server
 */

const http = require("http");
const app = require("./app");
const db = require("./models");
const { initializeSocket } = require("./config/socketConfig");

const PORT = process.env.PORT || 5000;

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io
const io = initializeSocket(server);

// Store io instance in app for access in controllers
app.set("io", io);

// Sync database and start server
// alter:true adds new columns (like flashscore_url) without dropping existing data
db.sequelize
  .sync({ alter: true })
  .then(() => {
    console.log("✓ Database synced successfully");
    console.log("✓ Tables: leagues, matches, h2h_history");

    // Start server on all interfaces
    server.listen(PORT, "0.0.0.0", () => {
      console.log(`\n========================================`);
      console.log(`  StrikeLogic Server Running`);
      console.log(`========================================`);
      console.log(`  Local:    http://localhost:${PORT}`);
      console.log(`  Network:  http://0.0.0.0:${PORT}`);
      console.log(`  Database: ${db.sequelize.config.database}`);
      console.log(`========================================\n`);
    });
  })
  .catch((error) => {
    console.error("✗ Unable to sync database:", error);
    process.exit(1);
  });

// Handle graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received. Closing server gracefully...");
  server.close(() => {
    console.log("Server closed");
    db.sequelize.close();
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("\nSIGINT received. Closing server gracefully...");
  server.close(() => {
    console.log("Server closed");
    db.sequelize.close();
    process.exit(0);
  });
});
