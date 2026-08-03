"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table2, Loader2, Download, Search } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { downloadBlob, exportToCSV } from "@/lib/utils";
import type { AIModel, ExtractedTable, StoredFile } from "@/types";

interface DataTableExtractorProps {
  file: StoredFile | null;
  model: AIModel;
}

export function DataTableExtractor({ file, model }: DataTableExtractorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [table, setTable] = useState<ExtractedTable | null>(null);
  const [filter, setFilter] = useState("");

  const generate = async () => {
    if (!file) return;
    setIsGenerating(true);
    toast({ title: "Extracting data...", description: "Analyzing document for structured data" });

    try {
      const res = await fetch("/api/studio/table", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId: file.id, model }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setTable(data.table);
      toast({ title: "Data extracted", description: `${data.table.rows.length} rows found` });
    } catch (err) {
      toast({
        title: "Extraction failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const filteredRows = useMemo(() => {
    if (!table) return [];
    if (!filter.trim()) return table.rows;
    const q = filter.toLowerCase();
    return table.rows.filter((row) =>
      Object.values(row).some((v) => String(v ?? "").toLowerCase().includes(q))
    );
  }, [table, filter]);

  const handleExport = () => {
    if (!table) return;
    const csv = exportToCSV(table.columns, filteredRows);
    const blob = new Blob([csv], { type: "text/csv" });
    downloadBlob(blob, `${file?.name || "data"}-extracted.csv`);
    toast({ title: "Exported to CSV" });
  };

  if (!file) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground p-4">
        <p className="text-sm">Select a document to extract structured data</p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-3 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Table2 className="h-5 w-5 text-primary shrink-0" />
          <h3 className="font-semibold truncate">Data Table Extractor</h3>
        </div>
        <Button onClick={generate} disabled={isGenerating} className="shrink-0">
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Extracting...
            </>
          ) : (
            "Extract Data Table"
          )}
        </Button>
      </div>

      {table ? (
        <div className="flex flex-1 min-h-0 flex-col gap-3 px-4 pb-4 overflow-hidden">
          <div className="flex items-center gap-2 shrink-0">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Search / filter rows..."
                className="pl-9"
              />
            </div>
            <Button variant="outline" onClick={handleExport} className="shrink-0">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>

          <div className="flex-1 min-h-0 overflow-auto rounded-lg border bg-background">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-muted">
                <tr className="border-b">
                  {table.columns.map((col) => (
                    <th
                      key={col}
                      className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row, i) => (
                  <tr key={i} className="border-b hover:bg-muted/30 transition-colors">
                    {table.columns.map((col) => (
                      <td key={col} className="px-4 py-2.5 whitespace-nowrap max-w-[240px] truncate">
                        {row[col] ?? "—"}
                      </td>
                    ))}
                  </tr>
                ))}
                {filteredRows.length === 0 && (
                  <tr>
                    <td
                      colSpan={table.columns.length}
                      className="px-4 py-8 text-center text-muted-foreground"
                    >
                      No matching rows
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-muted-foreground shrink-0">
            Showing {filteredRows.length} of {table.rows.length} rows
          </p>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center text-muted-foreground px-4">
          <p className="text-sm text-center">
            Click &quot;Extract Data Table&quot; to pull structured rows from this document
          </p>
        </div>
      )}
    </div>
  );
}
