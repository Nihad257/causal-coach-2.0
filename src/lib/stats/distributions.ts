// Normal CDF (Abramowitz & Stegun approximation) and helpers.

export const normalCDF = (z: number): number => {
  // High-accuracy approximation using erf.
  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.SQRT2;
  // Abramowitz & Stegun 7.1.26
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const t = 1.0 / (1.0 + p * x);
  const y =
    1.0 -
    ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  const erf = sign * y;
  return 0.5 * (1 + erf);
};

// Probability that the true effect is > 0 given normal-approx sampling.
export const probGreaterZero = (estimate: number, se: number): number => {
  if (se <= 0 || !Number.isFinite(se)) return estimate > 0 ? 1 : 0;
  return normalCDF(estimate / se);
};

// Two-sided 95% CI using z = 1.96 (HC3 is asymptotic — normal is appropriate).
export const ci95 = (estimate: number, se: number): [number, number] => [
  estimate - 1.96 * se,
  estimate + 1.96 * se,
];
