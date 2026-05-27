import { useState } from "react";
import { ChevronDown, AlertTriangle } from "lucide-react";
import {
  ScatterChart,
  Scatter,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";
import { HintTip } from "./HintTip";
import { fmtNum, fmtPct } from "../lib/format";
import type { Diagnostics } from "../lib/stats/diagnostics";

interface Props {
  diag: Diagnostics;
}

export function DiagnosticsPanel({ diag }: Props) {
  const [open, setOpen] = useState(true);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-lg border border-border bg-card">
      <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          Model diagnostics
          <HintTip>How well the model fits the pre-campaign data. Bad diagnostics weaken trust in the causal estimate.</HintTip>
        </div>
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </CollapsibleTrigger>
      <CollapsibleContent className="border-t border-border px-4 py-4 space-y-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Stat
            label="Pre-period RMSE"
            value={fmtNum(diag.rmse)}
            hint="Root-mean-square error on the pre-campaign data — how far off the model is, on average, in the units of y."
          />
          <Stat
            label="R² (pre-period)"
            value={fmtPct(diag.rSquared * 100, 1)}
            hint="Share of pre-campaign variance the model explains. Higher = the trend + seasonality model fits the pre-period well."
          />
          <Stat
            label="Durbin-Watson"
            value={fmtNum(diag.durbinWatson)}
            hint="Tests whether residuals are autocorrelated. Values near 2 are good; <1.5 or >2.5 suggest your CIs may be too narrow."
            warning={diag.dwWarning ?? undefined}
          />
        </div>

        {diag.dwWarning && (
          <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-600 dark:text-amber-400">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
            <span>{diag.dwWarning}</span>
          </div>
        )}

        <div>
          <div className="mb-2 flex items-center gap-1 text-xs font-medium text-muted-foreground">
            Residuals vs. fitted
            <HintTip>Should look like random scatter around zero. Patterns (curves, fans, drift) mean the model is missing structure.</HintTip>
          </div>
          <div className="h-48 w-full">
            <ResponsiveContainer>
              <ScatterChart margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="fitted"
                  type="number"
                  tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                  tickLine={false}
                  name="Fitted"
                />
                <YAxis
                  dataKey="residual"
                  type="number"
                  tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                  tickLine={false}
                  width={44}
                  name="Residual"
                />
                <ReferenceLine y={0} stroke="var(--color-muted-foreground)" strokeDasharray="3 3" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--color-popover)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "6px",
                    fontSize: "11px",
                  }}
                  formatter={(v: number) => fmtNum(v)}
                />
                <Scatter data={diag.residualsVsFitted} fill="var(--color-chart-actual)" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center gap-1 text-xs font-medium text-muted-foreground">
            CUSUM of residuals
            <HintTip>Cumulative sum of standardised residuals. A strong upward or downward drift suggests the pre-period model parameters are unstable over time.</HintTip>
          </div>
          <div className="h-40 w-full">
            <ResponsiveContainer>
              <LineChart data={diag.cusum} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="idx" tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} tickLine={false} width={44} />
                <ReferenceLine y={0} stroke="var(--color-muted-foreground)" strokeDasharray="3 3" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--color-popover)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "6px",
                    fontSize: "11px",
                  }}
                  formatter={(v: number) => fmtNum(v)}
                />
                <Line type="monotone" dataKey="value" stroke="var(--color-chart-actual)" strokeWidth={1.5} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function Stat({ label, value, hint, warning }: { label: string; value: string; hint: string; warning?: string }) {
  return (
    <div className="rounded-md border border-border/60 bg-background/40 p-3">
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        {label}
        <HintTip>{hint}</HintTip>
      </div>
      <div className={`mt-1 text-lg font-semibold tnum ${warning ? "text-amber-500" : ""}`}>{value}</div>
    </div>
  );
}
