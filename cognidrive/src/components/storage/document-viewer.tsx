"use client";

import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { DeleteFileDialog } from "./delete-file-dialog";
import type { StoredFile } from "@/types";
import { FileText, Trash2 } from "lucide-react";
import { formatBytes } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

interface DocumentViewerProps {
  file: StoredFile | null;
  onDelete?: (id: string) => void;
}

export function DocumentViewer({ file, onDelete }: DocumentViewerProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/files/${id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || "Delete failed");
    }
    toast({
      title: "File deleted",
      description: data.freedBytes
        ? `${formatBytes(data.freedBytes)} freed in cloud storage`
        : "Removed from your library",
    });
    onDelete?.(id);
  };

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
      <div className="border-b px-4 py-3 bg-background flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold truncate">{file.name}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {file.type} · {formatBytes(file.size)} · Uploaded{" "}
            {new Date(file.created_at).toLocaleDateString()}
          </p>
        </div>
        {onDelete && (
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1">
        {isPdf ? (
          <div className="p-4">
            <div className="rounded-lg border bg-white p-6 shadow-sm dark:bg-zinc-950">
              <pre className="whitespace-pre-wrap text-sm leading-relaxed font-sans text-gray-800 dark:text-gray-200">
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

      <DeleteFileDialog
        file={file}
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={handleDelete}
      />
    </div>
  );
}
