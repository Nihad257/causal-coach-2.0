// CSV parsing + strict validation per CausalCoach engineering rules.
// All errors are user-facing strings — never throw raw parser errors to the UI.

import Papa from "papaparse";

export interface ParsedRow {
  date: Date;
  y: number;
  raw: Record<string, string>;
}

export interface ParsedCSV {
  rows: ParsedRow[];
  extraColumns: string[]; // numeric covariate column names (excluding date, y)
  ambiguous: boolean; // true if any row has day<=12 AND month<=12 — requires user choice
  cadenceHint: string;
}

export type ValidationError = {
  code:
    | "EMPTY_FILE"
    | "MISSING_COLUMNS"
    | "BAD_DATES"
    | "BAD_Y_VALUES"
    | "TOO_FEW_ROWS"
    | "PARSE_FAILURE";
  message: string;
  details?: string[];
};

const MAX_BYTES = 10 * 1024 * 1024;

const findColumn = (headers: string[], target: string): string | null => {
  const lower = target.toLowerCase();
  for (const h of headers) if (h.toLowerCase().trim() === lower) return h;
  return null;
};

const parseDate = (raw: string, dayfirst: boolean): Date | null => {
  const s = raw.trim();
  if (!s) return null;
  // ISO YYYY-MM-DD or YYYY/MM/DD
  const iso = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (iso) {
    const d = new Date(+iso[1], +iso[2] - 1, +iso[3]);
    return isNaN(d.getTime()) ? null : d;
  }
  // DD/MM/YYYY or MM/DD/YYYY
  const dm = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dm) {
    const a = +dm[1];
    const b = +dm[2];
    const year = +dm[3];
    const day = dayfirst ? a : b;
    const month = dayfirst ? b : a;
    const d = new Date(year, month - 1, day);
    return isNaN(d.getTime()) ? null : d;
  }
  const native = new Date(s);
  return isNaN(native.getTime()) ? null : native;
};

const isAmbiguousDateString = (raw: string): boolean => {
  const m = raw.trim().match(/^(\d{1,2})[-/](\d{1,2})[-/]\d{4}$/);
  if (!m) return false;
  const a = +m[1];
  const b = +m[2];
  return a <= 12 && b <= 12 && a !== b;
};

export const parseCSV = (
  text: string,
  opts: { dayfirst: boolean; isCovariates?: boolean } = { dayfirst: false },
): { ok: true; data: ParsedCSV } | { ok: false; error: ValidationError } => {
  if (!text.trim()) {
    return { ok: false, error: { code: "EMPTY_FILE", message: "The uploaded file is empty." } };
  }
  if (text.length > MAX_BYTES) {
    return {
      ok: false,
      error: { code: "PARSE_FAILURE", message: "File exceeds the 10 MB limit." },
    };
  }

  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  if (!parsed.data.length) {
    return { ok: false, error: { code: "EMPTY_FILE", message: "No data rows found in the file." } };
  }

  const headers = parsed.meta.fields ?? [];
  const dateCol = findColumn(headers, "date");
  const yCol = opts.isCovariates ? null : findColumn(headers, "y");

  if (!dateCol) {
    return {
      ok: false,
      error: {
        code: "MISSING_COLUMNS",
        message: "Your CSV must include a 'date' column.",
      },
    };
  }
  if (!opts.isCovariates && !yCol) {
    return {
      ok: false,
      error: {
        code: "MISSING_COLUMNS",
        message: "Your CSV must have a 'date' column and a 'y' column.",
      },
    };
  }

  let ambiguous = false;
  const rows: ParsedRow[] = [];
  const badY: string[] = [];
  const badDates: string[] = [];

  parsed.data.forEach((row, idx) => {
    const rawDate = row[dateCol] ?? "";
    if (isAmbiguousDateString(rawDate)) ambiguous = true;
    const d = parseDate(rawDate, opts.dayfirst);
    if (!d) {
      if (badDates.length < 5) badDates.push(`row ${idx + 2}: "${rawDate}"`);
      return;
    }

    let yVal = 0;
    if (yCol) {
      const yRaw = row[yCol] ?? "";
      const num = Number(yRaw);
      if (yRaw === "" || !Number.isFinite(num)) {
        if (badY.length < 5) badY.push(`row ${idx + 2}: "${yRaw}"`);
        return;
      }
      yVal = num;
    }
    rows.push({ date: d, y: yVal, raw: row });
  });

  if (badDates.length) {
    return {
      ok: false,
      error: {
        code: "BAD_DATES",
        message: "Some date values could not be parsed.",
        details: badDates,
      },
    };
  }
  if (badY.length) {
    return {
      ok: false,
      error: {
        code: "BAD_Y_VALUES",
        message: "Column 'y' contains non-numeric values.",
        details: badY,
      },
    };
  }
  if (rows.length === 0) {
    return {
      ok: false,
      error: { code: "TOO_FEW_ROWS", message: "No valid rows after parsing." },
    };
  }

  // Sort ascending and collect extra numeric columns (covariates).
  rows.sort((a, b) => a.date.getTime() - b.date.getTime());

  const extraColumns: string[] = [];
  for (const h of headers) {
    if (h === dateCol || h === yCol) continue;
    // Treat as numeric covariate if at least one row has a finite number
    const numeric = rows.some((r) => Number.isFinite(Number(r.raw[h] ?? "")));
    if (numeric) extraColumns.push(h);
  }

  return {
    ok: true,
    data: {
      rows,
      extraColumns,
      ambiguous: ambiguous && rows.length > 0,
      cadenceHint:
        rows.length >= 2
          ? `${rows[0].date.toISOString().slice(0, 10)} → ${rows[rows.length - 1].date
              .toISOString()
              .slice(0, 10)}`
          : "",
    },
  };
};

export const formatDate = (d: Date): string => d.toISOString().slice(0, 10);
