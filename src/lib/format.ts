// Number formatting helpers. Always use these — never raw toFixed at call sites.

export const fmtNum = (v: number, decimals = 2): string => {
  if (!Number.isFinite(v)) return "—";
  if (Math.abs(v) >= 1000) return v.toFixed(0);
  if (Number.isInteger(v) && Math.abs(v) < 1000) return v.toFixed(0);
  return v.toFixed(decimals);
};

export const fmtPct = (v: number, decimals = 2): string => {
  if (!Number.isFinite(v)) return "—";
  return `${v.toFixed(decimals)}%`;
};

export const fmtSigned = (v: number, decimals = 2): string => {
  if (!Number.isFinite(v)) return "—";
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(decimals)}`;
};

export const fmtCI = (lo: number, hi: number, decimals = 2): string =>
  `[${fmtNum(lo, decimals)}, ${fmtNum(hi, decimals)}]`;
