// Ordinary least squares with HC3 heteroscedasticity-consistent covariance.
// Reference: MacKinnon & White (1985), "Some heteroskedasticity-consistent
// covariance matrix estimators with improved finite sample properties".

import { type Mat, type Vec, transpose, matMul, matVec, invert, quadForm } from "./linalg";

export interface OLSFit {
  beta: Vec; // coefficient vector
  XtXInv: Mat; // (X'X)^-1
  hc3Cov: Mat; // HC3 robust covariance of beta
  residuals: Vec;
  fitted: Vec;
  rSquared: number;
  rmse: number;
  n: number;
  k: number; // number of regressors (incl. intercept column if present)
}

export const fitOLS = (X: Mat, y: Vec): OLSFit => {
  const n = X.length;
  const k = X[0].length;
  if (n <= k) throw new Error("INSUFFICIENT_ROWS");

  const Xt = transpose(X);
  const XtX = matMul(Xt, X);
  const XtXInv = invert(XtX); // throws SINGULAR_MATRIX on perfect collinearity
  const Xty: Vec = matVec(Xt, y);
  const beta = matVec(XtXInv, Xty);

  const fitted = matVec(X, beta);
  const residuals = y.map((yi, i) => yi - fitted[i]);

  // Leverage h_ii = x_i' (X'X)^-1 x_i
  const h: Vec = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    const xi = X[i];
    h[i] = quadForm(xi, XtXInv);
  }

  // HC3: meat = X' diag(e_i^2 / (1 - h_ii)^2) X
  const meat: Mat = Array.from({ length: k }, () => new Array(k).fill(0));
  for (let i = 0; i < n; i++) {
    const denom = Math.max(1 - h[i], 1e-8);
    const w = (residuals[i] * residuals[i]) / (denom * denom);
    const xi = X[i];
    for (let a = 0; a < k; a++) {
      const xa = xi[a] * w;
      for (let b = 0; b < k; b++) meat[a][b] += xa * xi[b];
    }
  }
  const hc3Cov = matMul(matMul(XtXInv, meat), XtXInv);

  // R^2 against intercept model (assumes column 0 is intercept)
  const yBar = y.reduce((s, v) => s + v, 0) / n;
  let ssRes = 0;
  let ssTot = 0;
  for (let i = 0; i < n; i++) {
    ssRes += residuals[i] * residuals[i];
    ssTot += (y[i] - yBar) * (y[i] - yBar);
  }
  const rSquared = ssTot > 0 ? 1 - ssRes / ssTot : 0;
  const rmse = Math.sqrt(ssRes / n);

  return { beta, XtXInv, hc3Cov, residuals, fitted, rSquared, rmse, n, k };
};

// Predict y for new design rows and return per-row SE using HC3 covariance.
// SE here is for the *mean* prediction (used as counterfactual CI band).
export const predictWithSE = (
  fit: OLSFit,
  Xnew: Mat,
): { pred: Vec; se: Vec } => {
  const pred = matVec(Xnew, fit.beta);
  const se = Xnew.map((xi) => Math.sqrt(Math.max(quadForm(xi, fit.hc3Cov), 0)));
  return { pred, se };
};

// SE of the mean prediction over multiple rows = sqrt( meanX' V meanX ).
export const meanPredictionSE = (fit: OLSFit, Xnew: Mat): number => {
  const k = Xnew[0].length;
  const meanX: Vec = new Array(k).fill(0);
  for (const row of Xnew) for (let j = 0; j < k; j++) meanX[j] += row[j];
  for (let j = 0; j < k; j++) meanX[j] /= Xnew.length;
  return Math.sqrt(Math.max(quadForm(meanX, fit.hc3Cov), 0));
};
