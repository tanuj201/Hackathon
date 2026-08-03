"use client";

import { useState, useEffect, useCallback } from "react";
import { StorageSidebar } from "@/components/storage/storage-sidebar";
import { DocumentViewer } from "@/components/storage/document-viewer";
import { ChatPanel } from "@/components/chat/chat-panel";
import { StudioTools } from "@/components/studio/studio-tools";
import { SetupBanner, SetupStatusCompact } from "@/components/layout/setup-banner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, Sparkles } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { AIModel, StoredFile, StorageQuota } from "@/types";
import { DEFAULT_STORAGE_BYTES } from "@/types";
import { PLANS } from "@/lib/plans";

const defaultUsage = {
  plan: "free",
  planLabel: "Launch access",
  isEarlyAccess: true,
  launchEndsLabel: null as string | null,
  chatCount: 0,
  chatLimit: PLANS.pro.chatPerMonth,
  studioCount: 0,
  studioLimit: PLANS.pro.studioPerMonth,
};

export function WorkspaceLayout() {
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [quota, setQuota] = useState<StorageQuota>({ used: 0, total: DEFAULT_STORAGE_BYTES });
  const [usage, setUsage] = useState(defaultUsage);
  const [selectedFile, setSelectedFile] = useState<StoredFile | null>(null);
  const [model, setModel] = useState<AIModel>("openai/gpt-4o");

  const fetchFiles = useCallback(async () => {
    try {
      const res = await fetch("/api/files");
      const data = await res.json();

      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }

      if (data.error && !data.files?.length) {
        toast({
          title: "Could not load files",
          description: data.error,
          variant: "destructive",
        });
      }

      if (data.files) {
        setFiles(data.files);
        setQuota(data.quota ?? { used: 0, total: DEFAULT_STORAGE_BYTES });
        if (data.usage) {
          setUsage(data.usage);
        }
        setSelectedFile((prev) => {
          if (!prev) return prev;
          return data.files.find((f: StoredFile) => f.id === prev.id) ?? null;
        });
      }
    } catch (err) {
      toast({
        title: "Connection error",
        description: err instanceof Error ? err.message : "Failed to reach API",
        variant: "destructive",
      });
    }
  }, []);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const handleDelete = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
    setSelectedFile((prev) => (prev?.id === id ? null : prev));
    fetchFiles();
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <SetupBanner />
      <SetupStatusCompact />

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <aside className="w-72 shrink-0 hidden md:flex flex-col border-r">
          <StorageSidebar
            files={files}
            quota={quota}
            usage={usage}
            selectedId={selectedFile?.id ?? null}
            onSelect={setSelectedFile}
            onRefresh={fetchFiles}
            onDelete={handleDelete}
          />
        </aside>

        <main className="flex-1 min-w-0 border-r hidden lg:block">
          <DocumentViewer file={selectedFile} onDelete={handleDelete} />
        </main>

        <section className="w-full md:w-[480px] lg:w-[520px] xl:w-[560px] shrink-0 flex flex-col min-h-0">
          <Tabs defaultValue="chat" className="flex-1 flex flex-col min-h-0">
            <TabsList className="mx-4 mt-3 grid w-auto grid-cols-2 shrink-0">
              <TabsTrigger value="chat" className="gap-1.5">
                <MessageSquare className="h-3.5 w-3.5" />
                Multi-AI Chat
              </TabsTrigger>
              <TabsTrigger value="studio" className="gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                Studio Tools
              </TabsTrigger>
            </TabsList>

            <TabsContent value="chat" className="flex-1 mt-0 flex flex-col min-h-0 overflow-hidden">
              <ChatPanel
                selectedFile={selectedFile}
                model={model}
                onModelChange={setModel}
              />
            </TabsContent>
            <TabsContent value="studio" className="flex-1 mt-0 flex flex-col min-h-0 overflow-hidden">
              <StudioTools file={selectedFile} model={model} />
            </TabsContent>
          </Tabs>
        </section>
      </div>
    </div>
  );
}
