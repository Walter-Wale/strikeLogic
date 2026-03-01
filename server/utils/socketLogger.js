/**
 * Socket.io Logger Utility
 * Emits real-time log messages to connected clients
 */

/**
 * Emit a log message to all connected clients
 * @param {SocketIO.Server} io - Socket.io server instance
 * @param {string} message - Log message to emit
 * @param {string} type - Log type: 'info', 'success', 'warning', 'error'
 */
function emitLog(io, message, type = "info") {
  const logData = {
    message,
    type,
    timestamp: new Date().toISOString(),
  };

  // Emit to all connected clients
  if (io && typeof io.emit === "function") {
    io.emit("scraper-log", logData);
  }

  // Also log to console for server-side debugging
  const consoleMethod =
    type === "error" ? "error" : type === "warning" ? "warn" : "log";
  console[consoleMethod](`[${type.toUpperCase()}] ${message}`);
}

module.exports = { emitLog };
