"use client";

import { FileText, FileSpreadsheet, File, Trash2 } from "lucide-react";
import { cn, formatBytes } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
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
    return <FileText className="h-4 w-4 text-red-500" />;
  if (type.includes("csv") || name.endsWith(".csv"))
    return <FileSpreadsheet className="h-4 w-4 text-green-500" />;
  return <File className="h-4 w-4 text-blue-500" />;
}

export function FileList({ files, selectedId, onSelect, onDelete }: FileListProps) {
  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/files/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      toast({ title: "File deleted" });
      onDelete(id);
    } catch {
      toast({ title: "Delete failed", variant: "destructive" });
    }
  };

  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <File className="h-12 w-12 mb-2 opacity-30" />
        <p className="text-sm">No documents yet</p>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1 px-2">
      <div className="space-y-1 pb-4">
        {files.map((file) => (
          <div
            key={file.id}
            className={cn(
              "group flex items-center gap-3 rounded-lg px-3 py-2.5 cursor-pointer transition-colors",
              selectedId === file.id
                ? "bg-primary/10 text-primary"
                : "hover:bg-muted"
            )}
            onClick={() => onSelect(file)}
          >
            <FileIcon type={file.type} name={file.name} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{file.name}</p>
              <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 group-hover:opacity-100"
              onClick={(e) => handleDelete(e, file.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
