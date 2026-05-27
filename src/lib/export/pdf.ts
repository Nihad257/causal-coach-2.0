// PDF report generation using jsPDF. One-page diagnostic summary with
// verdict, metrics table, and a snapshot of the main chart (SVG → PNG).

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { ITSResult } from "../stats/its";
import { fmtNum, fmtPct } from "../format";

const svgToPngDataUrl = async (svg: SVGElement, width: number, height: number): Promise<string | null> => {
  try {
    // Inline computed styles so colors survive the snapshot.
    const cloned = svg.cloneNode(true) as SVGElement;
    cloned.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    cloned.setAttribute("width", String(width));
    cloned.setAttribute("height", String(height));
    // Set a solid background matching current theme
    const bg = getComputedStyle(document.body).backgroundColor || "#ffffff";
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("width", "100%");
    rect.setAttribute("height", "100%");
    rect.setAttribute("fill", bg);
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
        ctx.fillStyle = bg;
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

  // Chart snapshot (best-effort)
  const svg = document.querySelector(".causalcoach-main-chart svg") as SVGElement | null;
  if (svg) {
    const rect = svg.getBoundingClientRect();
    const png = await svgToPngDataUrl(svg, Math.max(rect.width, 600), Math.max(rect.height, 320));
    if (png) {
      const imgW = pageW - margin * 2;
      const imgH = (imgW * 320) / 600;
      doc.addImage(png, "PNG", margin, y, imgW, imgH);
      y += imgH + 12;
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
