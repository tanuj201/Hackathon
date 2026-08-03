"use client";

import { useCallback, useState } from "react";
import { FileText, FileSpreadsheet, File, Trash2, Loader2 } from "lucide-react";
import { cn, formatBytes } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DeleteFileDialog } from "./delete-file-dialog";
import type { StoredFile } from "@/types";
import { toast } from "@/hooks/use-toast";

interface FileListProps {
  files: StoredFile[];
  selectedId: string | null;
  onSelect: (file: StoredFile) => void;
  onDelete: (id: string) => void;
}

function FileIcon({ type, name }: { type: string; name: string }) {
  if (type.includes("pdf") || name.endsWith(".pdf"))
    return <FileText className="h-4 w-4 text-red-500 shrink-0" />;
  if (type.includes("csv") || name.endsWith(".csv"))
    return <FileSpreadsheet className="h-4 w-4 text-green-500 shrink-0" />;
  return <File className="h-4 w-4 text-blue-500 shrink-0" />;
}

export function FileList({ files, selectedId, onSelect, onDelete }: FileListProps) {
  const [fileToDelete, setFileToDelete] = useState<StoredFile | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const deleteFile = useCallback(
    async (id: string) => {
      setDeletingId(id);
      try {
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
        onDelete(id);
      } catch (err) {
        toast({
          title: "Delete failed",
          description: err instanceof Error ? err.message : "Could not delete file",
          variant: "destructive",
        });
        throw err;
      } finally {
        setDeletingId(null);
      }
    },
    [onDelete]
  );

  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <File className="h-12 w-12 mb-2 opacity-30" />
        <p className="text-sm">No documents yet</p>
        <p className="text-xs mt-1">Upload PDF, TXT, or CSV files</p>
      </div>
    );
  }

  return (
    <>
      <ScrollArea className="flex-1 px-2">
        <div className="space-y-1 pb-4">
          {files.map((file) => {
            const isDeleting = deletingId === file.id;
            return (
              <div
                key={file.id}
                className={cn(
                  "group flex items-center gap-2 rounded-lg px-3 py-2.5 cursor-pointer transition-colors",
                  selectedId === file.id
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-muted",
                  isDeleting && "opacity-50 pointer-events-none"
                )}
                onClick={() => !isDeleting && onSelect(file)}
              >
                <FileIcon type={file.type} name={file.name} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatBytes(file.size)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 sm:opacity-70 sm:group-hover:opacity-100"
                  title="Delete file"
                  disabled={isDeleting}
                  onClick={(e) => {
                    e.stopPropagation();
                    setFileToDelete(file);
                  }}
                >
                  {isDeleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      <DeleteFileDialog
        file={fileToDelete}
        open={fileToDelete !== null}
        onOpenChange={(open) => !open && setFileToDelete(null)}
        onConfirm={deleteFile}
      />
    </>
  );
}
