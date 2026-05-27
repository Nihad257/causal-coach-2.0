import { motion } from "framer-motion";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent } from "./ui/card";
import { HintTip } from "./HintTip";
import { fmtNum, fmtPct, fmtCI } from "../lib/format";
import type { ITSResult } from "../lib/stats/its";

const cadenceWord = (c: ITSResult["cadence"]["cadence"]) =>
  c === "daily" ? "day" : c === "weekly" ? "week" : c === "monthly" ? "month" : "period";

export function MetricsCards({ result }: { result: ITSResult }) {
  const o = result.overall;
  const positive = o.effect_avg >= 0;
  const per = cadenceWord(result.cadence.cadence);
  const cards = [
    {
      title: "Average causal effect",
      value: `${positive ? "+" : ""}${fmtNum(o.effect_avg)} /${per}`,
      icon: positive ? TrendingUp : TrendingDown,
      hint: "The average difference between actual sales and what the model expected without the campaign, across the post-campaign window.",
    },
    {
      title: "95% confidence interval",
      value: fmtCI(o.effect_ci[0], o.effect_ci[1]),
      hint: "If we re-ran this study many times, the true effect would fall inside this range 95% of the time. Computed with HC3-robust standard errors.",
    },
    {
      title: "Relative lift",
      value: fmtPct(o.relative_lift_pct, 2),
      hint: "Effect expressed as a percentage of the average post-campaign actual value.",
    },
    {
      title: "Probability effect > 0",
      value: fmtPct(o.prob_positive * 100, 1),
      hint: "Probability that the true campaign effect is positive, given the data and the model.",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c, i) => (
        <motion.div
          key={c.title}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                {c.title}
                <HintTip>{c.hint}</HintTip>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-semibold tracking-tight tnum">{c.value}</span>
                {c.icon && <c.icon className="h-4 w-4 text-primary" />}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
