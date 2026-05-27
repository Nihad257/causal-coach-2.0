import { Link } from "@tanstack/react-router";

export function Footer() {
  return (
    <footer className="mt-20 border-t border-border/60 py-8">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 text-xs text-muted-foreground sm:flex-row">
        <p>
          CausalCoach · Open source causal inference for marketers. All computation runs locally in
          your browser.
        </p>
        <div className="flex items-center gap-4">
          <Link to="/methodology" className="hover:text-foreground">Methodology</Link>
          <Link to="/about" className="hover:text-foreground">About</Link>
        </div>
      </div>
    </footer>
  );
}
