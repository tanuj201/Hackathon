"use client";

import { useCallback, useState } from "react";
import { Upload, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

interface FileUploaderProps {
  onUploadComplete: () => void;
}

async function parseJsonResponse(res: Response) {
  const text = await res.text();
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error(
      text.slice(0, 200) || `Server error (${res.status}). Check Vercel function logs.`
    );
  }
}

export function FileUploader({ onUploadComplete }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const uploadFile = useCallback(
    async (file: File) => {
      setIsUploading(true);
      toast({ title: "Uploading...", description: file.name });

      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/files", { method: "POST", body: formData });
        const data = await parseJsonResponse(res);

        if (!res.ok) {
          throw new Error(String(data.error || "Upload failed"));
        }

        const warnings = [data.storageWarning, data.embeddingWarning].filter(Boolean);
        toast({
          title: "Upload complete",
          description: warnings.length
            ? `${file.name} saved. ${String(warnings[0])}`
            : `${file.name} indexed with ${data.chunksStored ?? 0} chunks`,
        });
        onUploadComplete();
      } catch (err) {
        toast({
          title: "Upload failed",
          description: err instanceof Error ? err.message : "Unknown error",
          variant: "destructive",
        });
      } finally {
        setIsUploading(false);
      }
    },
    [onUploadComplete]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) uploadFile(file);
    },
    [uploadFile]
  );

  return (
    <div
      className={cn(
        "mx-4 my-3 flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors cursor-pointer",
        isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50",
        isUploading && "pointer-events-none opacity-60"
      )}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => {
        if (isUploading) return;
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".pdf,.txt,.csv,.md";
        input.onchange = (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (file) uploadFile(file);
        };
        input.click();
      }}
    >
      {isUploading ? (
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      ) : (
        <Upload className="h-8 w-8 text-muted-foreground" />
      )}
      <p className="mt-2 text-sm font-medium">
        {isUploading ? "Processing..." : "Drop files here"}
      </p>
      <p className="text-xs text-muted-foreground">PDF, TXT, CSV</p>
    </div>
  );
}
