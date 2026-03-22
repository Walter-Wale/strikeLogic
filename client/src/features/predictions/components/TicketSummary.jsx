import React from "react";
import { Alert } from "@mui/material";

function getMarketDistributionSummary(tickets, market) {
  if (tickets.length === 0) return null;

  const winnerCounts = tickets.map(
    (ticket) => ticket.filter((pick) => pick.ticketMarket === market).length,
  );
  const totalWinners = winnerCounts.reduce((sum, count) => sum + count, 0);

  return {
    totalPicks: totalWinners,
    minimum: Math.min(...winnerCounts),
    maximum: Math.max(...winnerCounts),
    average: totalWinners / tickets.length,
    ticketCount: tickets.length,
  };
}

function TicketSummary({ tickets }) {
  const winnerDistribution = getMarketDistributionSummary(tickets, "winner");
  const over15Distribution = getMarketDistributionSummary(tickets, "over15");
  const over25Distribution = getMarketDistributionSummary(tickets, "over25");
  const bttsDistribution = getMarketDistributionSummary(tickets, "btts");

  return (
    <>
      {winnerDistribution && winnerDistribution.totalPicks > 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Match winner picks are distributed across{" "}
          {winnerDistribution.ticketCount} ticket
          {winnerDistribution.ticketCount !== 1 ? "s" : ""}: min{" "}
          {winnerDistribution.minimum}, max {winnerDistribution.maximum},
          average {winnerDistribution.average.toFixed(1)} per ticket.
        </Alert>
      )}
      {over15Distribution && over15Distribution.totalPicks > 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Over 1.5 picks are distributed across {over15Distribution.ticketCount}{" "}
          ticket
          {over15Distribution.ticketCount !== 1 ? "s" : ""}: min{" "}
          {over15Distribution.minimum}, max {over15Distribution.maximum},
          average {over15Distribution.average.toFixed(1)} per ticket.
        </Alert>
      )}
      {over25Distribution && over25Distribution.totalPicks > 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Over 2.5 picks are distributed across {over25Distribution.ticketCount}{" "}
          ticket
          {over25Distribution.ticketCount !== 1 ? "s" : ""}: min{" "}
          {over25Distribution.minimum}, max {over25Distribution.maximum},
          average {over25Distribution.average.toFixed(1)} per ticket.
        </Alert>
      )}
      {bttsDistribution && bttsDistribution.totalPicks > 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          BTTS picks are distributed across {bttsDistribution.ticketCount}{" "}
          ticket
          {bttsDistribution.ticketCount !== 1 ? "s" : ""}: min{" "}
          {bttsDistribution.minimum}, max {bttsDistribution.maximum}, average{" "}
          {bttsDistribution.average.toFixed(1)} per ticket.
        </Alert>
      )}
    </>
  );
}

export default TicketSummary;
