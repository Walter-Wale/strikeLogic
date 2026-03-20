import {
  getTicketMatchKey,
  createTicketBucket,
  addPredictionToTicket,
  countMarketPicks,
} from "./ticketHelpers";

export function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function buildPool(predictions, maxAppearances) {
  const pool = [];
  for (let i = 0; i < Math.max(1, maxAppearances); i++) {
    pool.push(...predictions);
  }
  return pool;
}

export function buildTicketPredictions({
  winnerPredictions,
  over15Predictions,
  over25Predictions,
  includeOver15,
  includeOver25,
}) {
  const pool = winnerPredictions.map((prediction) => ({
    ...prediction,
    ticketMarket: "winner",
  }));

  if (includeOver15) {
    pool.push(
      ...over15Predictions.map((prediction) => ({
        ...prediction,
        predictedWinner: "Over 1.5",
        ticketMarket: "over15",
      })),
    );
  }

  if (includeOver25) {
    pool.push(
      ...over25Predictions.map((prediction) => ({
        ...prediction,
        predictedWinner: "Over 2.5",
        ticketMarket: "over25",
      })),
    );
  }

  return pool;
}

export function placePredictionsAcrossTickets(
  tickets,
  predictions,
  ticketSize,
  sorter,
) {
  predictions.forEach((prediction) => {
    const matchKey = getTicketMatchKey(prediction);

    const eligibleTickets = tickets.filter(
      (ticket) =>
        ticket.picks.length < ticketSize && !ticket.usedMatchIds.has(matchKey),
    );

    if (eligibleTickets.length > 0) {
      eligibleTickets.sort(sorter);
      addPredictionToTicket(eligibleTickets[0], prediction);
      return;
    }

    const overflowTicket = createTicketBucket();
    addPredictionToTicket(overflowTicket, prediction);
    tickets.push(overflowTicket);
  });
}

export function buildTickets(pool, size) {
  const ticketSize = Math.max(1, size);
  if (pool.length === 0) return [];

  const initialTicketCount = Math.max(1, Math.ceil(pool.length / ticketSize));
  const tickets = Array.from({ length: initialTicketCount }, () =>
    createTicketBucket(),
  );
  const marketPlacementOrder = ["winner", "over15", "over25"];

  marketPlacementOrder.forEach((market) => {
    const marketPredictions = pool.filter(
      (prediction) => prediction.ticketMarket === market,
    );

    if (marketPredictions.length === 0) {
      return;
    }

    placePredictionsAcrossTickets(
      tickets,
      marketPredictions,
      ticketSize,
      (left, right) =>
        countMarketPicks(left, market) - countMarketPicks(right, market) ||
        left.picks.length - right.picks.length,
    );
  });

  return tickets
    .map((ticket) => ticket.picks)
    .filter((ticket) => ticket.length > 0);
}
