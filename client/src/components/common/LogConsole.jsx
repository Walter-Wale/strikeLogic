/**
 * LogConsole Component
 * Displays real-time scraper logs in a terminal-style interface
 */

import React, { useState, useEffect, useRef } from "react";
import { Paper, Box, Typography } from "@mui/material";
import {
  subscribeToLogs,
  unsubscribeFromLogs,
} from "../../services/socketService";

const LogConsole = () => {
  const [logs, setLogs] = useState([]);
  const logContainerRef = useRef(null);

  useEffect(() => {
    // Subscribe to logs when component mounts
    const unsubscribe = subscribeToLogs((logData) => {
      setLogs((prevLogs) => {
        // Keep only last 100 logs to prevent memory issues
        const newLogs = [
          ...prevLogs,
          { ...logData, id: Date.now() + Math.random() },
        ];
        if (newLogs.length > 100) {
          return newLogs.slice(-100);
        }
        return newLogs;
      });
    });

    // Cleanup on unmount
    return () => {
      unsubscribe();
      unsubscribeFromLogs();
    };
  }, []);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  // Get color based on log type
  const getLogColor = (type) => {
    switch (type) {
      case "success":
        return "#4ec9b0";
      case "error":
        return "#f48771";
      case "warning":
        return "#dcdcaa";
      case "info":
      default:
        return "#9cdcfe";
    }
  };

  // Format timestamp
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <Paper
      elevation={3}
      sx={{
        bgcolor: "#1e1e1e",
        color: "#d4d4d4",
        p: 2,
        borderRadius: 2,
      }}
    >
      <Typography
        variant="h6"
        sx={{
          mb: 1,
          fontFamily: "monospace",
          fontSize: "0.9rem",
          color: "#569cd6",
          borderBottom: "1px solid #3e3e42",
          pb: 1,
        }}
      >
        📊 Scraper Console
      </Typography>

      <Box
        ref={logContainerRef}
        sx={{
          maxHeight: 400,
          overflowY: "auto",
          fontFamily: 'Consolas, Monaco, "Courier New", monospace',
          fontSize: "0.875rem",
          lineHeight: 1.6,
          "&::-webkit-scrollbar": {
            width: "8px",
          },
          "&::-webkit-scrollbar-track": {
            background: "#252526",
          },
          "&::-webkit-scrollbar-thumb": {
            background: "#3e3e42",
            borderRadius: "4px",
          },
          "&::-webkit-scrollbar-thumb:hover": {
            background: "#515151",
          },
        }}
      >
        {logs.length === 0 ? (
          <Typography
            sx={{
              color: "#6a6a6a",
              fontStyle: "italic",
              fontFamily: "monospace",
            }}
          >
            Waiting for activity...
          </Typography>
        ) : (
          logs.map((log) => (
            <Box
              key={log.id}
              sx={{
                mb: 0.5,
                display: "flex",
                gap: 1,
              }}
            >
              <Typography
                component="span"
                sx={{
                  color: "#6a6a6a",
                  fontFamily: "inherit",
                  fontSize: "inherit",
                  minWidth: "70px",
                }}
              >
                [{formatTime(log.timestamp)}]
              </Typography>
              <Typography
                component="span"
                sx={{
                  color: getLogColor(log.type),
                  fontFamily: "inherit",
                  fontSize: "inherit",
                  flex: 1,
                }}
              >
                {log.message}
              </Typography>
            </Box>
          ))
        )}
      </Box>
    </Paper>
  );
};

export default LogConsole;
