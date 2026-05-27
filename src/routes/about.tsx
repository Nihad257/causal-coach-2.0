import { createFileRoute } from "@tanstack/react-router";
import { Github, Heart, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/about")({ component: About });

function About() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">About CausalCoach</h1>
      <p className="mt-3 text-muted-foreground">
        CausalCoach is an open-source tool that helps marketers, founders, and analysts tell the
        difference between a real campaign effect and seasonality, trend, or random noise — without
        having to learn regression themselves.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Card icon={ShieldCheck} title="Private by design">
          Every computation runs in your browser. Your CSV never leaves your machine — there is no
          server upload.
        </Card>
        <Card icon={Heart} title="Honest by default">
          We always use HC3 robust standard errors, autocorrelation checks, and placebo tests. We
          will refuse to fit if you don&apos;t have enough data.
        </Card>
      </div>

      <h2 className="mt-12 text-xl font-semibold tracking-tight">Open source</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        CausalCoach is MIT-licensed. Inspect the math, fork it, file an issue, send a PR. Suggestions
        and contributions are welcome.
      </p>
      <a
        href="https://github.com"
        target="_blank"
        rel="noreferrer"
        className="mt-4 inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm hover:bg-secondary"
      >
        <Github className="h-4 w-4" /> View on GitHub
      </a>
    </div>
  );
}

function Card({ icon: Icon, title, children }: { icon: typeof Heart; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <Icon className="h-5 w-5 text-primary" />
      <h3 className="mt-3 font-medium">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{children}</p>
    </div>
  );
}
