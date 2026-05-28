import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, Loader2, Play, ChevronDown } from "lucide-react";
import { z } from "zod";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../components/ui/collapsible";
import { FileUpload } from "../components/FileUpload";
import { DateAmbiguityDialog } from "../components/DateAmbiguityDialog";
import { CampaignConfig, type CampaignEntry } from "../components/CampaignConfig";
import { MainChart } from "../components/MainChart";
import { MetricsCards } from "../components/MetricsCards";
import { DiagnosticsPanel } from "../components/DiagnosticsPanel";
import { PlaceboPanel } from "../components/PlaceboPanel";
import { SensitivitySlider } from "../components/SensitivitySlider";
import { ExportButtons } from "../components/ExportButtons";
import { parseCSV, type ParsedCSV, type ParsedRow } from "../lib/stats/validation";
import { runITS, type ITSResult, type CovariateRow } from "../lib/stats/its";
import { computeDiagnostics, type Diagnostics } from "../lib/stats/diagnostics";
import { runPlaceboTests, type PlaceboPoint } from "../lib/stats/placebo";
import { buildVerdict, verdictTone } from "../lib/stats/verdict";
import { buildSampleCSV, sampleCampaignDate } from "../lib/stats/sample-data";
import { fmtNum } from "../lib/format";

const searchSchema = z.object({ demo: z.boolean().optional() });

export const Route = createFileRoute("/analysis")({
  validateSearch: searchSchema,
  component: AnalysisPage,
});

interface DataState {
  rows: ParsedRow[];
  extraColumns: string[];
  fileName: string;
  rawText: string;
}

interface CovState {
  data: CovariateRow[];
  columns: string[];
  fileName: string;
}

function AnalysisPage() {
  const { demo } = Route.useSearch();
  const [data, setData] = useState<DataState | null>(null);
  const [cov, setCov] = useState<CovState | null>(null);
  const [ambiguous, setAmbiguous] = useState<{ open: boolean; sample: string; text: string; isCovariates: boolean }>({
    open: false, sample: "", text: "", isCovariates: false,
  });
  const [campaigns, setCampaigns] = useState<CampaignEntry[]>([]);
  const [result, setResult] = useState<ITSResult | null>(null);
  const [diag, setDiag] = useState<Diagnostics | null>(null);
  const [verdict, setVerdict] = useState<string>("");
  const [running, setRunning] = useState(false);
  const [stage, setStage] = useState<string>("");
  const [runError, setRunError] = useState<string | null>(null);
  const [placebo, setPlacebo] = useState<PlaceboPoint[] | null>(null);
  const [placeboRunning, setPlaceboRunning] = useState(false);
  const [placeboProgress, setPlaceboProgress] = useState({ done: 0, total: 10 });
  const [helpOpen, setHelpOpen] = useState(() => {
    try {
      return localStorage.getItem("cc-help-panel") !== "closed";
    } catch {
      return true;
    }
  });

  // Auto-load sample if ?demo=true
  useEffect(() => {
    if (!demo || data) return;
    const text = buildSampleCSV();
    const parsed = parseCSV(text, { dayfirst: false });
    if (parsed.ok) {
      setData({
        rows: parsed.data.rows,
        extraColumns: parsed.data.extraColumns,
        fileName: "causalcoach-sample.csv",
        rawText: text,
      });
      setCampaigns([{ id: "demo", date: new Date(sampleCampaignDate), label: "Campaign 1" }]);
    }
  }, [demo, data]);

  const sampleDateString = useMemo(() => {
    if (!data) return null;
    const r = data.rows[0]?.raw;
    if (!r) return null;
    for (const k of Object.keys(r)) {
      if (k.toLowerCase() === "date") {
        const v = r[k];
        if (/^(\d{1,2})[-/](\d{1,2})[-/]\d{4}$/.test(v)) {
          const m = v.match(/^(\d{1,2})[-/](\d{1,2})[-/]\d{4}$/)!;
          if (+m[1] <= 12 && +m[2] <= 12 && +m[1] !== +m[2]) return v;
        }
      }
    }
    return null;
  }, [data]);

  const handleParsed = (file: File, text: string, parsed: ParsedCSV) => {
    if (parsed.ambiguous) {
      const sampleRow = parsed.rows[0]?.raw ?? {};
      const dateKey = Object.keys(sampleRow).find((k) => k.toLowerCase() === "date") ?? "date";
      setAmbiguous({ open: true, sample: sampleRow[dateKey] ?? "", text, isCovariates: false });
      return;
    }
    setData({
      rows: parsed.rows,
      extraColumns: parsed.extraColumns,
      fileName: file.name,
      rawText: text,
    });
  };

  const handleCovariatesParsed = (file: File, _text: string, parsed: ParsedCSV) => {
    const covRows: CovariateRow[] = parsed.rows.map((r) => {
      const values: Record<string, number> = {};
      for (const col of parsed.extraColumns) {
        const v = Number(r.raw[col]);
        if (Number.isFinite(v)) values[col] = v;
      }
      return { date: r.date, values };
    });
    setCov({ data: covRows, columns: parsed.extraColumns, fileName: file.name });
  };

  const resolveAmbiguity = (dayfirst: boolean) => {
    const parsed = parseCSV(ambiguous.text, { dayfirst, isCovariates: ambiguous.isCovariates });
    setAmbiguous({ open: false, sample: "", text: "", isCovariates: false });
    if (!parsed.ok) {
      setRunError(parsed.error.message);
      return;
    }
    if (ambiguous.isCovariates) {
      const covRows: CovariateRow[] = parsed.data.rows.map((r) => {
        const values: Record<string, number> = {};
        for (const col of parsed.data.extraColumns) {
          const v = Number(r.raw[col]);
          if (Number.isFinite(v)) values[col] = v;
        }
        return { date: r.date, values };
      });
      setCov({ data: covRows, columns: parsed.data.extraColumns, fileName: "covariates.csv" });
    } else {
      setData({
        rows: parsed.data.rows,
        extraColumns: parsed.data.extraColumns,
        fileName: "data.csv",
        rawText: ambiguous.text,
      });
    }
  };

  const canRun =
    !!data &&
    campaigns.length > 0 &&
    campaigns.every((c) => !!c.date);

  const runAnalysis = async () => {
    if (!data) return;
    setRunError(null);
    setResult(null);
    setDiag(null);
    setPlacebo(null);
    setRunning(true);
    try {
      setStage("Validating data…");
      await new Promise((r) => setTimeout(r, 80));
      const camps = campaigns
        .filter((c) => c.date)
        .map((c) => ({ date: c.date as Date, label: c.label }));

      setStage("Fitting pre-period model with HC3 robust SE…");
      await new Promise((r) => setTimeout(r, 50));
      const r = runITS(data.rows, {
        campaigns: camps,
        covariates: cov?.data,
        covariateColumns: cov?.columns,
      });
      setResult(r);

      setStage("Computing diagnostics…");
      await new Promise((r) => setTimeout(r, 40));
      const d = computeDiagnostics(r.fit);
      setDiag(d);

      setStage("Generating verdict…");
      const v = buildVerdict({
        effect_avg: r.overall.effect_avg,
        effect_ci: r.overall.effect_ci,
        prob_positive: r.overall.prob_positive,
        r_squared: r.fit.rSquared,
        cadence: r.cadence.cadence,
      });
      setVerdict(v);
    } catch (e) {
      const code = (e as Error).message;
      const msg =
        code === "INSUFFICIENT_PRE_ROWS"
          ? "You need at least 20 pre-campaign rows. Move your campaign date later."
          : code === "INSUFFICIENT_POST_ROWS"
            ? "You need at least 5 post-campaign rows. Move your campaign date earlier."
            : code === "SINGULAR_MATRIX"
              ? "Not enough variation in pre-period data to fit the model. Try a longer pre-campaign window."
              : code === "INSUFFICIENT_DATA"
                ? "Not enough rows in the dataset. Upload at least 25 rows."
                : "The model could not be fit. Please check your data and try again.";
      setRunError(msg);
    } finally {
      setRunning(false);
      setStage("");
    }
  };

  const runPlacebo = async () => {
    if (!data || !result) return;
    setPlaceboRunning(true);
    setPlaceboProgress({ done: 0, total: 10 });
    const cov2: number[][] = data.rows.map((_, i) => {
      if (!cov) return [];
      const row = cov.data.find((c) => c.date.getTime() === data.rows[i].date.getTime());
      return cov.columns.map((k) => (row && Number.isFinite(row.values[k]) ? row.values[k] : 0));
    });
    const res = await runPlaceboTests(data.rows, {
      campaignIdx: result.preCount,
      covValues: cov2,
      onProgress: (done, total) => setPlaceboProgress({ done, total }),
    });
    setPlacebo(res);
    setPlaceboRunning(false);
  };

  const dateSummary = data
    ? `${data.fileName} — ${data.rows.length} rows · ${data.rows[0].date.toISOString().slice(0, 10)} → ${data.rows[data.rows.length - 1].date.toISOString().slice(0, 10)}`
    : null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Analyze a campaign</h1>
        <p className="mt-2 text-muted-foreground">
          Upload time-series data and pick the campaign date. All computation runs locally in your browser.
        </p>
      </header>

      <div className="space-y-6">
        {/* STEP 1 */}
        <Section number={1} title="Upload your data">
          <FileUpload
            label="Sales / metric data"
            description="CSV with a 'date' column and a 'y' column. Sort by date or we'll sort for you."
            onParsed={handleParsed}
            onError={(err) => setRunError(err.message)}
            showSampleButton
            parsedSummary={dateSummary}
            onClear={() => {
              setData(null); setResult(null); setDiag(null); setPlacebo(null);
            }}
          />
        </Section>

        {/* STEP 2 */}
        {data && (
          <Section number={2} title="Configure the analysis">
            <CampaignConfig rows={data.rows} campaigns={campaigns} onChange={setCampaigns} />

            <Collapsible className="mt-4">
              <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md border border-border bg-background/40 px-3 py-2 text-sm">
                <span>Add covariates (optional)</span>
                <ChevronDown className="h-4 w-4" />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3">
                <FileUpload
                  label="Covariates CSV"
                  description="Same date column plus extra numeric columns (e.g. marketing_spend, holiday_flag)."
                  isCovariates
                  onParsed={handleCovariatesParsed}
                  parsedSummary={cov ? `${cov.fileName} — covariates: ${cov.columns.join(", ")}` : null}
                  onClear={() => setCov(null)}
                />
              </CollapsibleContent>
            </Collapsible>
          </Section>
        )}

        {/* STEP 3 */}
        {data && (
          <Section number={3} title="Run analysis">
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={runAnalysis} disabled={!canRun || running} size="lg">
                {running ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                {running ? "Running…" : "Run analysis"}
              </Button>
              {running && stage && (
                <span className="text-sm text-muted-foreground">{stage}</span>
              )}
            </div>
            {runError && (
              <div className="mt-4 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>{runError}</span>
              </div>
            )}
            {result?.warnings.length ? (
              <div className="mt-3 space-y-1.5">
                {result.warnings.map((w, i) => (
                  <div key={i} className="rounded-md border border-amber-500/40 bg-amber-500/10 p-2.5 text-xs text-amber-600 dark:text-amber-400">
                    {w}
                  </div>
                ))}
              </div>
            ) : null}
          </Section>
        )}

        {/* STEP 4: RESULTS */}
        <AnimatePresence>
          {running && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-[420px] w-full" />
              <div className="grid grid-cols-4 gap-3">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
              </div>
            </motion.div>
          )}

          {!running && result && diag && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Verdict hero */}
              <div className={`rounded-xl border p-6 ${
                verdictTone(result.overall.prob_positive) === "confident"
                  ? "border-primary/40 bg-primary/5"
                  : verdictTone(result.overall.prob_positive) === "cautious"
                    ? "border-amber-500/40 bg-amber-500/5"
                    : "border-border bg-card"
              }`}>
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Verdict</div>
                <p className="text-lg sm:text-xl font-medium leading-relaxed">{verdict}</p>
              </div>

              {/* Per-campaign breakdown */}
              {result.campaigns.length > 1 && (
                <div className="rounded-lg border border-border bg-card p-4">
                  <h3 className="text-sm font-medium mb-3">Effect by campaign</h3>
                  <div className="space-y-2 text-sm">
                    {result.campaigns.map((c) => (
                      <div key={c.label} className="flex items-center justify-between border-b border-border/60 pb-2 last:border-0">
                        <div>
                          <div className="font-medium">{c.label}</div>
                          <div className="text-xs text-muted-foreground">{c.date}</div>
                        </div>
                        <div className="text-right tnum">
                          <div className="font-semibold">{fmtNum(c.effect_avg)}</div>
                          <div className="text-xs text-muted-foreground">CI [{fmtNum(c.effect_ci[0])}, {fmtNum(c.effect_ci[1])}]</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Main chart */}
              <div className="rounded-xl border border-border bg-card p-4 causalcoach-main-chart">
                <h3 className="mb-2 text-sm font-medium">Actual vs. counterfactual</h3>
                <MainChart
                  result={result}
                  campaignDates={campaigns.filter((c) => c.date).map((c) => (c.date as Date).toISOString().slice(0, 10))}
                />
              </div>

              <MetricsCards result={result} />
              <DiagnosticsPanel diag={diag} />
              <PlaceboPanel
                results={placebo}
                running={placeboRunning}
                progress={placeboProgress}
                observedEffect={result.overall.effect_avg}
                onRun={runPlacebo}
              />
              <SensitivitySlider rows={data!.rows} campaigns={campaigns} baselineEffect={result.overall.effect_avg} />

              <div className="rounded-lg border border-border bg-card p-4">
                <h3 className="mb-3 text-sm font-medium">Export</h3>
                <ExportButtons result={result} verdict={verdict} dwStat={diag.durbinWatson} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <DateAmbiguityDialog
        open={ambiguous.open}
        sampleRaw={ambiguous.sample || sampleDateString || ""}
        onChoose={resolveAmbiguity}
        onCancel={() => setAmbiguous({ open: false, sample: "", text: "", isCovariates: false })}
      />
    </div>
  );
}

function Section({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card/50 p-5">
      <div className="mb-4 flex items-center gap-3">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-primary/10 text-primary text-sm font-semibold tnum">
          {number}
        </span>
        <h2 className="text-base font-semibold">{title}</h2>
      </div>
      {children}
    </section>
  );
}
