"use client";

import { Progress } from "@/components/ui/progress";
import { formatBytes } from "@/lib/utils";
import type { StorageQuota } from "@/types";
import { HardDrive } from "lucide-react";
import { cn } from "@/lib/utils";

interface StorageQuotaBarProps {
  quota: StorageQuota;
}

export function StorageQuotaBar({ quota }: StorageQuotaBarProps) {
  const percent = quota.total > 0 ? Math.min((quota.used / quota.total) * 100, 100) : 0;
  const remaining = Math.max(quota.total - quota.used, 0);
  const isWarning = percent >= 80;
  const isCritical = percent >= 95;

  return (
    <div className="space-y-2 px-4 py-3 border-b">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <HardDrive className="h-4 w-4" />
          <span>Cloud Storage</span>
        </div>
        <span
          className={cn(
            "text-xs font-medium",
            isCritical ? "text-destructive" : isWarning ? "text-yellow-600" : "text-muted-foreground"
          )}
        >
          {percent.toFixed(0)}% used
        </span>
      </div>
      <Progress
        value={percent}
        className={cn(
          "h-2",
          isCritical && "[&>div]:bg-destructive",
          isWarning && !isCritical && "[&>div]:bg-yellow-500"
        )}
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{formatBytes(quota.used)} used</span>
        <span>{formatBytes(remaining)} free of {formatBytes(quota.total)}</span>
      </div>
    </div>
  );
}
