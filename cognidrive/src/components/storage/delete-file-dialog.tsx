"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { formatBytes } from "@/lib/utils";
import type { StoredFile } from "@/types";

interface DeleteFileDialogProps {
  file: StoredFile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (fileId: string) => Promise<void>;
}

export function DeleteFileDialog({
  file,
  open,
  onOpenChange,
  onConfirm,
}: DeleteFileDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!file) return;
    setIsDeleting(true);
    try {
      await onConfirm(file.id);
      onOpenChange(false);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete file?</DialogTitle>
          <DialogDescription>
            {file
              ? `"${file.name}" (${formatBytes(file.size)}) will be permanently removed from your cloud storage, including all indexed chunks and embeddings. This cannot be undone.`
              : "This file will be permanently removed."}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isDeleting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isDeleting || !file}>
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Deleting...
              </>
            ) : (
              "Delete file"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
