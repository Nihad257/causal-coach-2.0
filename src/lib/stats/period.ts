// Detect daily / weekly / monthly cadence from a sorted ascending date list.
// Returns the seasonal period to use in sin/cos terms.

export type Cadence = "daily" | "weekly" | "monthly" | "irregular";

export const detectCadence = (
  dates: Date[],
): { cadence: Cadence; period: number; medianDeltaDays: number } => {
  if (dates.length < 2) {
    return { cadence: "irregular", period: 7, medianDeltaDays: 1 };
  }
  const deltas: number[] = [];
  for (let i = 1; i < dates.length; i++) {
    deltas.push((dates[i].getTime() - dates[i - 1].getTime()) / 86_400_000);
  }
  deltas.sort((a, b) => a - b);
  const median = deltas[Math.floor(deltas.length / 2)];

  if (median <= 1.5) return { cadence: "daily", period: 7, medianDeltaDays: median };
  if (median >= 6 && median <= 8) return { cadence: "weekly", period: 52, medianDeltaDays: median };
  if (median >= 27 && median <= 32) return { cadence: "monthly", period: 12, medianDeltaDays: median };
  // Fall back to weekly seasonality if cadence is unusual.
  return { cadence: "irregular", period: Math.max(4, Math.round(median)), medianDeltaDays: median };
};
