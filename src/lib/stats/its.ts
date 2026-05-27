// Interrupted Time Series model — fits OLS on pre-campaign rows only,
// then predicts the counterfactual for the post-campaign period.
//
//   y_t = β0 + β1·time + β2·sin(2π·t/P) + β3·cos(2π·t/P) (+ covariates) + ε
//
// All covariance is HC3-robust. Supports multiple campaigns by adding
// per-campaign post dummies + time-since-campaign slope changes when
// predicting (NOT in the pre-period fit — those terms are zero in pre).

import type { ParsedRow } from "./validation";
import { fitOLS, predictWithSE, meanPredictionSE, type OLSFit } from "./ols";
import { detectCadence } from "./period";
import { ci95, probGreaterZero } from "./distributions";
import { type Mat, type Vec } from "./linalg";

export interface CampaignSpec {
  date: Date;
  label: string;
}

export interface CovariateRow {
  date: Date;
  values: Record<string, number>;
}

export interface ITSResult {
  series: Array<{
    date: string;
    time: number;
    actual: number;
    counterfactual: number;
    ci_low: number;
    ci_high: number;
    effect: number;
    isPre: boolean;
  }>;
  fit: OLSFit;
  cadence: ReturnType<typeof detectCadence>;
  preCount: number;
  postCount: number;
  // Per-campaign effect summaries (campaign index → metrics)
  campaigns: Array<{
    label: string;
    date: string;
    startIdx: number;
    endIdx: number;
    effect_avg: number;
    effect_se: number;
    effect_ci: [number, number];
    relative_lift_pct: number;
    prob_positive: number;
  }>;
  // Overall (first campaign onwards) summary
  overall: {
    effect_avg: number;
    effect_se: number;
    effect_ci: [number, number];
    relative_lift_pct: number;
    prob_positive: number;
  };
  covariateColumns: string[];
  warnings: string[];
}

export interface FitOptions {
  campaigns: CampaignSpec[]; // must be sorted ascending
  covariates?: CovariateRow[];
  covariateColumns?: string[];
  trendSlopeMultiplier?: number; // for sensitivity analysis (default 1.0)
}

const buildDesignRow = (
  time: number,
  period: number,
  covariateValues: number[],
): number[] => {
  const t = time;
  const omega = (2 * Math.PI) / period;
  return [1, t, Math.sin(omega * t), Math.cos(omega * t), ...covariateValues];
};

const mergeCovariates = (
  rows: ParsedRow[],
  covariates: CovariateRow[] | undefined,
  cols: string[],
): { values: number[][]; missingDates: number } => {
  const values: number[][] = rows.map(() => cols.map(() => 0));
  if (!covariates || cols.length === 0) return { values, missingDates: 0 };
  const byDate = new Map<number, Record<string, number>>();
  for (const c of covariates) byDate.set(c.date.getTime(), c.values);
  let missing = 0;
  rows.forEach((r, i) => {
    const found = byDate.get(r.date.getTime());
    if (!found) {
      missing++;
      return; // leaves zeros
    }
    cols.forEach((col, j) => {
      const v = found[col];
      values[i][j] = Number.isFinite(v) ? v : 0;
    });
  });
  return { values, missingDates: missing };
};

export const runITS = (rows: ParsedRow[], opts: FitOptions): ITSResult => {
  const warnings: string[] = [];
  if (rows.length < 25) throw new Error("INSUFFICIENT_DATA");
  const dates = rows.map((r) => r.date);
  const cadence = detectCadence(dates);
  const { period } = cadence;
  const slopeMult = opts.trendSlopeMultiplier ?? 1.0;

  // Sort campaigns ascending, assign first campaign as the primary split.
  const camps = [...opts.campaigns].sort((a, b) => a.date.getTime() - b.date.getTime());
  if (!camps.length) throw new Error("NO_CAMPAIGN");
  const firstCampaign = camps[0].date.getTime();
  const preIdx = rows.findIndex((r) => r.date.getTime() >= firstCampaign);
  const preCount = preIdx === -1 ? rows.length : preIdx;
  const postCount = rows.length - preCount;

  if (preCount < 20) throw new Error("INSUFFICIENT_PRE_ROWS");
  if (postCount < 5) throw new Error("INSUFFICIENT_POST_ROWS");

  // Adjacency check between campaigns
  for (let i = 1; i < camps.length; i++) {
    const aIdx = rows.findIndex((r) => r.date.getTime() >= camps[i - 1].date.getTime());
    const bIdx = rows.findIndex((r) => r.date.getTime() >= camps[i].date.getTime());
    if (aIdx !== -1 && bIdx !== -1 && bIdx - aIdx < 10) {
      warnings.push(
        `Campaigns "${camps[i - 1].label}" and "${camps[i].label}" are fewer than 10 rows apart — effect estimates may be unreliable.`,
      );
    }
  }

  const cols = opts.covariateColumns ?? [];
  const { values: covValues, missingDates } = mergeCovariates(rows, opts.covariates, cols);
  if (missingDates > 0) {
    warnings.push(
      `Covariate file is missing ${missingDates} date(s) from the main data. Missing values were filled with zero.`,
    );
  }

  // Build pre-period design matrix
  const Xpre: Mat = [];
  const ypre: Vec = [];
  for (let i = 0; i < preCount; i++) {
    Xpre.push(buildDesignRow(i + 1, period, covValues[i]));
    ypre.push(rows[i].y);
  }
  const fit = fitOLS(Xpre, ypre);

  // Optionally adjust trend slope (sensitivity): β1 *= slopeMult
  const beta = fit.beta.slice();
  beta[1] = beta[1] * slopeMult;
  const adjustedFit: OLSFit = { ...fit, beta };

  // Predict for ALL rows (so chart can show fitted pre + counterfactual post)
  const Xall: Mat = rows.map((_, i) => buildDesignRow(i + 1, period, covValues[i]));
  const { pred, se } = predictWithSE(adjustedFit, Xall);

  const series = rows.map((r, i) => {
    const counter = pred[i];
    const halfWidth = 1.96 * se[i];
    return {
      date: r.date.toISOString().slice(0, 10),
      time: i + 1,
      actual: r.y,
      counterfactual: counter,
      ci_low: counter - halfWidth,
      ci_high: counter + halfWidth,
      effect: r.y - counter,
      isPre: i < preCount,
    };
  });

  // Per-campaign metrics: from campaign[i] start to either next campaign start or end of data.
  const campSummaries: ITSResult["campaigns"] = [];
  for (let c = 0; c < camps.length; c++) {
    const startIdx = rows.findIndex((r) => r.date.getTime() >= camps[c].date.getTime());
    if (startIdx === -1) continue;
    const endIdxExclusive =
      c + 1 < camps.length
        ? rows.findIndex((r) => r.date.getTime() >= camps[c + 1].date.getTime())
        : rows.length;
    const stop = endIdxExclusive === -1 ? rows.length : endIdxExclusive;
    if (stop - startIdx < 2) continue;

    const XsubPost: Mat = [];
    let actualSum = 0;
    let effectSum = 0;
    for (let i = startIdx; i < stop; i++) {
      XsubPost.push(Xall[i]);
      actualSum += rows[i].y;
      effectSum += rows[i].y - pred[i];
    }
    const n = stop - startIdx;
    const meanActual = actualSum / n;
    const meanEffect = effectSum / n;
    const seMean = meanPredictionSE(adjustedFit, XsubPost);
    const [lo, hi] = ci95(meanEffect, seMean);
    campSummaries.push({
      label: camps[c].label,
      date: camps[c].date.toISOString().slice(0, 10),
      startIdx,
      endIdx: stop - 1,
      effect_avg: meanEffect,
      effect_se: seMean,
      effect_ci: [lo, hi],
      relative_lift_pct: meanActual !== 0 ? (meanEffect / meanActual) * 100 : 0,
      prob_positive: probGreaterZero(meanEffect, seMean),
    });
  }

  // Overall: from first campaign to end
  const overallStart = preCount;
  const overallX = Xall.slice(overallStart);
  let oSum = 0;
  let oActual = 0;
  for (let i = overallStart; i < rows.length; i++) {
    oSum += rows[i].y - pred[i];
    oActual += rows[i].y;
  }
  const n = rows.length - overallStart;
  const meanEffect = oSum / n;
  const meanActual = oActual / n;
  const seMean = meanPredictionSE(adjustedFit, overallX);
  const [lo, hi] = ci95(meanEffect, seMean);

  return {
    series,
    fit,
    cadence,
    preCount,
    postCount,
    campaigns: campSummaries,
    overall: {
      effect_avg: meanEffect,
      effect_se: seMean,
      effect_ci: [lo, hi],
      relative_lift_pct: meanActual !== 0 ? (meanEffect / meanActual) * 100 : 0,
      prob_positive: probGreaterZero(meanEffect, seMean),
    },
    covariateColumns: cols,
    warnings,
  };
};
