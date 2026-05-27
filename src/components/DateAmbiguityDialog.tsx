import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";

interface Props {
  open: boolean;
  sampleRaw: string;
  onChoose: (dayfirst: boolean) => void;
  onCancel: () => void;
}

export function DateAmbiguityDialog({ open, sampleRaw, onChoose, onCancel }: Props) {
  // Try to surface the first two numeric segments for clarity.
  const m = sampleRaw.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  const a = m ? +m[1] : 1;
  const b = m ? +m[2] : 2;
  const yr = m ? m[3] : "2024";
  const monthName = (n: number) =>
    ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][n - 1] ?? "?";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ambiguous date format</DialogTitle>
          <DialogDescription>
            Your CSV contains a date like <code className="rounded bg-secondary px-1.5 py-0.5">{sampleRaw}</code>.
            We can&apos;t tell which number is the month and which is the day.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          <Button variant="outline" className="h-auto py-4 flex-col gap-1" onClick={() => onChoose(false)}>
            <span className="text-xs text-muted-foreground">Month/Day/Year (US)</span>
            <span className="text-sm font-medium">{monthName(a)} {b}, {yr}</span>
          </Button>
          <Button variant="outline" className="h-auto py-4 flex-col gap-1" onClick={() => onChoose(true)}>
            <span className="text-xs text-muted-foreground">Day/Month/Year (EU/ISO)</span>
            <span className="text-sm font-medium">{a} {monthName(b)} {yr}</span>
          </Button>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
