/**
 * Socket.io Service
 * Handles real-time communication with the server
 */

import { io } from "socket.io-client";

// Create socket connection (singleton pattern)
let socket = null;

/**
 * Initialize socket connection
 * @returns {Socket} Socket instance
 */
export function initializeSocket() {
  if (!socket) {
    socket = io("http://localhost:5000", {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socket.on("connect", () => {
      console.log("✓ Socket.io connected:", socket.id);
    });

    socket.on("disconnect", (reason) => {
      console.log("✗ Socket.io disconnected:", reason);
    });

    socket.on("connect_error", (error) => {
      console.error("Socket.io connection error:", error);
    });
  }

  return socket;
}

/**
 * Subscribe to scraper logs
 * @param {Function} callback - Callback function to handle log data
 * @returns {Function} Unsubscribe function
 */
export function subscribeToLogs(callback) {
  const socketInstance = initializeSocket();

  const handleLog = (logData) => {
    // logData shape: { message: string, type: string, timestamp: string }
    callback(logData);
  };

  socketInstance.on("scraper-log", handleLog);

  // Return unsubscribe function
  return () => {
    socketInstance.off("scraper-log", handleLog);
  };
}

/**
 * Unsubscribe from all log listeners
 */
export function unsubscribeFromLogs() {
  if (socket) {
    socket.off("scraper-log");
  }
}

/**
 * Disconnect socket
 */
export function disconnect() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

/**
 * Get current socket instance
 * @returns {Socket|null} Socket instance or null
 */
export function getSocket() {
  return socket;
}

/**
 * Check if socket is connected
 * @returns {boolean} Connection status
 */
export function isConnected() {
  return socket?.connected || false;
}
