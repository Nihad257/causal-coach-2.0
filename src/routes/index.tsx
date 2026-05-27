import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowRight, Upload, Calendar, BarChart3, ShieldCheck, Sparkles, GitBranch } from "lucide-react";
import { Button } from "../components/ui/button";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/60">
        <div className="absolute inset-0 -z-10 opacity-40 [mask-image:radial-gradient(60%_60%_at_50%_30%,black,transparent)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_-20%,var(--color-primary)_0%,transparent_45%),radial-gradient(circle_at_80%_120%,var(--color-primary)_0%,transparent_45%)]" />
        </div>
        <div className="mx-auto max-w-5xl px-4 py-20 sm:py-28 text-center">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
              <Sparkles className="h-3 w-3" /> Interrupted time-series + HC3 robust inference
            </span>
            <h1 className="mt-5 text-4xl sm:text-6xl font-semibold tracking-tight">
              Did your campaign{" "}
              <span className="text-primary">actually work?</span>
            </h1>
            <p className="mt-5 max-w-2xl mx-auto text-muted-foreground text-lg">
              Find out in 60 seconds. Upload your sales data, pick a campaign date, and get a
              rigorous causal estimate with diagnostics and a plain-English verdict.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg">
                <Link to="/analysis">
                  Start analyzing <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/analysis" search={{ demo: true } as never}>Try with sample data</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 3-step */}
      <section className="mx-auto max-w-5xl px-4 py-16">
        <h2 className="text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
          How it works
        </h2>
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { icon: Upload, title: "1. Upload data", body: "A CSV with a date column and a y column. That's all we need." },
            { icon: Calendar, title: "2. Pick a date", body: "Mark when the campaign started. Add up to 3 campaigns if you ran several." },
            { icon: BarChart3, title: "3. Get the verdict", body: "A counterfactual, a confidence interval, placebo tests, and an exportable report." },
          ].map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              className="rounded-xl border border-border bg-card p-5"
            >
              <div className="grid h-9 w-9 place-items-center rounded-md bg-primary/10 text-primary">
                <s.icon className="h-4 w-4" />
              </div>
              <h3 className="mt-3 font-medium">{s.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Preview card */}
      <section className="mx-auto max-w-5xl px-4 pb-16">
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="grid gap-6 sm:grid-cols-5">
            <div className="sm:col-span-2 flex flex-col justify-center">
              <h3 className="text-xl font-semibold">What you&apos;ll see</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                A counterfactual line showing what would have happened without the campaign, a
                95% CI band, and a plain-English summary. Plus diagnostics — RMSE, R², Durbin-Watson,
                CUSUM — and 10 placebo tests to stress-test the conclusion.
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                {["HC3 robust SE", "Auto seasonality", "Placebo tests", "PDF report"].map((t) => (
                  <span key={t} className="rounded-full border border-border bg-background px-2.5 py-1 text-muted-foreground">{t}</span>
                ))}
              </div>
            </div>
            <div className="sm:col-span-3">
              <PreviewSparkline />
            </div>
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="mx-auto max-w-5xl px-4 pb-20">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { icon: ShieldCheck, title: "100% in your browser", body: "Your data never leaves your machine. No upload, no server-side storage." },
            { icon: BarChart3, title: "Honest statistics", body: "HC3 robust standard errors, autocorrelation checks, and placebo tests by default." },
            { icon: GitBranch, title: "Open source", body: "Reproducible, auditable, and free. Inspect the code, run it locally, fork it." },
          ].map((c) => (
            <div key={c.title} className="rounded-xl border border-border bg-card p-5">
              <c.icon className="h-5 w-5 text-primary" />
              <h3 className="mt-3 text-sm font-medium">{c.title}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{c.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function PreviewSparkline() {
  // Static stylised mini-chart drawn in SVG (no Recharts dependency on landing).
  const w = 520, h = 200, pad = 12;
  const pts = Array.from({ length: 52 }, (_, i) => {
    const base = 100 + 0.6 * i + 10 * Math.sin((i / 52) * 2 * Math.PI);
    const lift = i >= 30 ? 18 : 0;
    return base + lift;
  });
  const counter = pts.map((_, i) => 100 + 0.6 * i + 10 * Math.sin((i / 52) * 2 * Math.PI));
  const all = [...pts, ...counter];
  const min = Math.min(...all) - 2;
  const max = Math.max(...all) + 2;
  const x = (i: number) => pad + (i * (w - pad * 2)) / (pts.length - 1);
  const y = (v: number) => pad + (h - pad * 2) * (1 - (v - min) / (max - min));
  const path = (arr: number[]) => arr.map((v, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(v)}`).join(" ");
  const band = (() => {
    let p = `M ${x(0)} ${y(counter[0] + 8)} `;
    for (let i = 1; i < counter.length; i++) p += `L ${x(i)} ${y(counter[i] + 8)} `;
    for (let i = counter.length - 1; i >= 0; i--) p += `L ${x(i)} ${y(counter[i] - 8)} `;
    return p + "Z";
  })();
  return (
    <div className="rounded-lg border border-border bg-background/40 p-3">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto">
        <path d={band} fill="var(--color-chart-band)" />
        <path d={path(counter)} fill="none" stroke="var(--color-chart-counter)" strokeWidth={1.5} strokeDasharray="4 3" />
        <path d={path(pts)} fill="none" stroke="var(--color-chart-actual)" strokeWidth={2} />
        <line x1={x(30)} y1={pad} x2={x(30)} y2={h - pad} stroke="var(--color-chart-actual)" strokeDasharray="3 3" opacity={0.6} />
        <text x={x(30) + 4} y={pad + 10} fontSize="10" fill="var(--color-chart-actual)">Campaign</text>
      </svg>
      <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
        <span>Pre-period (model fit)</span>
        <span>Post-period (effect)</span>
      </div>
    </div>
  );
}
