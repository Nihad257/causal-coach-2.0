import { buildSampleCSV, sampleCampaignDate } from "./src/lib/stats/sample-data";
import { parseCSV } from "./src/lib/stats/validation";
import { runITS } from "./src/lib/stats/its";
import { computeDiagnostics } from "./src/lib/stats/diagnostics";
import { runPlaceboTests } from "./src/lib/stats/placebo";
import { buildVerdict } from "./src/lib/stats/verdict";

const csv = buildSampleCSV();
const parsed = parseCSV(csv, { dayfirst: false });
if (!parsed.ok) throw new Error("parse failed: " + parsed.error.message);
const camp = new Date(sampleCampaignDate);
const result = runITS(parsed.data.rows, {
  campaigns: [{ date: camp, label: "Launch" }],
});
console.log("preCount", result.preCount, "postCount", result.postCount);
console.log("cadence", result.cadence);
console.log("R²", result.fit.rSquared.toFixed(3), "RMSE", result.fit.rmse.toFixed(3));
console.log("overall effect", result.overall.effect_avg.toFixed(3),
  "CI", result.overall.effect_ci.map(v => v.toFixed(2)),
  "prob+", result.overall.prob_positive.toFixed(3));
const diag = computeDiagnostics(result.fit);
console.log("DW", diag.durbinWatson.toFixed(3), "warn:", diag.dwWarning);
console.log("verdict:", buildVerdict({
  effect_avg: result.overall.effect_avg,
  effect_ci: result.overall.effect_ci,
  prob_positive: result.overall.prob_positive,
  r_squared: result.fit.rSquared,
  cadence: result.cadence.cadence,
}));

const campIdx = result.preCount;
const cov = parsed.data.rows.map(() => [] as number[]);
const placebo = await runPlaceboTests(parsed.data.rows, { campaignIdx: campIdx, covValues: cov });
console.log("placebo:", placebo.map(p => `${p.shift_rows}: ${isFinite(p.effect) ? p.effect.toFixed(2) : 'na'}`).join(", "));
