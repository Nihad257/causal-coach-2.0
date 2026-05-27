import { useMemo } from "react";
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Brush,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { ITSResult } from "../lib/stats/its";
import { fmtNum } from "../lib/format";

interface Props {
  result: ITSResult;
  campaignDates: string[]; // ISO yyyy-mm-dd
}

export function MainChart({ result, campaignDates }: Props) {
  const data = useMemo(
    () =>
      result.series.map((p) => ({
        ...p,
        // Stack the band as two arrays for Recharts <Area dataKey={[lo,hi]}>
        band: [p.ci_low, p.ci_high] as [number, number],
      })),
    [result],
  );

  return (
    <div className="h-[420px] w-full">
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 16, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
            tickLine={false}
            minTickGap={32}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
            tickLine={false}
            axisLine={false}
            width={48}
          />
          <Tooltip
            cursor={{ stroke: "var(--color-muted-foreground)", strokeDasharray: "2 4" }}
            contentStyle={{
              backgroundColor: "var(--color-popover)",
              border: "1px solid var(--color-border)",
              borderRadius: "8px",
              fontSize: "12px",
            }}
            formatter={(value: unknown, name) => {
              if (name === "band") return null;
              return [fmtNum(Number(value)), name];
            }}
            labelFormatter={(l) => `Date: ${l}`}
          />
          <Legend
            wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }}
            iconType="line"
            formatter={(v) =>
              v === "band"
                ? "95% CI"
                : v === "counterfactual"
                  ? "Counterfactual"
                  : v === "actual"
                    ? "Actual"
                    : v
            }
          />
          <Area
            type="monotone"
            dataKey="band"
            stroke="none"
            fill="var(--color-chart-band)"
            isAnimationActive={false}
            activeDot={false}
            legendType="none"
          />
          <Line
            type="monotone"
            dataKey="counterfactual"
            stroke="var(--color-chart-counter)"
            strokeWidth={1.75}
            strokeDasharray="6 4"
            dot={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="actual"
            stroke="var(--color-chart-actual)"
            strokeWidth={2.25}
            dot={false}
            isAnimationActive={false}
          />
          {campaignDates.map((d, i) => (
            <ReferenceLine
              key={d}
              x={d}
              stroke="var(--color-chart-actual)"
              strokeDasharray="4 4"
              label={{
                value: i === 0 ? "Campaign" : `Campaign ${i + 1}`,
                position: "insideTopRight",
                fontSize: 10,
                fill: "var(--color-chart-actual)",
              }}
            />
          ))}
          <Brush
            dataKey="date"
            height={20}
            stroke="var(--color-primary)"
            travellerWidth={8}
            fill="var(--color-card)"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
