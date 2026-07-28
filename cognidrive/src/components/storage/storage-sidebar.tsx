"use client";

import { StorageQuotaBar } from "./storage-quota";
import { FileUploader } from "./file-uploader";
import { FileList } from "./file-list";
import type { StoredFile, StorageQuota } from "@/types";
import { Brain } from "lucide-react";

interface StorageSidebarProps {
  files: StoredFile[];
  quota: StorageQuota;
  selectedId: string | null;
  onSelect: (file: StoredFile) => void;
  onRefresh: () => void;
  onDelete: (id: string) => void;
}

export function StorageSidebar({
  files,
  quota,
  selectedId,
  onSelect,
  onRefresh,
  onDelete,
}: StorageSidebarProps) {
  return (
    <div className="flex h-full w-full flex-col border-r bg-background">
      <div className="flex items-center gap-2 px-4 py-4 border-b">
        <Brain className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-lg font-bold tracking-tight">CogniDrive</h1>
          <p className="text-xs text-muted-foreground">Document Intelligence</p>
        </div>
      </div>
      <StorageQuotaBar quota={quota} />
      <FileUploader onUploadComplete={onRefresh} />
      <div className="px-4 py-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          My Documents
        </p>
      </div>
      <FileList
        files={files}
        selectedId={selectedId}
        onSelect={onSelect}
        onDelete={onDelete}
      />
    </div>
  );
}
