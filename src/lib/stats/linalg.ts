// Minimal numeric linear algebra for OLS + HC3 in TypeScript.
// All matrices are number[][] with rows as outer arrays.

export type Mat = number[][];
export type Vec = number[];

export const transpose = (A: Mat): Mat => {
  const r = A.length;
  const c = A[0].length;
  const T: Mat = Array.from({ length: c }, () => new Array(r).fill(0));
  for (let i = 0; i < r; i++) for (let j = 0; j < c; j++) T[j][i] = A[i][j];
  return T;
};

export const matMul = (A: Mat, B: Mat): Mat => {
  const r = A.length;
  const m = A[0].length;
  const c = B[0].length;
  const C: Mat = Array.from({ length: r }, () => new Array(c).fill(0));
  for (let i = 0; i < r; i++) {
    for (let k = 0; k < m; k++) {
      const aik = A[i][k];
      if (aik === 0) continue;
      for (let j = 0; j < c; j++) C[i][j] += aik * B[k][j];
    }
  }
  return C;
};

export const matVec = (A: Mat, x: Vec): Vec => {
  const r = A.length;
  const c = A[0].length;
  const y: Vec = new Array(r).fill(0);
  for (let i = 0; i < r; i++) {
    let s = 0;
    for (let j = 0; j < c; j++) s += A[i][j] * x[j];
    y[i] = s;
  }
  return y;
};

// Invert via Gauss-Jordan with partial pivoting. Throws on singular matrix.
export const invert = (A: Mat): Mat => {
  const n = A.length;
  const M: Mat = A.map((row, i) => {
    const aug = row.slice();
    for (let j = 0; j < n; j++) aug.push(i === j ? 1 : 0);
    return aug;
  });
  for (let i = 0; i < n; i++) {
    // pivot
    let maxRow = i;
    let maxVal = Math.abs(M[i][i]);
    for (let k = i + 1; k < n; k++) {
      const v = Math.abs(M[k][i]);
      if (v > maxVal) {
        maxVal = v;
        maxRow = k;
      }
    }
    if (maxVal < 1e-12) throw new Error("SINGULAR_MATRIX");
    if (maxRow !== i) [M[i], M[maxRow]] = [M[maxRow], M[i]];
    const pivot = M[i][i];
    for (let j = 0; j < 2 * n; j++) M[i][j] /= pivot;
    for (let k = 0; k < n; k++) {
      if (k === i) continue;
      const factor = M[k][i];
      if (factor === 0) continue;
      for (let j = 0; j < 2 * n; j++) M[k][j] -= factor * M[i][j];
    }
  }
  return M.map((row) => row.slice(n));
};

export const diag = (A: Mat): Vec => A.map((row, i) => row[i]);

export const quadForm = (v: Vec, M: Mat): number => {
  // v' M v
  let s = 0;
  for (let i = 0; i < v.length; i++) {
    let inner = 0;
    for (let j = 0; j < v.length; j++) inner += M[i][j] * v[j];
    s += v[i] * inner;
  }
  return s;
};
