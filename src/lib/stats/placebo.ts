// Placebo test: shift the campaign date backward into the pre-period and
// see whether the model still detects a "fake" effect. If it does, the
// real estimate is suspect.

import type { ParsedRow } from "./validation";
import type { CovariateRow } from "./its";
import { fitOLS, meanPredictionSE } from "./ols";
import { detectCadence } from "./period";
import { type Mat, type Vec } from "./linalg";

export interface PlaceboPoint {
  shift_rows: number;
  effect: number;
  se: number;
  ci_low: number;
  ci_high: number;
}

interface PlaceboOpts {
  campaignIdx: number; // index of true campaign start in rows
  covValues: number[][]; // per-row covariate vector (already aligned)
  shifts?: number[];
  // Optional callback for progress updates (UI uses this for the progress bar)
  onProgress?: (done: number, total: number) => void;
}

const buildRow = (t: number, period: number, cov: number[]): number[] => [
  1,
  t,
  Math.sin((2 * Math.PI * t) / period),
  Math.cos((2 * Math.PI * t) / period),
  ...cov,
];

export const runPlaceboTests = async (
  rows: ParsedRow[],
  opts: PlaceboOpts,
): Promise<PlaceboPoint[]> => {
  const cadence = detectCadence(rows.map((r) => r.date));
  const { period } = cadence;
  const shifts = opts.shifts ?? [5, 10, 15, 20, 25, 30, 35, 40, 45, 50];
  const results: PlaceboPoint[] = [];

  for (let s = 0; s < shifts.length; s++) {
    const shift = shifts[s];
    const fakeStart = opts.campaignIdx - shift;
    if (fakeStart < 20) {
      // Not enough pre-rows for this placebo; skip with NaN
      results.push({
        shift_rows: shift,
        effect: NaN,
        se: NaN,
        ci_low: NaN,
        ci_high: NaN,
      });
      opts.onProgress?.(s + 1, shifts.length);
      // Yield to event loop so the UI can paint the progress bar
      await new Promise((r) => setTimeout(r, 0));
      continue;
    }

    // Fit on rows [0, fakeStart)
    const X: Mat = [];
    const y: Vec = [];
    for (let i = 0; i < fakeStart; i++) {
      X.push(buildRow(i + 1, period, opts.covValues[i]));
      y.push(rows[i].y);
    }
    try {
      const fit = fitOLS(X, y);
      // Pseudo-post window: same length as if real campaign had occurred at fakeStart,
      // bounded so we don't overlap the real campaign (the data after the real
      // campaign would contaminate the placebo). Use [fakeStart, opts.campaignIdx).
      const postEnd = opts.campaignIdx;
      if (postEnd - fakeStart < 3) {
        results.push({
          shift_rows: shift,
          effect: NaN,
          se: NaN,
          ci_low: NaN,
          ci_high: NaN,
        });
      } else {
        const Xpost: Mat = [];
        let sum = 0;
        let cnt = 0;
        for (let i = fakeStart; i < postEnd; i++) {
          const xi = buildRow(i + 1, period, opts.covValues[i]);
          Xpost.push(xi);
          let pred = 0;
          for (let j = 0; j < xi.length; j++) pred += xi[j] * fit.beta[j];
          sum += rows[i].y - pred;
          cnt++;
        }
        const mean = sum / cnt;
        const se = meanPredictionSE(fit, Xpost);
        results.push({
          shift_rows: shift,
          effect: mean,
          se,
          ci_low: mean - 1.96 * se,
          ci_high: mean + 1.96 * se,
        });
      }
    } catch {
      results.push({
        shift_rows: shift,
        effect: NaN,
        se: NaN,
        ci_low: NaN,
        ci_high: NaN,
      });
    }

    opts.onProgress?.(s + 1, shifts.length);
    await new Promise((r) => setTimeout(r, 0)); // keep UI responsive
  }
  return results;
};
