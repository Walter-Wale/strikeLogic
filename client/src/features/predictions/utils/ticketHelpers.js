export function getTicketMatchKey(prediction) {
  return (
    prediction.matchId ??
    `${prediction.homeTeam}-${prediction.awayTeam}-${prediction.matchDate}-${prediction.matchTime}`
  );
}

export function createTicketBucket() {
  return {
    picks: [],
    usedMatchIds: new Set(),
  };
}

export function addPredictionToTicket(ticket, prediction) {
  ticket.picks.push(prediction);
  ticket.usedMatchIds.add(getTicketMatchKey(prediction));
}

export function countMarketPicks(ticket, market) {
  return ticket.picks.filter((pick) => pick.ticketMarket === market).length;
}
