import { useState } from "react";
import { CalendarIcon, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Button } from "./ui/button";
import { Calendar } from "./ui/calendar";
import { Input } from "./ui/input";
import { HintTip } from "./HintTip";
import type { ParsedRow } from "../lib/stats/validation";

export interface CampaignEntry {
  id: string;
  date: Date | undefined;
  label: string;
}

interface Props {
  rows: ParsedRow[];
  campaigns: CampaignEntry[];
  onChange: (next: CampaignEntry[]) => void;
}

const newId = () => Math.random().toString(36).slice(2, 9);

export function CampaignConfig({ rows, campaigns, onChange }: Props) {
  if (campaigns.length === 0) {
    // Initialise with one campaign on first render
    onChange([{ id: newId(), date: undefined, label: "Campaign 1" }]);
  }
  const minDate = rows.length ? new Date(rows[Math.min(20, rows.length - 1)].date) : undefined;
  const maxDate = rows.length ? new Date(rows[Math.max(0, rows.length - 5)].date) : undefined;

  const countSplit = (d: Date | undefined) => {
    if (!d || !rows.length) return { pre: 0, post: 0 };
    const t = d.getTime();
    let pre = 0;
    for (const r of rows) if (r.date.getTime() < t) pre++;
    return { pre, post: rows.length - pre };
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1 text-sm font-medium">
        Campaign dates
        <HintTip label="Campaign date help">
          The date when your campaign launched. Rows before this date are used to fit the model
          and predict what would have happened without the campaign.
        </HintTip>
      </div>

      {campaigns.map((c, idx) => {
        const split = countSplit(c.date);
        const warnPre = split.pre > 0 && split.pre < 30;
        const warnPost = split.post > 0 && split.post < 10;
        return (
          <div key={c.id} className="rounded-lg border border-border bg-card p-3 space-y-3">
            <div className="flex items-center gap-2">
              <Input
                value={c.label}
                onChange={(e) => {
                  const next = [...campaigns];
                  next[idx] = { ...c, label: e.target.value };
                  onChange(next);
                }}
                className="h-8 max-w-[12rem] text-sm"
                placeholder="Campaign name"
              />
              {campaigns.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onChange(campaigns.filter((x) => x.id !== c.id))}
                  aria-label="Remove campaign"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={`h-9 justify-start gap-2 font-normal ${!c.date ? "text-muted-foreground" : ""}`}
                  >
                    <CalendarIcon className="h-4 w-4" />
                    {c.date ? format(c.date, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={c.date}
                    onSelect={(d) => {
                      const next = [...campaigns];
                      next[idx] = { ...c, date: d ?? undefined };
                      onChange(next);
                    }}
                    fromDate={minDate}
                    toDate={maxDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              {c.date && (
                <div className="text-xs tnum text-muted-foreground">
                  <span className={warnPre ? "text-amber-500" : ""}>{split.pre} pre-rows</span>
                  <span className="mx-1.5">·</span>
                  <span className={warnPost ? "text-amber-500" : ""}>{split.post} post-rows</span>
                </div>
              )}
            </div>

            {(warnPre || warnPost) && (
              <p className="text-xs text-amber-500">
                {warnPre && "Fewer than 30 pre-campaign rows may produce a wide confidence interval. "}
                {warnPost && "Fewer than 10 post-campaign rows limits how much the model can learn about the campaign effect."}
              </p>
            )}
          </div>
        );
      })}

      {campaigns.length < 3 && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onChange([...campaigns, { id: newId(), date: undefined, label: `Campaign ${campaigns.length + 1}` }])}
        >
          <Plus className="mr-1 h-3 w-3" />
          Add another campaign
        </Button>
      )}
    </div>
  );
}
