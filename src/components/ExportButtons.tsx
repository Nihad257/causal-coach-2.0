import { useState } from "react";
import { Download, FileText, Copy, Check, Share2 } from "lucide-react";
import { Button } from "./ui/button";
import { toast } from "sonner";
import type { ITSResult } from "../lib/stats/its";
import { fmtNum, fmtPct } from "../lib/format";
import { generatePdfReport } from "../lib/export/pdf";

interface Props {
  result: ITSResult;
  verdict: string;
  dwStat: number;
}

export function ExportButtons({ result, verdict, dwStat }: Props) {
  const [copied, setCopied] = useState(false);

  const downloadCSV = () => {
    const rows = ["date,actual,counterfactual,effect,ci_low,ci_high"];
    for (const p of result.series) {
      rows.push(
        `${p.date},${p.actual},${fmtNum(p.counterfactual, 4)},${fmtNum(p.effect, 4)},${fmtNum(p.ci_low, 4)},${fmtNum(p.ci_high, 4)}`,
      );
    }
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "causalcoach-results.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadPDF = async () => {
    try {
      await generatePdfReport({ result, verdict, dwStat });
    } catch (e) {
      console.error(e);
      toast.error("Report could not be generated. Download the CSV instead.");
    }
  };

  const copyMarkdown = async () => {
    const o = result.overall;
    const md = [
      `# CausalCoach results`,
      ``,
      `${verdict}`,
      ``,
      `| Metric | Value |`,
      `| --- | --- |`,
      `| Average effect | ${fmtNum(o.effect_avg)} |`,
      `| 95% CI | [${fmtNum(o.effect_ci[0])}, ${fmtNum(o.effect_ci[1])}] |`,
      `| Relative lift | ${fmtPct(o.relative_lift_pct, 2)} |`,
      `| Probability > 0 | ${fmtPct(o.prob_positive * 100, 1)} |`,
      `| R² (pre) | ${fmtPct(result.fit.rSquared * 100, 1)} |`,
      `| Pre-period RMSE | ${fmtNum(result.fit.rmse)} |`,
      `| Durbin-Watson | ${fmtNum(dwStat)} |`,
    ].join("\n");
    try {
      await navigator.clipboard.writeText(md);
      setCopied(true);
      toast.success("Markdown copied to clipboard");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Could not copy to clipboard");
    }
  };

  const shareTool = async () => {
    const text = `I used CausalCoach to measure my campaign's real impact 📊\n\nFree tool — no signup needed, data never leaves your browser:\nhttps://causalcoachbeta.lovable.app`;
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied!", { duration: 2000 });
    } catch {
      toast.error("Could not copy to clipboard");
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" onClick={downloadCSV}>
        <Download className="mr-1.5 h-3.5 w-3.5" />
        Download CSV
      </Button>
      <Button variant="outline" size="sm" onClick={downloadPDF}>
        <FileText className="mr-1.5 h-3.5 w-3.5" />
        Download PDF report
      </Button>
      <Button variant="outline" size="sm" onClick={copyMarkdown}>
        {copied ? <Check className="mr-1.5 h-3.5 w-3.5 text-success" /> : <Copy className="mr-1.5 h-3.5 w-3.5" />}
        Copy as Markdown
      </Button>
      <Button variant="outline" size="sm" onClick={shareTool}>
        <Share2 className="mr-1.5 h-3.5 w-3.5" />
        Share this tool
      </Button>
    </div>
  );
}
