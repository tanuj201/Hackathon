"use client";

import { Progress } from "@/components/ui/progress";
import { formatBytes } from "@/lib/utils";
import type { StorageQuota } from "@/types";
import { HardDrive } from "lucide-react";

interface StorageQuotaBarProps {
  quota: StorageQuota;
}

export function StorageQuotaBar({ quota }: StorageQuotaBarProps) {
  const percent = Math.min((quota.used / quota.total) * 100, 100);

  return (
    <div className="space-y-2 px-4 py-3 border-b">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <HardDrive className="h-4 w-4" />
        <span>Storage</span>
      </div>
      <Progress value={percent} className="h-2" />
      <p className="text-xs text-muted-foreground">
        {formatBytes(quota.used)} of {formatBytes(quota.total)} used
      </p>
    </div>
  );
}
