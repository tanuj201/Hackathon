"use client";

import { StorageQuotaBar } from "./storage-quota";
import { FileUploader } from "./file-uploader";
import { FileList } from "./file-list";
import { UpgradePanel } from "@/components/account/upgrade-panel";
import { SignOutButton } from "@/components/account/sign-out-button";
import type { StoredFile, StorageQuota } from "@/types";
import { Brain } from "lucide-react";

interface UsageInfo {
  plan: string;
  planLabel?: string;
  isEarlyAccess?: boolean;
  launchEndsLabel?: string | null;
  chatCount: number;
  chatLimit: number;
  studioCount: number;
  studioLimit: number;
}

interface StorageSidebarProps {
  files: StoredFile[];
  quota: StorageQuota;
  usage: UsageInfo;
  selectedId: string | null;
  onSelect: (file: StoredFile) => void;
  onRefresh: () => void;
  onDelete: (id: string) => void;
}

export function StorageSidebar({
  files,
  quota,
  usage,
  selectedId,
  onSelect,
  onRefresh,
  onDelete,
}: StorageSidebarProps) {
  return (
    <div className="flex h-full w-full flex-col border-r bg-background">
      <div className="flex items-center justify-between px-4 py-4 border-b">
        <div className="flex items-center gap-2">
          <Brain className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-lg font-bold tracking-tight">CogniDrive</h1>
            <p className="text-xs text-muted-foreground">Document Intelligence</p>
          </div>
        </div>
        <SignOutButton />
      </div>
      <StorageQuotaBar quota={quota} />
      <UpgradePanel
        plan={usage.plan}
        planLabel={usage.planLabel}
        earlyAccess={usage.isEarlyAccess}
        launchEndsLabel={usage.launchEndsLabel}
        chatCount={usage.chatCount}
        chatLimit={usage.chatLimit}
        studioCount={usage.studioCount}
        studioLimit={usage.studioLimit}
      />
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
