import { useState } from "react";
import { Slider } from "./ui/slider";
import { HintTip } from "./HintTip";
import { fmtNum, fmtPct } from "../lib/format";
import type { ParsedRow } from "../lib/stats/validation";
import type { CampaignEntry } from "./CampaignConfig";
import { runITS } from "../lib/stats/its";

interface Props {
  rows: ParsedRow[];
  campaigns: CampaignEntry[];
  baselineEffect: number;
}

export function SensitivitySlider({ rows, campaigns, baselineEffect }: Props) {
  const [pct, setPct] = useState(0); // -20 .. +20

  let liveEffect = baselineEffect;
  try {
    const r = runITS(rows, {
      campaigns: campaigns
        .filter((c) => c.date)
        .map((c) => ({ date: c.date as Date, label: c.label })),
      trendSlopeMultiplier: 1 + pct / 100,
    });
    liveEffect = r.overall.effect_avg;
  } catch { /* ignore */ }

  const delta = liveEffect - baselineEffect;

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex items-center gap-1 text-sm font-medium">
        Sensitivity analysis
        <HintTip>What happens to the estimated effect if the pre-campaign trend was actually steeper or flatter than what the model assumed?</HintTip>
      </div>

      <p className="mb-4 text-xs text-muted-foreground">
        Drag the slider to scale the assumed pre-period trend slope by ±20%. A robust conclusion
        should not flip sign as you move the slider.
      </p>

      <div className="grid grid-cols-3 gap-3 text-center mb-4">
        <div>
          <div className="text-xs text-muted-foreground">Trend assumption</div>
          <div className="text-lg font-semibold tnum">{pct >= 0 ? "+" : ""}{pct}%</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Effect at this assumption</div>
          <div className="text-lg font-semibold tnum text-primary">{fmtNum(liveEffect)}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Change vs. baseline</div>
          <div className={`text-lg font-semibold tnum ${Math.abs(delta) > Math.abs(baselineEffect) * 0.3 ? "text-amber-500" : ""}`}>
            {delta >= 0 ? "+" : ""}{fmtNum(delta)} ({fmtPct((delta / Math.max(Math.abs(baselineEffect), 1e-9)) * 100, 1)})
          </div>
        </div>
      </div>

      <Slider value={[pct]} onValueChange={(v) => setPct(v[0])} min={-20} max={20} step={1} />
      <div className="mt-1 flex justify-between text-xs text-muted-foreground">
        <span>Flatter trend −20%</span>
        <span>Baseline</span>
        <span>Steeper trend +20%</span>
      </div>
    </div>
  );
}
