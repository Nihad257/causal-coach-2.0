// Diagnostics computed from a fitted OLS pre-period model.
// All series are aligned to the pre-period (length = fit.n).

import type { OLSFit } from "./ols";

export interface Diagnostics {
  rmse: number;
  rSquared: number;
  durbinWatson: number;
  dwWarning: string | null;
  residualsVsFitted: Array<{ fitted: number; residual: number; idx: number }>;
  cusum: Array<{ idx: number; value: number }>;
}

export const computeDiagnostics = (fit: OLSFit): Diagnostics => {
  const { residuals, fitted, n, rmse, rSquared } = fit;

  // Durbin-Watson: sum((e_t - e_{t-1})^2) / sum(e_t^2)
  let num = 0;
  let denom = 0;
  for (let i = 0; i < n; i++) {
    if (i > 0) num += (residuals[i] - residuals[i - 1]) ** 2;
    denom += residuals[i] ** 2;
  }
  const dw = denom > 0 ? num / denom : 2;

  const dwWarning =
    dw < 1.5
      ? "Residuals show positive autocorrelation — confidence intervals may be too narrow."
      : dw > 2.5
        ? "Residuals show negative autocorrelation — confidence intervals may be too narrow."
        : null;

  const residualsVsFitted = residuals.map((r, i) => ({
    fitted: fitted[i],
    residual: r,
    idx: i,
  }));

  // Standardize residuals for CUSUM (uses estimated σ from RMSE)
  const sigma = Math.max(rmse, 1e-9);
  let running = 0;
  const cusum = residuals.map((r, i) => {
    running += r / sigma;
    return { idx: i, value: running };
  });

  return {
    rmse,
    rSquared,
    durbinWatson: dw,
    dwWarning,
    residualsVsFitted,
    cusum,
  };
};
