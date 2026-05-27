// Deterministic plain-English verdict generation. Same inputs → same string.
// Tone scales with the probability the effect is positive.

import { fmtNum, fmtPct } from "../format";

interface VerdictInput {
  effect_avg: number;
  effect_ci: [number, number];
  prob_positive: number;
  r_squared: number;
  cadence: "daily" | "weekly" | "monthly" | "irregular";
  yUnit?: string;
}

const cadenceWord = (c: VerdictInput["cadence"]): string => {
  switch (c) {
    case "daily":
      return "day";
    case "weekly":
      return "week";
    case "monthly":
      return "month";
    default:
      return "period";
  }
};

export const buildVerdict = (input: VerdictInput): string => {
  const direction = input.effect_avg >= 0 ? "increased" : "decreased";
  const magnitude = Math.abs(input.effect_avg);
  const unit = input.yUnit?.trim() || "units";
  const per = cadenceWord(input.cadence);
  const probPct = Math.round(input.prob_positive * 100);

  const conf =
    probPct >= 80
      ? "There is strong statistical evidence this effect is real and not random noise."
      : probPct >= 60
        ? "There is moderate evidence this effect is real — interpret with caution."
        : "The evidence for a real effect is weak. The change is plausibly random noise.";

  return [
    `Sales ${direction} by an average of ${fmtNum(magnitude)} ${unit}/${per} after the campaign.`,
    `There is a ${probPct}% probability this effect is positive based on HC3-robust inference.`,
    `${conf} The model explains ${fmtPct(input.r_squared * 100, 0)} of pre-campaign variance.`,
  ].join(" ");
};

export const verdictTone = (probPositive: number): "confident" | "cautious" | "sceptical" => {
  const pct = probPositive * 100;
  if (pct >= 80) return "confident";
  if (pct >= 60) return "cautious";
  return "sceptical";
};
