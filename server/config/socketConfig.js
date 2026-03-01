/**
 * Socket.io Configuration
 * Initializes Socket.io server with CORS settings
 */

const { Server } = require("socket.io");

/**
 * Initialize Socket.io server
 * @param {http.Server} httpServer - HTTP server instance from Express
 * @returns {SocketIO.Server} Configured Socket.io instance
 */
function initializeSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  io.on("connection", (socket) => {
    console.log(`Client connected: ${socket.id}`);

    socket.on("disconnect", () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

module.exports = { initializeSocket };
