"use client";

import { useState, useEffect, useCallback } from "react";
import { StorageSidebar } from "@/components/storage/storage-sidebar";
import { DocumentViewer } from "@/components/storage/document-viewer";
import { ChatPanel } from "@/components/chat/chat-panel";
import { StudioTools } from "@/components/studio/studio-tools";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, Sparkles } from "lucide-react";
import type { AIModel, StoredFile, StorageQuota } from "@/types";
import { MAX_STORAGE_BYTES } from "@/types";

export function WorkspaceLayout() {
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [quota, setQuota] = useState<StorageQuota>({ used: 0, total: MAX_STORAGE_BYTES });
  const [selectedFile, setSelectedFile] = useState<StoredFile | null>(null);
  const [model, setModel] = useState<AIModel>("openai/gpt-4o");

  const fetchFiles = useCallback(async () => {
    try {
      const res = await fetch("/api/files");
      const data = await res.json();
      if (data.files) {
        setFiles(data.files);
        setQuota(data.quota);
        if (selectedFile) {
          const updated = data.files.find((f: StoredFile) => f.id === selectedFile.id);
          setSelectedFile(updated || null);
        }
      }
    } catch {
      // silently fail on initial load
    }
  }, [selectedFile]);

  useEffect(() => {
    fetchFiles();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
    if (selectedFile?.id === id) setSelectedFile(null);
    fetchFiles();
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Left: Storage sidebar */}
      <aside className="w-72 shrink-0 hidden md:flex flex-col">
        <StorageSidebar
          files={files}
          quota={quota}
          selectedId={selectedFile?.id ?? null}
          onSelect={setSelectedFile}
          onRefresh={fetchFiles}
          onDelete={handleDelete}
        />
      </aside>

      {/* Center: Document viewer */}
      <main className="flex-1 min-w-0 border-r hidden lg:block">
        <DocumentViewer file={selectedFile} />
      </main>

      {/* Right: Chat + Studio Tools */}
      <section className="w-full md:w-[480px] lg:w-[520px] xl:w-[560px] shrink-0 flex flex-col">
        <Tabs defaultValue="chat" className="flex-1 flex flex-col">
          <TabsList className="mx-4 mt-3 grid w-auto grid-cols-2">
            <TabsTrigger value="chat" className="gap-1.5">
              <MessageSquare className="h-3.5 w-3.5" />
              Multi-AI Chat
            </TabsTrigger>
            <TabsTrigger value="studio" className="gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              Studio Tools
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="flex-1 mt-0 overflow-hidden">
            <ChatPanel
              selectedFile={selectedFile}
              model={model}
              onModelChange={setModel}
            />
          </TabsContent>
          <TabsContent value="studio" className="flex-1 mt-0 overflow-hidden">
            <StudioTools file={selectedFile} model={model} />
          </TabsContent>
        </Tabs>
      </section>
    </div>
  );
}
