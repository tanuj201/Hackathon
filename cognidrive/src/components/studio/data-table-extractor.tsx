"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
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
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <p className="text-sm">Select a document to extract structured data</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col p-4 gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Table2 className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Data Table Extractor</h3>
        </div>
        <Button onClick={generate} disabled={isGenerating}>
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

      {table && (
        <>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Search / filter rows..."
                className="pl-9"
              />
            </div>
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>

          <ScrollArea className="flex-1 rounded-lg border">
            <div className="min-w-full">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    {table.columns.map((col) => (
                      <th
                        key={col}
                        className="px-4 py-3 text-left font-medium text-muted-foreground"
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
                        <td key={col} className="px-4 py-2.5">
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
          </ScrollArea>
          <p className="text-xs text-muted-foreground">
            Showing {filteredRows.length} of {table.rows.length} rows
          </p>
        </>
      )}
    </div>
  );
}
