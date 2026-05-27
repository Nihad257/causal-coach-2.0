import { useCallback, useRef, useState } from "react";
import { UploadCloud, FileSpreadsheet, Download, AlertCircle, X } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "./ui/button";
import { parseCSV, type ParsedCSV, type ValidationError } from "../lib/stats/validation";
import { buildSampleCSV } from "../lib/stats/sample-data";

const MAX_MB = 10;

interface Props {
  label: string;
  description?: string;
  onParsed: (file: File, text: string, data: ParsedCSV) => void;
  onError?: (err: ValidationError) => void;
  isCovariates?: boolean;
  dayfirst?: boolean;
  showSampleButton?: boolean;
  parsedSummary?: string | null;
  onClear?: () => void;
}

export function FileUpload({
  label,
  description,
  onParsed,
  onError,
  isCovariates = false,
  dayfirst = false,
  showSampleButton = false,
  parsedSummary = null,
  onClear,
}: Props) {
  const [dragging, setDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string[][] | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (f: File) => {
      setLocalError(null);
      setPreview(null);
      if (!/\.csv$/i.test(f.name)) {
        const err = "Only .csv files are supported.";
        setLocalError(err);
        onError?.({ code: "PARSE_FAILURE", message: err });
        return;
      }
      if (f.size > MAX_MB * 1024 * 1024) {
        const err = `File exceeds the ${MAX_MB} MB limit.`;
        setLocalError(err);
        onError?.({ code: "PARSE_FAILURE", message: err });
        return;
      }
      const text = await f.text();
      // Local 3-row preview for confidence
      const previewLines = text.split(/\r?\n/).slice(0, 4).filter(Boolean);
      setPreview(previewLines.map((l) => l.split(",")));
      const parsed = parseCSV(text, { dayfirst, isCovariates });
      if (!parsed.ok) {
        setLocalError(parsed.error.message);
        onError?.(parsed.error);
        return;
      }
      onParsed(f, text, parsed.data);
    },
    [dayfirst, isCovariates, onError, onParsed],
  );

  const downloadSample = () => {
    const blob = new Blob([buildSampleCSV()], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "causalcoach-sample.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <div>
          <h3 className="text-sm font-medium">{label}</h3>
          {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
        </div>
        {showSampleButton && (
          <Button variant="ghost" size="sm" onClick={downloadSample} className="text-xs">
            <Download className="mr-1 h-3 w-3" />
            Sample CSV
          </Button>
        )}
      </div>

      {parsedSummary ? (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-3 text-sm"
        >
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-primary" />
            <span className="font-medium">{parsedSummary}</span>
          </div>
          {onClear && (
            <Button variant="ghost" size="icon" onClick={onClear} aria-label="Remove file">
              <X className="h-4 w-4" />
            </Button>
          )}
        </motion.div>
      ) : (
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const f = e.dataTransfer.files?.[0];
            if (f) handleFile(f);
          }}
          className={`block cursor-pointer rounded-lg border-2 border-dashed px-6 py-8 text-center transition-colors ${
            dragging
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/60 hover:bg-secondary/40"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
          <UploadCloud className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-2 text-sm">
            <span className="font-medium text-foreground">Click to upload</span>
            <span className="text-muted-foreground"> or drag and drop</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">CSV up to {MAX_MB} MB</p>
        </label>
      )}

      {localError && (
        <div className="mt-3 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{localError}</span>
        </div>
      )}

      {preview && !parsedSummary && (
        <div className="mt-3 overflow-x-auto rounded-md border border-border">
          <table className="w-full text-xs tnum">
            <tbody>
              {preview.map((row, i) => (
                <tr key={i} className={i === 0 ? "bg-secondary/60 font-medium" : ""}>
                  {row.map((cell, j) => (
                    <td key={j} className="border-b border-border/60 px-3 py-1.5 last:border-r-0">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
