import { useEffect } from "react";
import {
  initializeSocket,
  disconnect,
  subscribeToH2HSynced,
  subscribeToLogs,
} from "../../../services/socketService";
import { fetchMatchById } from "../../../services/apiService";
import { H2H_CHAIN_COMPLETE_MSG } from "../../../constants/messages";

/**
 * Manages the socket connection and real-time H2H sync events.
 * @param {Function} setAllMatches
 * @param {Function} setChainCompleteDetected
 */
function useH2HSocket(setAllMatches, setChainCompleteDetected) {
  useEffect(() => {
    initializeSocket();

    // Real-time H2H sync: mark individual matches as synced when server notifies us.
    // If the match isn't in state yet, fetch it from the server and append it.
    const unsubscribeH2H = subscribeToH2HSynced(({ matchId }) => {
      setAllMatches((prev) => {
        const exists = prev.some((m) => m.id === matchId);
        if (exists) {
          return prev.map((m) =>
            m.id === matchId ? { ...m, h2hScraped: true, isSynced: true } : m,
          );
        }
        // Match not yet in table — fetch and append
        fetchMatchById(matchId)
          .then((res) => {
            if (res.success && res.data) {
              setAllMatches((latest) => {
                if (latest.some((m) => m.id === matchId)) return latest;
                return [
                  ...latest,
                  { ...res.data, h2hScraped: true, isSynced: true },
                ];
              });
            }
          })
          .catch(() => {});
        return prev;
      });
    });

    // Detect H2H chain completion: enable the Run Predictions button
    const unsubscribeLogs = subscribeToLogs(({ message }) => {
      if (message && message.includes(H2H_CHAIN_COMPLETE_MSG)) {
        setChainCompleteDetected(true);
      }
    });

    return () => {
      unsubscribeH2H();
      unsubscribeLogs();
      disconnect();
    };
  }, []);
}

export default useH2HSocket;
