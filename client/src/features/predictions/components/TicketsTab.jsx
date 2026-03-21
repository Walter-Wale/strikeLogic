import React from "react";
import { Box, Grid, Typography } from "@mui/material";
import { useTickets } from "../hooks/useTickets";
import TicketCard from "./TicketCard";
import TicketControls from "./TicketControls";
import TicketSummary from "./TicketSummary";

export default function TicketsTab({
  winnerPredictions = [],
  over15Predictions = [],
  over25Predictions = [],
  matchDate,
  onSaved,
}) {
  const ticketState = useTickets({
    winnerPredictions,
    over15Predictions,
    over25Predictions,
    matchDate,
    onSaved,
  });

  const { noData, tickets, playedTicketIndices, togglePlayedTicket } =
    ticketState;

  return (
    <Box sx={{ pt: 2 }}>
      <TicketControls
        {...ticketState}
        winnerPredictions={winnerPredictions}
        over15Predictions={over15Predictions}
        over25Predictions={over25Predictions}
      />

      {noData && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ textAlign: "center", py: 6 }}
        >
          No ticket picks available. Run predictions first or enable goal
          markets.
        </Typography>
      )}

      {!noData && tickets.length === 0 && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ textAlign: "center", py: 6 }}
        >
          Press <strong>Randomize</strong> or <strong>Multi Randomize</strong>{" "}
          to generate betting tickets. The same match will never appear twice in
          the same ticket, even across different markets.
        </Typography>
      )}

      {tickets.length > 0 && (
        <>
          <TicketSummary tickets={tickets} />
          <Grid container spacing={2}>
            {tickets.map((matches, idx) => (
              <Grid item xs={12} sm={6} md={4} key={idx}>
                <TicketCard
                  matches={matches}
                  idx={idx}
                  isPlayed={playedTicketIndices.has(idx)}
                  onTogglePlayed={() => togglePlayedTicket(idx)}
                />
              </Grid>
            ))}
          </Grid>
        </>
      )}
    </Box>
  );
}
