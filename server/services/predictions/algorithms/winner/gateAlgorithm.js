function passesGateSystem({
  formWins,
  formLosses,
  h2hHomeWins,
  h2hTotalLosses,
}) {
  if (formWins < 4 || formLosses > 4) return false;
  if (h2hTotalLosses > 3 || h2hHomeWins < 2) return false;
  return true;
}

module.exports = { passesGateSystem };
