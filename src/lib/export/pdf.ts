// PDF report generation using jsPDF. One-page diagnostic summary with
// verdict, metrics table, and a snapshot of the main chart (SVG → PNG).

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { ITSResult } from "../stats/its";
import { fmtNum, fmtPct } from "../format";

// Print-friendly color overrides applied to .causalcoach-main-chart while
// taking the snapshot. CSS vars below match those used in MainChart.tsx so
// Recharts elements pick up the overrides without any component changes.
const PRINT_OVERRIDE_CSS = `
.causalcoach-pdf-print-mode .causalcoach-main-chart,
.causalcoach-pdf-print-mode .causalcoach-main-chart * {
  --color-chart-actual: #1e40af;
  --color-chart-counter: #6b7280;
  --color-chart-band: #dbeafe;
  --color-muted-foreground: #111827;
  --color-border: #e5e7eb;
  --color-popover: #ffffff;
  --color-card: #ffffff;
  --color-primary: #1e40af;
}
.causalcoach-pdf-print-mode .causalcoach-main-chart {
  background: #ffffff !important;
}
.causalcoach-pdf-print-mode .causalcoach-main-chart .recharts-cartesian-grid line {
  stroke: #e5e7eb !important;
}
.causalcoach-pdf-print-mode .causalcoach-main-chart text {
  fill: #111827 !important;
}
`;

// Walk the original SVG and copy resolved stroke/fill/color into matching
// nodes on the clone as inline attributes. This is necessary because
// serialized SVGs lose CSS var() resolution.
const inlineComputedStyles = (orig: Element, clone: Element) => {
  const cs = getComputedStyle(orig);
  const stroke = cs.stroke;
  const fill = cs.fill;
  const color = cs.color;
  if (stroke && stroke !== "none" && !stroke.includes("var(")) {
    clone.setAttribute("stroke", stroke);
  }
  if (fill && fill !== "none" && !fill.includes("var(")) {
    clone.setAttribute("fill", fill);
  }
  if (color) (clone as HTMLElement).style.color = color;
  const oc = orig.children;
  const cc = clone.children;
  for (let i = 0; i < oc.length && i < cc.length; i++) {
    inlineComputedStyles(oc[i], cc[i]);
  }
};

const svgToPngDataUrl = async (svg: SVGElement, width: number, height: number): Promise<string | null> => {
  try {
    const cloned = svg.cloneNode(true) as SVGElement;
    cloned.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    cloned.setAttribute("width", String(width));
    cloned.setAttribute("height", String(height));

    // Inline computed styles from the (currently overridden) original tree.
    inlineComputedStyles(svg, cloned);

    // White background rect
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("width", "100%");
    rect.setAttribute("height", "100%");
    rect.setAttribute("fill", "#ffffff");
    cloned.insertBefore(rect, cloned.firstChild);

    const xml = new XMLSerializer().serializeToString(cloned);
    const svg64 = btoa(unescape(encodeURIComponent(xml)));
    const dataUrl = `data:image/svg+xml;base64,${svg64}`;

    return await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const scale = 2;
        canvas.width = width * scale;
        canvas.height = height * scale;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("no ctx"));
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = () => resolve(null);
      img.src = dataUrl;
    });
  } catch {
    return null;
  }
};

interface Args {
  result: ITSResult;
  verdict: string;
  dwStat: number;
}

export async function generatePdfReport({ result, verdict, dwStat }: Args) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 36;
  let y = margin;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("CausalCoach diagnostic report", margin, y);
  y += 22;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(110);
  doc.text(new Date().toLocaleString(), margin, y);
  y += 18;

  doc.setTextColor(20);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Verdict", margin, y);
  y += 14;
  doc.setFont("helvetica", "normal");
  const verdictLines = doc.splitTextToSize(verdict, pageW - margin * 2);
  doc.text(verdictLines, margin, y);
  y += verdictLines.length * 14 + 8;

  // Chart snapshot — temporarily apply print-friendly color overrides so the
  // chart is readable on white paper, then restore original styles.
  const svg = document.querySelector(".causalcoach-main-chart svg") as SVGElement | null;
  if (svg) {
    const styleEl = document.createElement("style");
    styleEl.setAttribute("data-causalcoach-pdf", "true");
    styleEl.textContent = PRINT_OVERRIDE_CSS;
    document.head.appendChild(styleEl);
    document.documentElement.classList.add("causalcoach-pdf-print-mode");
    // Force a reflow so computed styles reflect the overrides.
    void svg.getBoundingClientRect();

    try {
      const rect = svg.getBoundingClientRect();
      const png = await svgToPngDataUrl(svg, Math.max(rect.width, 600), Math.max(rect.height, 320));
      if (png) {
        const imgW = pageW - margin * 2;
        const imgH = (imgW * 320) / 600;
        doc.addImage(png, "PNG", margin, y, imgW, imgH);
        y += imgH + 12;
      }
    } finally {
      document.documentElement.classList.remove("causalcoach-pdf-print-mode");
      styleEl.remove();
    }
  }

  const o = result.overall;
  autoTable(doc, {
    startY: y,
    head: [["Metric", "Value"]],
    body: [
      ["Average causal effect", fmtNum(o.effect_avg)],
      ["95% confidence interval", `[${fmtNum(o.effect_ci[0])}, ${fmtNum(o.effect_ci[1])}]`],
      ["Relative lift", fmtPct(o.relative_lift_pct, 2)],
      ["Probability effect > 0", fmtPct(o.prob_positive * 100, 1)],
      ["Pre-period RMSE", fmtNum(result.fit.rmse)],
      ["R² (pre-period)", fmtPct(result.fit.rSquared * 100, 1)],
      ["Durbin-Watson", fmtNum(dwStat)],
      ["Pre-period rows", String(result.preCount)],
      ["Post-period rows", String(result.postCount)],
      ["Cadence", result.cadence.cadence],
    ],
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: [99, 102, 241], textColor: 255 },
    margin: { left: margin, right: margin },
  });

  doc.save("causalcoach-report.pdf");
}
