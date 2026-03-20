import { compareGoalPredictions } from "./ticketSorting";

export function normalizePercentage(value, fallback = 20) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(100, Math.max(1, parsed));
}

export function selectTopPercentage(predictions, percentage) {
  if (predictions.length === 0) return [];

  const normalizedPercentage = normalizePercentage(percentage, 20);
  const keepCount = Math.max(
    1,
    Math.ceil((predictions.length * normalizedPercentage) / 100),
  );

  return [...predictions].sort(compareGoalPredictions).slice(0, keepCount);
}
