# CausalCoach 2.0 – Did your campaign actually work?

A free web tool that helps marketers, founders, and analysts answer one question:  
**“Did my marketing campaign cause the change in sales, or was it just noise?”**

No signup, no data leaves your browser, and it's completely free.

🔗 **Live app (Lovable)** : [https://causal-coach-2.lovable.app](https://causal-coach-2.lovable.app)  
*(Vercel deployment coming soon – check back later)*

---

## 🎯 What it does

1. Upload your sales data (CSV with `date` and `y` columns)
2. Select your campaign start date
3. Get a clear answer:

- Average causal effect + 95% confidence interval
- Probability the effect is real (not random noise)
- Visual counterfactual (what would have happened without the campaign)
- Model diagnostics (RMSE, Durbin-Watson, placebo tests, CUSUM)
- Export results as CSV, PDF, or Markdown

---

## 🧠 How it works

CausalCoach uses **Interrupted Time Series (ITS) analysis** with HC3 robust standard errors. It learns the normal sales pattern from pre‑campaign data, projects a counterfactual (what would have happened without the campaign), and compares it to actual post‑campaign performance.

Key statistical features:
- Automatic seasonality detection (daily/weekly/monthly)
- HC3 heteroscedasticity‑robust confidence intervals
- Multi‑campaign support (up to 3 intervention dates)
- 10 placebo tests to validate results
- Sensitivity analysis (±20% trend assumption)

---

## 📂 Sample dataset

A 52‑week synthetic dataset is built into the app. Try it with campaign start date `Week 32` to see a clean +18 unit lift.

---

## 🚀 Deployed on

- **Live app (Lovable)** : [https://causal-coach-2.lovable.app](https://causal-coach-2.lovable.app)
- **GitHub repo** : [https://github.com/Nihad257/causal-coach-2.0](https://github.com/Nihad257/causal-coach-2.0)
- **Vercel** – coming soon

---

## 🛠️ Tech stack

- React + TypeScript + Tailwind CSS
- Recharts (interactive charts)
- Custom OLS + HC3 stats engine in TypeScript (no backend)
- jsPDF for PDF export
- 100% client‑side — your data never leaves your browser

---

## 📄 License

MIT — free to use, modify, and share.

---

## 🙋 Feedback & contributions

Open an issue or pull request on [GitHub](https://github.com/Nihad257/causal-coach-2.0).
