import { useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";
import { Progress } from "./ui/progress";
import { Button } from "./ui/button";
import { HintTip } from "./HintTip";
import { fmtNum } from "../lib/format";
import type { PlaceboPoint } from "../lib/stats/placebo";

interface Props {
  results: PlaceboPoint[] | null;
  running: boolean;
  progress: { done: number; total: number };
  observedEffect: number;
  onRun: () => void;
}

export function PlaceboPanel({ results, running, progress, observedEffect, onRun }: Props) {
  const [open, setOpen] = useState(true);

  const chartData =
    results?.map((p) => ({
      name: `−${p.shift_rows}`,
      effect: Number.isFinite(p.effect) ? p.effect : 0,
      raw: p.effect,
    })) ?? [];

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-lg border border-border bg-card">
      <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          Placebo tests
          <HintTip>We pretend the campaign launched earlier (5, 10, 15… rows back) and re-run the model. Fake campaigns should show effects near zero — if they don&apos;t, your real estimate may be picking up a pre-existing trend.</HintTip>
        </div>
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </CollapsibleTrigger>
      <CollapsibleContent className="border-t border-border px-4 py-4 space-y-4">
        {!results && !running && (
          <div className="text-center py-6">
            <p className="text-sm text-muted-foreground mb-3">
              Run 10 placebo tests to check whether the model spuriously detects effects at fake campaign dates.
            </p>
            <Button onClick={onRun} variant="default" size="sm">Run placebo tests</Button>
          </div>
        )}

        {running && (
          <div className="py-4">
            <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>Running placebo {progress.done} of {progress.total}…</span>
              <span className="tnum">{Math.round((progress.done / Math.max(progress.total, 1)) * 100)}%</span>
            </div>
            <Progress value={(progress.done / Math.max(progress.total, 1)) * 100} />
          </div>
        )}

        {results && (
          <>
            <div className="h-56 w-full">
              <ResponsiveContainer>
                <BarChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} tickLine={false} width={44} />
                  <ReferenceLine y={0} stroke="var(--color-border)" />
                  <ReferenceLine
                    y={observedEffect}
                    stroke="var(--color-chart-actual)"
                    strokeDasharray="3 3"
                    label={{ value: "Observed", position: "insideTopRight", fontSize: 10, fill: "var(--color-chart-actual)" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--color-popover)",
                      border: "1px solid var(--color-border)",
                      borderRadius: "6px",
                      fontSize: "12px",
                    }}
                    formatter={(_v, _n, p) => [fmtNum(Number(p.payload.raw)), "Effect"]}
                    labelFormatter={(l) => `Shifted back ${String(l).replace("−", "")} rows`}
                  />
                  <Bar dataKey="effect">
                    {chartData.map((d, i) => (
                      <Cell
                        key={i}
                        fill={
                          Number.isFinite(d.raw)
                            ? Math.abs(d.raw) > Math.abs(observedEffect) * 0.5
                              ? "var(--color-warning)"
                              : "var(--color-chart-counter)"
                            : "var(--color-muted)"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-muted-foreground">
              If the campaign caused the effect, placebo dates should show near-zero effects compared to the
              observed effect ({fmtNum(observedEffect)}). Large placebo effects suggest the model may be
              picking up a pre-existing trend.
            </p>
          </>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
