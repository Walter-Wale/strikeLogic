export function getTicketPickMeta(prediction) {
  if (
    prediction.predictedWinner &&
    (prediction.predictedWinner === prediction.homeTeam ||
      prediction.predictedWinner === prediction.awayTeam)
  ) {
    return {
      label: `Winner: ${prediction.predictedWinner}`,
      color: "success",
      variant: "filled",
    };
  }

  if (prediction.predictedWinner === "Over 1.5") {
    return { label: "Over 1.5", color: "info", variant: "outlined" };
  }

  if (prediction.predictedWinner === "Over 2.5") {
    return { label: "Over 2.5", color: "warning", variant: "outlined" };
  }

  return {
    label: prediction.predictedWinner || "Pick",
    color: "default",
    variant: "outlined",
  };
}
