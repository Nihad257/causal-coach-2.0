import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/methodology")({ component: Methodology });

function Methodology() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 prose-base">
      <h1 className="text-3xl font-semibold tracking-tight">Methodology</h1>
      <p className="mt-3 text-muted-foreground">
        CausalCoach uses Interrupted Time Series (ITS) regression to estimate the causal effect of a
        campaign by comparing what actually happened to a model-based prediction of what would have
        happened without it.
      </p>

      <Section title="The model">
        <p>We fit a regression on pre-campaign data only:</p>
        <pre className="rounded-md bg-card border border-border p-3 text-xs overflow-x-auto">
{`y_t = β0 + β1·time + β2·sin(2π·t/P) + β3·cos(2π·t/P) + (covariates) + ε`}
        </pre>
        <p>
          The sine and cosine terms capture seasonality. Period <em>P</em> is auto-detected from your
          data: 7 for daily, 52 for weekly, 12 for monthly. We use{" "}
          <strong>HC3 heteroscedasticity-consistent standard errors</strong> for all confidence
          intervals — we do not assume the residual variance is constant.
        </p>
      </Section>

      <Section title="The counterfactual">
        <p>
          We then use the fitted model to predict <em>what y would have been</em> in the post-period,
          had the campaign not happened. The difference between actual and predicted is the
          estimated effect. A 95% confidence band around the prediction shows model uncertainty.
        </p>
      </Section>

      <Section title='What does "probability effect &gt; 0" mean?'>
        <p>
          Using the HC3 covariance of the average effect, we compute the probability under the
          sampling distribution that the true effect is positive. Values above 80% suggest strong
          evidence; 60–80% is moderate; below 60% the effect is plausibly noise.
        </p>
      </Section>

      <Section title="Diagnostics">
        <ul className="list-disc pl-5 space-y-1.5">
          <li><strong>RMSE & R²</strong>: how well the model fits the pre-period.</li>
          <li><strong>Durbin-Watson</strong>: tests residual autocorrelation. 1.5–2.5 is acceptable.</li>
          <li><strong>CUSUM</strong>: cumulative residual sum — drift suggests parameter instability.</li>
          <li><strong>Placebo tests</strong>: shifting the campaign date back into the pre-period should produce near-zero effects.</li>
        </ul>
      </Section>

      <Section title="FAQ">
        <h3 className="font-medium mt-3">What if I have fewer than 20 pre-campaign points?</h3>
        <p className="text-sm text-muted-foreground">
          CausalCoach will refuse to fit the model. With too little pre-period data, the trend and
          seasonality estimates become unreliable, and so does the counterfactual.
        </p>
        <h3 className="font-medium mt-4">What does Durbin-Watson mean?</h3>
        <p className="text-sm text-muted-foreground">
          It checks whether consecutive residuals are correlated. Strong autocorrelation means the
          standard errors are too small and the CIs too narrow — your conclusion could be more
          uncertain than the model suggests.
        </p>
        <h3 className="font-medium mt-4">When should I NOT trust this result?</h3>
        <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1.5 mt-2">
          <li>Placebo tests show large fake effects of similar magnitude to your real one.</li>
          <li>Durbin-Watson is well outside [1.5, 2.5].</li>
          <li>R² is very low (model isn&apos;t capturing the pre-period dynamics).</li>
          <li>Another major event (price change, viral moment, outage) coincided with your campaign.</li>
          <li>The sensitivity slider flips the sign of the effect with a small change in trend.</li>
        </ul>
      </Section>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed">{children}</div>
    </section>
  );
}
