"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import type { StoredFile } from "@/types";
import { FileText } from "lucide-react";

interface DocumentViewerProps {
  file: StoredFile | null;
}

export function DocumentViewer({ file }: DocumentViewerProps) {
  if (!file) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-muted-foreground bg-muted/30">
        <FileText className="h-16 w-16 mb-4 opacity-20" />
        <p className="text-lg font-medium">Select a document</p>
        <p className="text-sm">Choose a file from the sidebar to preview</p>
      </div>
    );
  }

  const isPdf = file.type.includes("pdf") || file.name.endsWith(".pdf");

  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-4 py-3 bg-background">
        <h2 className="font-semibold truncate">{file.name}</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          {file.type} · Uploaded {new Date(file.created_at).toLocaleDateString()}
        </p>
      </div>
      <ScrollArea className="flex-1">
        {isPdf ? (
          <div className="p-4">
            <div className="rounded-lg border bg-white p-6 shadow-sm">
              <pre className="whitespace-pre-wrap text-sm leading-relaxed font-sans text-gray-800">
                {file.content_text || "No text content extracted from PDF."}
              </pre>
            </div>
          </div>
        ) : (
          <div className="p-4">
            <pre className="whitespace-pre-wrap text-sm leading-relaxed font-mono bg-muted/50 rounded-lg p-4">
              {file.content_text || "Empty document"}
            </pre>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
